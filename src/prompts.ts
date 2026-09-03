import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface PromptDef {
  name: string;
  title: string;
  description: string;
  args: Record<string, z.ZodTypeAny>;
  render: (args: Record<string, string | undefined>) => string;
}

const PROMPTS: PromptDef[] = [
  {
    name: "ae-safe-edit",
    title: "Safe edit loop",
    description: "Checkpoint, edit, read back, look at a frame, then accept or revert.",
    args: { goal: z.string().describe("What to change in the open project") },
    render: ({ goal }) =>
      `Goal: ${goal}\n\n1. ae_status (deep=false). Stop if not connected.\n2. ae_checkpoint action=create label="before: ${goal}".\n3. Make the edit with the smallest set of tools; prefer ae_batch for several steps so it is one undo group.\n4. Verify every mutation from its read-back, then ae_frame action=capture at a representative time (and contact_sheet if motion is involved).\n5. If wrong: ae_checkpoint action=revert. If right: ae_project action=save and summarise what changed.`,
  },
  {
    name: "motion-critique",
    title: "Motion critique (rubric + vision, two passes)",
    description: "Run ae_frame critique, fix only the failed numeric items, re-run once, then judge the unverifiable items from the images.",
    args: { comp: z.string().optional().describe("Comp name (default active)"), register: z.string().optional().describe("product_video (default) | functional_ui") },
    render: ({ comp, register }) =>
      `PASS 1. Run ae_frame action=critique comp=${comp ?? "active"} register=${register ?? "product_video"}. It returns two images (contact sheet with frame numbers, onion-skin spacing chart) and rubric {passed, failed, unverifiable}.
- For EACH item in rubric.failed apply exactly the numeric change in its "fix" string, using ae_ease (influences / presets), ae_keyframes (set/offset times, values) or ae_layer_update action=set_timing. Do not touch passed items and do not restyle anything the rubric did not flag.
- Ignore rubric.unverifiable during this pass.
PASS 2. Re-run ae_frame action=critique with the same arguments once. Report which failed items cleared.
Then judge ONLY rubric.unverifiable from the two images: one focal motion per beat (onion trails should show a single dominant trail per beat and spacing[] should shrink monotonically for ease-out), text inside title-safe (10% inset), smallest glyph readable, text holds after coming to rest, contrast in the darkest cell, no unintended overlap, nothing clipped mid-move, a nameable intent per element (transition, demonstration, guidance, feedback, visualization, highlight, aesthetic). Silia lime is #DEFF38 and text on it must be black.
STOP after two passes. Report remaining failures with their fix strings and the vision verdicts with timecodes / frame numbers; do not start a third edit cycle without being asked.`,
  },
  {
    name: "build-lower-third",
    title: "Build a Silia lower third",
    description: "Collect name/role/variant/timing and build an on-brand lower third, then check a frame.",
    args: { name: z.string(), role: z.string().optional(), variant: z.string().optional().describe("lime | violeta | rosa | dark"), in_time: z.string().optional(), duration: z.string().optional() },
    render: ({ name, role, variant, in_time, duration }) =>
      `Use silia_lower_third action=create name="${name}" role="${role ?? ""}" variant=${variant ?? "lime"} in=${in_time ?? "1"} duration=${duration ?? "4"} on the active comp. Then ae_frame capture at in+0.4 s and at the exit to confirm entry/exit motion. Fonts must read back as ESKlarheitGrotesk; if not, report the substitution.`,
  },
  {
    name: "captions-from-transcript",
    title: "Captions from a transcript",
    description: "Locate the transcript (Whisper JSONL in ms or TURNS_TIMED in seconds), build word-synced captions, verify three frames.",
    args: { transcript_path: z.string(), comp: z.string().optional() },
    render: ({ transcript_path, comp }) =>
      `1. silia_captions action=preview source.path="${transcript_path}" to confirm the detected format, speakers and word count.\n2. silia_captions action=build comp=${comp ?? "active"} mode=accumulate_turn (only spoken words on screen).\n3. Inspect the returned contact sheet: the visible text at each sampled time must equal the words spoken so far. Report overlaps[] if any.`,
  },
  {
    name: "regen-outro",
    title: "Regenerate the Silia outro",
    description: "Plan, disable missing-footage layers, render both orientations with aerender, verify head black 0.43 s.",
    args: { aep: z.string().describe("Path to the outro .aep"), orientation: z.string().optional() },
    render: ({ aep, orientation }) =>
      `1. silia_outro action=plan aep="${aep}" orientation=${orientation ?? "both"}. Review the layers that will be disabled (missing footage renders opaque white).\n2. silia_outro action=render with the same args. Wait for jobs via ae_render action=status.\n3. Confirm each verify block: headBlack ~0.43 s, duration, mean luma. Report output paths.`,
  },
  {
    name: "export-mogrt-to-premiere",
    title: "Export a MOGRT and hand it to Premiere",
    description: "Validate Essential Graphics controllers, export the .mogrt, and produce the exact premiere-pro MCP call.",
    args: { comp: z.string(), dest: z.string() },
    render: ({ comp, dest }) =>
      `1. ae_mogrt action=validate comp="${comp}". Fix any unsupported controller or missing font.\n2. ae_mogrt action=export comp="${comp}" path="${dest}".\n3. ae_handoff action=mogrt artifact="${dest}". Call the returned premiereCall through the premiere-pro MCP, then verify with get_full_sequence_info.`,
  },
  {
    name: "push-25d",
    title: "2.5D push on a still",
    description: "Apply a subtle 4.5 to 6 percent push with subpixel motion and check start/mid/end frames.",
    args: { layer: z.string(), amount_pct: z.string().optional(), direction: z.string().optional() },
    render: ({ layer, amount_pct, direction }) =>
      `silia_push_25d layer="${layer}" amountPct=${amount_pct ?? "5"} direction=${direction ?? "in"} ease=power2_out. Then ae_frame contact_sheet at 0 / 50 / 100 percent of the layer duration to confirm the push is smooth and nothing crops.`,
  },
  {
    name: "version-matrix",
    title: "Data-driven versions",
    description: "Author an ae_versions spec from a table of variants, plan, run, and summarise verifications.",
    args: { template_aep: z.string(), comp: z.string(), variants_json: z.string().describe("JSON array of {id, overrides}") },
    render: ({ template_aep, comp, variants_json }) =>
      `Build an ae_versions spec: template={aep:"${template_aep}", comp:"${comp}"}, variants=${variants_json}. Run action=plan first and resolve every warning (missing layer names, fonts, assets). Then action=run, poll action=status, and summarise each job's verify block (duration, fps, size, violations).`,
  },
];

export function registerPrompts(server: McpServer): void {
  for (const p of PROMPTS) {
    server.registerPrompt(
      p.name,
      { title: p.title, description: p.description, argsSchema: p.args as never },
      ((args: Record<string, string | undefined>) => ({
        messages: [{ role: "user" as const, content: { type: "text" as const, text: p.render(args ?? {}) } }],
      })) as never,
    );
  }
}
