/**
 * Authority profile. Adapted from premiere-pro-mcp (MIT). Unknown tools fail
 * closed to "edit"; raw scripting is never part of the default profile.
 */
import { randomUUID } from "node:crypto";

export const CAPABILITIES = ["inspect", "edit", "export", "filesystem", "unsafe-script"] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface CapabilityConfig {
  capabilities: ReadonlySet<Capability>;
  source: "default" | "environment" | "explicit";
}

const KNOWN = new Set<string>(CAPABILITIES);

export function resolveCapabilities(value: string | undefined = process.env.AE_MCP_CAPABILITIES): CapabilityConfig {
  if (value === undefined || value.trim() === "") {
    return { capabilities: new Set<Capability>(["inspect", "edit", "export", "filesystem"]), source: "default" };
  }
  const capabilities = new Set<Capability>();
  for (const raw of value.split(",")) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    if (!KNOWN.has(name)) throw new Error(`Unknown AE MCP capability: ${name}`);
    capabilities.add(name as Capability);
  }
  return { capabilities, source: "environment" };
}

export class CapabilityDeniedError extends Error {
  readonly code = "CAPABILITY_DENIED";
  constructor(
    readonly capability: Capability,
    readonly operationId: string,
  ) {
    super(`Operation ${operationId} requires the '${capability}' capability`);
    this.name = "CapabilityDeniedError";
  }
}

export function requireCapability(config: CapabilityConfig, capability: Capability, operationId: string): void {
  if (!config.capabilities.has(capability)) throw new CapabilityDeniedError(capability, operationId);
}

export const UNSAFE_TOOL_NAMES = new Set(["ae_execute_extendscript"]);

const INSPECT_TOOL_NAMES = new Set([
  "ae_status",
  "ae_layer_query",
  "ae_property_get",
  "ae_effects_catalog",
  "silia_tokens",
  "ae_dialogs",
]);

const FILESYSTEM_TOOL_NAMES = new Set(["ae_checkpoint", "ae_tool_library", "ae_versions", "ae_lottie", "ae_handoff", "silia_board_review"]);

const EXPORT_TOOL_NAMES = new Set(["ae_render", "ae_render_queue", "ae_frame", "ae_mogrt", "silia_outro"]);

/** Action-level authority for consolidated tools. */
const ACTION_CAPABILITIES: Readonly<Record<string, Readonly<Record<string, readonly Capability[]>>>> = {
  ae_project: {
    info: ["inspect"],
    new: ["edit"],
    open: ["edit", "filesystem"],
    save: ["edit", "filesystem"],
    save_copy: ["filesystem"],
    close: ["edit"],
    set_settings: ["edit"],
  },
  ae_items: {
    list: ["inspect"],
    get: ["inspect"],
    find_missing: ["inspect"],
    import: ["edit", "filesystem"],
    import_sequence: ["edit", "filesystem"],
    replace: ["edit", "filesystem"],
    relink_missing: ["edit", "filesystem"],
    interpret: ["edit"],
    create_folder: ["edit"],
    move: ["edit"],
    rename: ["edit"],
    delete: ["edit"],
  },
  ae_comp: { list: ["inspect"], get: ["inspect"] },
  ae_markers: { list: ["inspect"] },
  ae_text: { get: ["inspect"], fonts: ["inspect"], legibility: ["inspect"] },
  ae_text_animator: { list: ["inspect"] },
  ae_shape: { list: ["inspect"] },
  ae_masks: { list: ["inspect"] },
  ae_effect: { list: ["inspect"], get_params: ["inspect"], apply_preset: ["edit", "filesystem"] },
  ae_keyframes: { list: ["inspect"] },
  ae_ease: { list: ["inspect"] },
  ae_expression: { get: ["inspect"], validate: ["inspect"], validate_all: ["inspect"], library_info: ["inspect"] },
  silia_tokens: { get: ["inspect"], resolve_ease: ["inspect"], plan_motion: ["inspect"] },
  ae_render_queue: { list: ["inspect"], templates: ["inspect"] },
  ae_render: { status: ["inspect"], list: ["inspect"], verify: ["filesystem"], start: ["export", "filesystem"], cancel: ["export"] },
  ae_frame: { capture: ["export"], contact_sheet: ["export"], stats: ["export"], compare: ["export"], onion_skin: ["export"], critique: ["export"], keyframe_dump: ["inspect"] },
  ae_mogrt: { controllers: ["inspect"], validate: ["inspect"], export: ["export", "filesystem"] },
  ae_audio: { info: ["inspect"], envelope: ["filesystem"], silences: ["filesystem"] },
  ae_checkpoint: { list: ["inspect"], diff: ["inspect", "filesystem"], create: ["filesystem"], revert: ["edit", "filesystem"], delete: ["filesystem"] },
  ae_tool_library: { list: ["inspect"], get: ["inspect"], save: ["filesystem"], update: ["filesystem"], delete: ["filesystem"], run: ["edit"], promote: ["filesystem"] },
  ae_versions: { plan: ["inspect", "filesystem"], status: ["inspect"], run: ["export", "filesystem"], cancel: ["export"] },
  silia_captions: { preview: ["inspect", "filesystem"] },
  silia_outro: { plan: ["inspect", "filesystem"], render: ["export", "filesystem"] },
  silia_conform: { analyze: ["inspect", "filesystem"] },
  ae_lottie: { detect: ["inspect"], export: ["export", "filesystem"] },
  ae_dialogs: { list: ["inspect"], ok: ["edit"], cancel: ["edit"], close: ["edit"] },
};

export function capabilityForTool(toolName: string): Capability {
  if (UNSAFE_TOOL_NAMES.has(toolName)) return "unsafe-script";
  if (EXPORT_TOOL_NAMES.has(toolName) || /^(render_|save_frame|export_)/.test(toolName)) return "export";
  if (FILESYSTEM_TOOL_NAMES.has(toolName) || /^(import_|relink_|open_project|save_)/.test(toolName)) return "filesystem";
  if (INSPECT_TOOL_NAMES.has(toolName) || /^(get_|list_|inspect_|find_|check_|search_|ae_.*_query$)/.test(toolName)) return "inspect";
  return "edit";
}

export function capabilitiesForToolInvocation(toolName: string, args: unknown): readonly Capability[] {
  const actionMap = ACTION_CAPABILITIES[toolName];
  if (!actionMap) return [capabilityForTool(toolName)];
  const input = args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : undefined;
  const action = input?.action;
  const required = typeof action === "string" ? actionMap[action] : undefined;
  return required ?? [capabilityForTool(toolName)];
}

export const ALWAYS_LISTED_TOOL_NAMES = new Set(["ae_status"]);

export function isToolPermitted(toolName: string, config: CapabilityConfig): boolean {
  if (ALWAYS_LISTED_TOOL_NAMES.has(toolName)) return true;
  const actionMap = ACTION_CAPABILITIES[toolName];
  const base = config.capabilities.has(capabilityForTool(toolName));
  if (actionMap) {
    return base || Object.values(actionMap).some((req) => req.every((c) => config.capabilities.has(c)));
  }
  return base;
}

export function guardToolHandler<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>,
  config: CapabilityConfig = resolveCapabilities(),
  createOperationId: () => string = randomUUID,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs) => {
    const operationId = createOperationId();
    for (const required of capabilitiesForToolInvocation(toolName, args)) {
      requireCapability(config, required, operationId);
    }
    return handler(args);
  };
}
