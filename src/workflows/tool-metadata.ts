/** Conservative MCP hints (from premiere-pro-mcp, MIT). They describe behaviour, never authorization. */
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

const READ_ONLY_TOOLS = new Set(["ae_status", "ae_layer_query", "ae_property_get", "ae_effects_catalog", "silia_tokens"]);
const DESTRUCTIVE_TOOLS = new Set(["ae_execute_extendscript", "ae_undo", "ae_checkpoint", "ae_batch"]);
const OPEN_WORLD_TOOLS = new Set(["ae_execute_extendscript", "ae_tool_library", "ae_render", "ae_versions", "ae_handoff"]);

export function annotationsForTool(name: string): ToolAnnotations {
  const readOnly = READ_ONLY_TOOLS.has(name);
  return {
    title: name
      .split("_")
      .map((part) => (part === "ae" ? "AE" : part.charAt(0).toUpperCase() + part.slice(1)))
      .join(" "),
    readOnlyHint: readOnly,
    destructiveHint: !readOnly && DESTRUCTIVE_TOOLS.has(name),
    idempotentHint: readOnly,
    openWorldHint: OPEN_WORLD_TOOLS.has(name),
  };
}

export function structuredToolResult(tool: string, success: boolean, data?: unknown, error?: string) {
  return {
    ok: success,
    tool,
    ...(success ? { data: data ?? null } : { error: error ?? "Unknown error" }),
  };
}
