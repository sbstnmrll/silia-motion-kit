/**
 * MCP server assembly. Registration loop and result shaping adapted from
 * premiere-pro-mcp (MIT). Tool modules live in src/tools/*.ts and receive a
 * ToolContext; consolidated tools use an `action` enum.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AeMcpConfig } from "./config.js";
import { debugLog } from "./config.js";
import { createTransport } from "./bridge/index.js";
import { guardToolHandler, isToolPermitted, resolveCapabilities, stderrAuditSink, type CapabilityConfig } from "./security/index.js";
import { annotationsForTool, structuredToolResult } from "./workflows/tool-metadata.js";
import type { ToolContext, ToolRecord } from "./tools/types.js";
import { getHealthTools, setServerVersion } from "./tools/health.js";
import { getScriptingTools, EXTENDSCRIPT_GUIDE } from "./tools/scripting.js";
import { getCoreTools } from "./tools/core.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";
import { TOOL_MODULES } from "./tools/index.js";

export const SERVER_VERSION = ((): string => {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(resolve(here, "../package.json"), "utf8");
    const v: unknown = JSON.parse(raw).version;
    return typeof v === "string" && v ? v : "unknown";
  } catch {
    return "unknown";
  }
})();

export const AE_INSTRUCTIONS = `You are controlling Adobe After Effects through the Silia AE MCP.

START: call ae_status first. It tells you whether the bridge is live, which AE version, the open project and the active comp.
TARGETS: comps are addressed by name, id, or "active"; layers by 1-based index, name, or {id}. Properties by matchName path
  ("ADBE Transform Group/ADBE Position") or an alias (position, scale, rotation, opacity, anchor, effects, masks, text, contents).
  Use ae_property_get action=tree or search to discover paths instead of guessing. Display names are locale-dependent; matchNames are not.
MUTATIONS: every mutating tool runs in one undo group and returns a read-back snapshot of what changed. Trust the read-back, not the request.
  Use ae_batch to group several operations into one undo step. Use ae_checkpoint before risky multi-step edits.
LOOK: ae_frame capture / contact_sheet returns actual rendered pixels. Check your work visually after building anything.
TIME: seconds everywhere. Keyframe values follow the property's dimensions ([x,y] or [x,y,z]); colors accept "#RRGGBB".
RENDER: prefer ae_render (aerender subprocess, non-blocking, verified with ffprobe). ae_render_queue action=render blocks the UI.
MODAL DIALOGS block the scripting engine: if a call returns ENGINE_BUSY, ask the user to dismiss the dialog in After Effects.
SILIA: silia_tokens returns brand colors, fonts (ES Klarheit Grotesk for video), formats and motion tokens; the silia_* tools build on-brand elements.

${EXTENDSCRIPT_GUIDE}`;

const toolResultOutputSchema = z.object({
  ok: z.boolean(),
  tool: z.string().min(1),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export interface ServerOptions {
  capabilities?: CapabilityConfig;
}

export function collectTools(ctx: ToolContext): ToolRecord {
  const tools: ToolRecord = {};
  for (const mod of TOOL_MODULES) Object.assign(tools, mod(ctx));
  Object.assign(tools, getCoreTools(ctx, { getTools: () => tools }));
  Object.assign(tools, getScriptingTools(ctx));
  Object.assign(tools, getHealthTools(ctx));
  return tools;
}

export function createContext(config: AeMcpConfig, capabilities = resolveCapabilities()): ToolContext {
  return { transport: createTransport(config), config, capabilities, audit: stderrAuditSink };
}

export function createServer(config: AeMcpConfig, options: ServerOptions = {}): McpServer {
  setServerVersion(SERVER_VERSION);
  const resolved = options.capabilities ?? resolveCapabilities();
  const capabilities: CapabilityConfig = config.allowRawScript && !resolved.capabilities.has("unsafe-script")
    ? { capabilities: new Set([...resolved.capabilities, "unsafe-script"]), source: "explicit" }
    : resolved;
  const ctx = createContext(config, capabilities);
  const server = new McpServer({ name: "ae-mcp", version: SERVER_VERSION }, { instructions: AE_INSTRUCTIONS });

  const tools = collectTools(ctx);
  let withheld = 0;
  for (const [name, tool] of Object.entries(tools)) {
    if (!isToolPermitted(name, capabilities)) {
      withheld++;
      continue;
    }
    const guarded = guardToolHandler(name, tool.handler, capabilities);
    server.registerTool(
      name,
      {
        title: annotationsForTool(name).title,
        description: tool.description,
        inputSchema: tool.parameters,
        outputSchema: toolResultOutputSchema.shape,
        annotations: annotationsForTool(name),
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await guarded(args);
          if (result.success) {
            const data = result.data as Record<string, unknown> | undefined;
            // Vision tools return {mimeType, base64, ...meta}: emit an image block plus the metadata.
            if (data && typeof data.base64 === "string" && typeof data.mimeType === "string" && /^image\//.test(data.mimeType)) {
              const { base64, ...meta } = data;
              return {
                structuredContent: structuredToolResult(name, true, meta),
                content: [
                  { type: "image" as const, data: base64 as string, mimeType: data.mimeType as string },
                  { type: "text" as const, text: JSON.stringify(meta, null, 2) },
                ],
              };
            }
            return {
              structuredContent: structuredToolResult(name, true, result.data),
              content: [{ type: "text" as const, text: JSON.stringify(result.data ?? null, null, 2) }],
            };
          }
          const detail = [result.error, result.code ? `(code: ${result.code})` : "", result.line ? `line ${result.line}` : ""].filter(Boolean).join(" ");
          return {
            structuredContent: structuredToolResult(name, false, undefined, detail),
            content: [{ type: "text" as const, text: `Error: ${detail}` }],
            isError: true,
          };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return {
            structuredContent: structuredToolResult(name, false, undefined, message),
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }
  if (withheld > 0) debugLog(`Withheld ${withheld} tool(s) not permitted by capability profile ${[...capabilities.capabilities].join(",")}`);

  registerResources(server, ctx);
  registerPrompts(server);
  debugLog(`Registered ${Object.keys(tools).length - withheld} tools`);
  return server;
}
