/** Conservative MCP hints (from premiere-pro-mcp, MIT). They describe behaviour, never authorization. */
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

const READ_ONLY_TOOLS = new Set(["ae_status", "ae_layer_query", "ae_property_get", "ae_effects_catalog", "silia_tokens"]);
const DESTRUCTIVE_TOOLS = new Set(["ae_execute_extendscript", "ae_undo", "ae_checkpoint", "ae_batch"]);
const OPEN_WORLD_TOOLS = new Set(["ae_execute_extendscript", "ae_tool_library", "ae_render", "ae_versions", "ae_handoff"]);

/**
 * Read-only (inspect) actions inside otherwise mutating consolidated tools. MCP
 * annotations are per tool, so these cannot be surfaced as readOnlyHint; they are
 * listed here so docs and clients can tell which actions never touch After Effects
 * (mirrors ACTION_CAPABILITIES in security/capabilities.ts).
 */
export const READ_ONLY_ACTIONS: Readonly<Record<string, readonly string[]>> = {
  ae_ease: ["list"],
  ae_expression: ["get", "validate", "validate_all", "library_info"],
  ae_keyframes: ["list"],
  silia_tokens: ["get", "resolve_ease", "plan_motion"],
  // ae_frame capture/contact_sheet/onion_skin/critique write scratch PNGs inside one undo group, so only the dump is read-only.
  ae_frame: ["keyframe_dump"],
  ae_text: ["get", "fonts", "legibility"],
};

export function isReadOnlyAction(tool: string, action: unknown): boolean {
  return READ_ONLY_TOOLS.has(tool) || (typeof action === "string" && (READ_ONLY_ACTIONS[tool]?.includes(action) ?? false));
}

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
