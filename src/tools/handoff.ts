import { z } from "zod";
import { existsSync, statSync } from "node:fs";
import { argsVar } from "../bridge/index.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { startJob } from "../render/aerender.js";
import { join } from "node:path";
import { copyFileSync } from "node:fs";

/**
 * Produces a Premiere-ready artifact and the exact call for the `premiere-pro` MCP
 * (leancoderkavy/premiere-pro-mcp) so the orchestrating agent can hand it over and
 * verify with get_full_sequence_info. This server never talks to Premiere itself.
 */
export function getHandoffTools(ctx: ToolContext): ToolRecord {
  return {
    ae_handoff: {
      description:
        "Prepare a Premiere Pro handoff. mogrt: given an exported .mogrt (or comp to export first) return the premiere-pro MCP call import_mogrt {mogrt_path, time_seconds, video_track_index}. dynamic_link: return the call import_ae_comps {aep_path, comp_names} to Dynamic Link comps from the saved project (saves first). alpha_render: start an aerender job with an alpha-capable output module (default 'Lossless with Alpha', .avi; or 'TIFF Sequence with Alpha') and return the import_media call for the result. Every answer includes verify_with: get_full_sequence_info, because the Premiere connector has reported success on writes it did not perform.",
      parameters: {
        action: z.enum(["mogrt", "dynamic_link", "alpha_render"]),
        comp: z.string().optional().describe("Comp name (export/render/link source)."),
        comps: z.array(z.string()).optional().describe("dynamic_link: several comps."),
        mogrt_path: z.string().optional().describe("mogrt: existing .mogrt (else exported from comp to this path)."),
        output: z.string().optional().describe("alpha_render: output path (.avi for Lossless with Alpha, folder/name_[#####].tif for TIFF)."),
        om_template: z.string().optional(),
        time_seconds: z.number().min(0).optional().describe("Placement time in the Premiere sequence."),
        video_track_index: z.number().int().min(0).optional(),
        sequence_name: z.string().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const placement = { time_seconds: (a.time_seconds as number) ?? 0, video_track_index: (a.video_track_index as number) ?? 1, ...(a.sequence_name ? { sequence_name: a.sequence_name } : {}) };
        const verifyWith = { tool: "get_full_sequence_info", note: "Confirm the new clip exists at the expected time/track; the Premiere connector can report success without performing the write." };
        if (a.action === "mogrt") {
          const path = a.mogrt_path as string | undefined;
          if (!path) return err("mogrt_path required (export first with ae_mogrt action=export)", "BAD_ARG");
          if (!existsSync(path)) return err(`.mogrt not found: ${path}. Run ae_mogrt action=export comp=... mogrt_path=...`, "NOT_FOUND");
          return ok({ artifact: { path, bytes: statSync(path).size, type: "mogrt" }, premiereCall: { server: "premiere-pro", tool: "import_mogrt", args: { mogrt_path: path, ...placement } }, verifyWith, alternatives: [{ tool: "import_mogrt_from_library", note: "if the .mogrt was installed into the Essential Graphics library" }] });
        }
        if (a.action === "dynamic_link") {
          const names = (a.comps as string[]) ?? (a.comp ? [a.comp as string] : []);
          if (!names.length) return err("comp or comps required", "BAD_ARG");
          const r = await runScript(ctx, `${argsVar("a", { names })} var p = app.project; if (!p.file) return __error("Save the project first (ae_project action=save path=...)", "NO_FILE"); var found = []; for (var i = 0; i < a.names.length; i++) { try { found.push(__comp(a.names[i]).name); } catch (e0) { return __error("Comp not found: " + a.names[i], "COMP_NOT_FOUND"); } } if (p.dirty) p.save(); return __result({ aep: p.file.fsName, comps: found });`, { timeoutMs: 60_000 });
          if (!r.success) return r;
          const d = r.data as { aep: string; comps: string[] };
          return ok({ artifact: { path: d.aep, type: "aep", comps: d.comps }, premiereCall: { server: "premiere-pro", tool: "import_ae_comps", args: { aep_path: d.aep, comp_names: d.comps } }, thenPlace: { tool: "add_to_timeline", note: "import_ae_comps only imports; place the resulting project item with add_to_timeline/overwrite_clip" }, verifyWith });
        }
        if (a.action === "alpha_render") {
          if (!a.comp || !a.output) return err("comp and output required", "BAD_ARG");
          const om = (a.om_template as string) ?? (/\.tif{1,2}$/i.test(a.output as string) || /\[#+\]/.test(a.output as string) ? "TIFF Sequence with Alpha" : "Lossless with Alpha");
          const stamp = Date.now().toString(36);
          const copyPath = join(ctx.config.dataDir, "jobs", `handoff_${stamp}.aep`);
          const saved = await runScript(ctx, `${argsVar("a", { path: copyPath, comp: a.comp })} __comp(a.comp); var p = app.project; var orig = p.file; var f = __file(a.path); __ensureFolder(f.parent.fsName); p.save(f); if (orig) app.open(orig); return __result({ copy: f.fsName });`, { timeoutMs: 120_000, longRunning: true });
          if (!saved.success) return saved;
          const renderCopy = join(ctx.config.dataDir, "jobs", `handoff_${stamp}_aerender.aep`);
          copyFileSync((saved.data as { copy: string }).copy, renderCopy);
          const job = startJob(ctx.config.dataDir, { project: renderCopy, comp: a.comp as string, output: a.output as string, rsTemplate: "Best Settings", omTemplate: om, meta: { handoff: "alpha_render" } });
          return ok({ job: { id: job.id, state: job.state, pollWith: { tool: "ae_render", args: { action: "status", job_id: job.id, expect: { alpha: true } } } }, artifact: { path: a.output, type: om.includes("TIFF") ? "tiff_sequence" : "video_alpha", omTemplate: om }, premiereCall: { server: "premiere-pro", tool: "import_media", args: { file_paths: [a.output] }, thenPlace: { tool: "overwrite_clip", args: { ...placement }, note: "place on a NEW overlay track above the edit; never overwrite the active edit" } }, verifyWith });
        }
        return err("Unknown action", "BAD_ARG");
      }),
    },
  };
}
