import { z } from "zod";
import { buildScript } from "../bridge/index.js";
import { emitAudit, createOperationId } from "../security/index.js";
import { err, safe, type ToolContext, type ToolRecord } from "./types.js";

export const EXTENDSCRIPT_GUIDE = `Write ES3 ExtendScript (var, function expressions; no let/const, arrows, template literals, destructuring, trailing commas).
The code runs inside an IIFE with try/catch and MUST end with  return __result({...})  or  return __error("message").
JSON.parse/JSON.stringify are available (json2). Wrap mutations in __mutate("Label", function () { ... }) for a single undo step.

Helpers (already loaded):
  __comp(ref)            "active" | id | "name" | {id}|{name}  -> CompItem
  __layer(comp, ref)     1-based index | "name" | {id} | {index} -> Layer
  __prop(root, path)     matchName path, e.g. "ADBE Transform Group/ADBE Position", "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001", aliases: position, scale, rotation, opacity, anchor, effects, masks, text, contents
  __propInfo(p) __layerInfo(l) __compInfo(c) __itemInfo(it) __projectInfo() __missingFootage()
  __setKeys(prop, [{time, value, ease?, interpolation?}])   __applyEase(prop, keyIndex, "power3_out" | {inInfluence,outInfluence,inSpeed,outSpeed} | {x1,y1,x2,y2})
  __coerce(prop, value)  __color("#DEFF38") -> [r,g,b]  __hex([r,g,b])  __effectMatchName("Gaussian Blur")
  __saveFrame(comp, time, path, {background})  __warn(msg)  __need(minVersion, feature)  __ver()
Always address properties by matchName (display names are locale-dependent).`;

export function getScriptingTools(ctx: ToolContext): ToolRecord {
  return {
    ae_execute_extendscript: {
      description:
        "Run arbitrary ExtendScript inside After Effects (escape hatch when no dedicated tool fits). Gated: requires confirm=true AND the server started with AE_MCP_ALLOW_RAW=1 (or the unsafe-script capability). The code is wrapped in try/catch and must return __result(...) or __error(...).\n\n" +
        EXTENDSCRIPT_GUIDE,
      parameters: {
        code: z.string().min(1).max(200_000).describe("ES3 ExtendScript body. Must end with return __result({...})."),
        confirm: z.boolean().describe("Must be true. Acknowledges that this runs unreviewed code inside After Effects."),
        undo_group: z.string().optional().describe("Wrap the whole body in one undo group with this label."),
        timeout_ms: z.number().int().min(1000).max(600_000).optional().describe("Default 30000. Raise for long operations."),
      },
      handler: safe(async (args: { code: string; confirm: boolean; undo_group?: string; timeout_ms?: number }) => {
        if (!args.confirm) return err("Set confirm=true to run raw ExtendScript.", "CONFIRM_REQUIRED");
        if (!ctx.config.allowRawScript && !ctx.capabilities.capabilities.has("unsafe-script")) {
          return err(
            "Raw ExtendScript is disabled. Start the server with AE_MCP_ALLOW_RAW=1 (or AE_MCP_CAPABILITIES including unsafe-script) to enable ae_execute_extendscript.",
            "RAW_DISABLED",
          );
        }
        const opId = createOperationId();
        emitAudit(ctx.audit, { operationId: opId, action: "ae_execute_extendscript", outcome: "started", details: { bytes: args.code.length } });
        const body = args.undo_group
          ? `return __mutate(${JSON.stringify(args.undo_group)}, function () {\n${args.code}\n});`
          : args.code;
        const started = Date.now();
        const result = await ctx.transport.send(buildScript(body), { unsafe: true, timeoutMs: args.timeout_ms, longRunning: true });
        emitAudit(ctx.audit, { operationId: opId, action: "ae_execute_extendscript", outcome: result.success ? "succeeded" : "failed", details: { durationMs: Date.now() - started } });
        if (result.success) {
          return { success: true, data: { result: result.data, durationMs: Date.now() - started, suggestSave: true } };
        }
        return result;
      }),
    },
  };
}
