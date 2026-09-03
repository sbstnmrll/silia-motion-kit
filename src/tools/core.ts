import { z } from "zod";
import { argsVar, buildScript } from "../bridge/index.js";
import { compRef } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord, type ToolRecord as _T } from "./types.js";

export interface BatchDeps {
  /** Resolver so ae_batch can call sibling tools without a circular import. */
  getTools: () => ToolRecord;
}

export function getCoreTools(ctx: ToolContext, deps: BatchDeps): ToolRecord {
  return {
    ae_undo: {
      description: "Undo or redo the last N undo groups in After Effects (each tool call is one group). Returns the active comp read-back after the operation.",
      parameters: {
        action: z.enum(["undo", "redo"]),
        count: z.number().int().min(1).max(50).optional(),
      },
      handler: safe(async (a: { action: "undo" | "redo"; count?: number }) => {
        const script = `
          ${argsVar("a", a)}
          var n = a.count || 1; var done = 0;
          var id = app.findMenuCommandId(a.action === "undo" ? "Undo" : "Redo");
          // findMenuCommandId is localized; fall back to the stable numeric ids.
          if (!id) id = a.action === "undo" ? 16 : 17;
          for (var i = 0; i < n; i++) { try { app.executeCommand(id); done++; } catch (e0) { break; } }
          var active = (app.project && app.project.activeItem instanceof CompItem) ? __compInfo(app.project.activeItem) : null;
          return __result({ action: a.action, requested: n, executed: done, activeComp: active, dirty: app.project ? app.project.dirty : null });
        `;
        return runScript(ctx, script);
      }),
    },

    ae_batch: {
      description:
        "Run several tool calls as one unit. ops: [{tool, args}] executed in order; on_error stop (default) | continue | rollback (undo everything done so far). Because each op is its own undo group in AE, rollback undoes N groups. Returns per-op results plus the final active comp. Use for multi-step builds so a human can undo them in one gesture per step and you get one round trip of reporting.",
      parameters: {
        ops: z.array(z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()).optional() })).min(1).max(100),
        on_error: z.enum(["stop", "continue", "rollback"]).optional(),
        comp: compRef.describe("Comp used for the final read-back (default active)."),
      },
      handler: safe(async (a: { ops: Array<{ tool: string; args?: Record<string, unknown> }>; on_error?: "stop" | "continue" | "rollback"; comp?: unknown }) => {
        const tools = deps.getTools();
        const results: Array<{ tool: string; ok: boolean; result?: unknown; error?: string; code?: string }> = [];
        let mutatingDone = 0;
        for (const op of a.ops) {
          if (op.tool === "ae_batch") {
            results.push({ tool: op.tool, ok: false, error: "Nested ae_batch is not allowed", code: "BAD_ARG" });
            if (a.on_error !== "continue") break;
            continue;
          }
          const def = tools[op.tool];
          if (!def) {
            results.push({ tool: op.tool, ok: false, error: `Unknown tool ${op.tool}`, code: "BAD_ARG" });
            if (a.on_error !== "continue") break;
            continue;
          }
          const r = await def.handler(op.args ?? {});
          if (r.success) {
            results.push({ tool: op.tool, ok: true, result: r.data });
            if (!/^(ae_status|ae_layer_query|ae_property_get|ae_effects_catalog|silia_tokens)$/.test(op.tool) && !/"action":"(list|get|info|value|tree|search|fonts|templates|effects|resolve|presets)"/.test(JSON.stringify(op.args ?? {}))) mutatingDone++;
          } else {
            results.push({ tool: op.tool, ok: false, error: r.error, code: r.code });
            if (a.on_error === "continue") continue;
            if (a.on_error === "rollback" && mutatingDone > 0) {
              const undo = await ctx.transport.send(buildScript(`var id = app.findMenuCommandId("Undo") || 16; var done = 0; for (var i = 0; i < ${mutatingDone}; i++) { try { app.executeCommand(id); done++; } catch (e0) { break; } } return __result({ undone: done });`));
              results.push({ tool: "rollback", ok: undo.success, result: undo.success ? undo.data : undefined, error: undo.success ? undefined : undo.error });
            }
            break;
          }
        }
        const final = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? null })} var c = null; try { c = a.comp ? __comp(a.comp) : (app.project.activeItem instanceof CompItem ? app.project.activeItem : null); } catch (e0) {} return __result({ activeComp: c ? __compInfo(c) : null });`);
        const failed = results.filter((r) => !r.ok && r.tool !== "rollback").length;
        return ok({ ops: results.length, failed, results, ...(final.success ? (final.data as object) : {}) });
      }),
    },
  };
}

void err;
