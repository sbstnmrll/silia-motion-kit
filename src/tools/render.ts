import { z } from "zod";
import { join } from "node:path";
import { argsVar } from "../bridge/index.js";
import { compRef } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { cancelJob, getJob, loadJobs, startJob, verifyMedia } from "../render/aerender.js";

const expectSchema = z
  .object({
    duration: z.number().positive().optional(),
    durationTolerance: z.number().min(0).optional(),
    fps: z.number().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    alpha: z.boolean().optional(),
    headBlackSec: z.number().min(0).optional(),
    headBlackTolerance: z.number().min(0).optional(),
    minMeanLuma: z.number().min(0).max(255).optional(),
    maxMeanLuma: z.number().min(0).max(255).optional(),
  })
  .optional()
  .describe("Expectations checked by verify; each mismatch becomes a violation.");

export function getRenderTools(ctx: ToolContext): ToolRecord {
  return {
    ae_render_queue: {
      description:
        "In-app render queue. list items; add a comp (rs_template, om_template, output path, optional frame range or work_area); update an item; remove; clear; templates (render settings and output module template names on this machine); queue_in_ame (send queue to Media Encoder); render (BLOCKING: freezes AE until done, only for tiny comps; prefer ae_render). Output paths with [#####] produce image sequences.",
      parameters: {
        action: z.enum(["list", "add", "update", "remove", "clear", "templates", "queue_in_ame", "render"]),
        comp: compRef,
        index: z.number().int().min(1).optional().describe("update/remove: render queue item index."),
        rs_template: z.string().optional().describe('e.g. "Best Settings"'),
        om_template: z.string().optional().describe('e.g. "H.264 - Match Render Settings - 40 Mbps", "Lossless with Alpha", "TIFF Sequence with Alpha"'),
        output: z.string().optional().describe("Absolute output path (folder created)."),
        time_span: z.enum(["comp", "work_area", "custom"]).optional(),
        start: z.number().min(0).optional(),
        duration: z.number().positive().optional(),
        skip_frames: z.number().int().min(0).optional(),
        remove_after_render: z.boolean().optional(),
        timeout_ms: z.number().int().min(5000).max(3_600_000).optional().describe("render: wait this long (default 300000)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var rq = app.project.renderQueue;
          function omInfo(om) { var o = { name: om.name, file: null, templates: null }; try { o.file = om.file ? om.file.fsName : null; } catch (e0) {} try { o.includeSourceXMP = om.includeSourceXMP; } catch (e1) {} return o; }
          function itemInfo(it, i) { var st = it.status; var name = st === RQItemStatus.QUEUED ? "queued" : st === RQItemStatus.UNQUEUED ? "unqueued" : st === RQItemStatus.RENDERING ? "rendering" : st === RQItemStatus.DONE ? "done" : st === RQItemStatus.ERR_STOPPED ? "error" : st === RQItemStatus.USER_STOPPED ? "stopped" : st === RQItemStatus.NEEDS_OUTPUT ? "needs_output" : st === RQItemStatus.WILL_CONTINUE ? "will_continue" : String(st); var o = { index: i, comp: it.comp ? it.comp.name : null, status: name, render: it.render, timeSpanStart: __round(it.timeSpanStart), timeSpanDuration: __round(it.timeSpanDuration), skipFrames: it.skipFrames, outputModules: [] }; try { o.logType = it.logType; } catch (e2) {} try { o.elapsedSeconds = it.elapsedSeconds; } catch (e3) {} for (var m = 1; m <= it.numOutputModules; m++) o.outputModules.push(omInfo(it.outputModule(m))); return o; }
          function list() { var out = []; for (var i = 1; i <= rq.numItems; i++) out.push(itemInfo(rq.item(i), i)); return out; }
          function applyTo(it) {
            if (a.rs_template) it.applyTemplate(a.rs_template);
            var om = it.outputModule(1);
            if (a.om_template) om.applyTemplate(a.om_template);
            if (a.output) { var f = __file(a.output); __ensureFolder(f.parent.fsName); om.file = f; }
            if (a.time_span === "work_area") { it.timeSpanStart = it.comp.workAreaStart; it.timeSpanDuration = it.comp.workAreaDuration; }
            else if (a.time_span === "comp") { it.timeSpanStart = 0; it.timeSpanDuration = it.comp.duration; }
            if (a.start !== undefined) it.timeSpanStart = a.start;
            if (a.duration !== undefined) it.timeSpanDuration = a.duration;
            if (a.skip_frames !== undefined) it.skipFrames = a.skip_frames;
          }
          if (a.action === "list") return __result({ numItems: rq.numItems, rendering: rq.rendering, canQueueInAME: rq.canQueueInAME, items: list() });
          if (a.action === "templates") {
            var c0 = null; try { c0 = __comp(a.comp); } catch (e4) { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) { c0 = app.project.item(i); break; } }
            var tmp = null; if (!c0) { tmp = app.project.items.addComp("__aemcp_probe", 16, 16, 1, 1, 30); c0 = tmp; }
            var probe = rq.items.add(c0); var res;
            try { res = { renderSettings: probe.templates, outputModules: probe.outputModule(1).templates }; } finally { probe.remove(); if (tmp) tmp.remove(); }
            var visible = []; for (var v = 0; v < res.outputModules.length; v++) if (res.outputModules[v].indexOf("_HIDDEN") !== 0) visible.push(res.outputModules[v]); res.outputModules = visible;
            return __result(res);
          }
          if (a.action === "add") { var c = __comp(a.comp); return __result(__mutate("Add to render queue", function () { var it = rq.items.add(c); applyTo(it); return { added: itemInfo(it, rq.numItems), items: list() }; })); }
          if (a.action === "update") { if (!a.index || a.index > rq.numItems) return __error("index out of range", "BAD_ARG"); return __result(__mutate("Update render item", function () { var it = rq.item(a.index); applyTo(it); if (a.remove_after_render !== undefined) it.render = true; return { updated: itemInfo(it, a.index), items: list() }; })); }
          if (a.action === "remove") { if (!a.index || a.index > rq.numItems) return __error("index out of range", "BAD_ARG"); __mutate("Remove render item", function () { rq.item(a.index).remove(); }); return __result({ items: list() }); }
          if (a.action === "clear") { __mutate("Clear render queue", function () { for (var q = rq.numItems; q >= 1; q--) rq.item(q).remove(); }); return __result({ items: [] }); }
          if (a.action === "queue_in_ame") { if (!rq.canQueueInAME) return __error("Media Encoder is not available", "NO_AME"); rq.queueInAME(true); return __result({ queuedInAME: true, items: list() }); }
          if (a.action === "render") {
            var queued = 0; for (var r = 1; r <= rq.numItems; r++) if (rq.item(r).status === RQItemStatus.QUEUED) queued++;
            if (!queued) return __error("No queued items in the render queue", "NOTHING_QUEUED");
            var t0 = new Date().getTime();
            rq.render();
            var done = list(); var outputs = [];
            for (var d = 0; d < done.length; d++) for (var mo = 0; mo < done[d].outputModules.length; mo++) if (done[d].outputModules[mo].file) { var of = __file(done[d].outputModules[mo].file); outputs.push({ path: of.fsName, exists: of.exists, bytes: of.exists ? of.length : 0 }); }
            return __result({ rendered: queued, elapsedMs: new Date().getTime() - t0, items: done, outputs: outputs });
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        const timeout = a.action === "render" ? ((a.timeout_ms as number | undefined) ?? 300_000) : 30_000;
        return runScript(ctx, script, { timeoutMs: timeout, longRunning: a.action === "render" });
      }),
    },

    ae_render: {
      description:
        "Background renders with aerender.exe (never blocks After Effects). start: saves a copy of the current project (save_copy_first, default true) and renders comp with rs_template/om_template to output; returns a job id. status: progress percent, last log lines, output existence; when done, includes a verify report if verify=true (default). cancel; list all jobs. verify: run ffprobe + blackdetect + luma sampling on any media path against expectations (duration, fps, size, alpha, headBlackSec, luma bounds). Requires a saved project (or project path).",
      parameters: {
        action: z.enum(["start", "status", "cancel", "list", "verify"]),
        comp: z.string().optional().describe("start: comp name."),
        project: z.string().optional().describe("start: .aep path (default: the open project, saved as a copy first)."),
        save_copy_first: z.boolean().optional().describe("start: default true; writes <dataDir>/jobs/<id>.aep and renders that."),
        output: z.string().optional().describe("start: absolute output path. Use [#####] for sequences."),
        rs_template: z.string().optional().describe('default "Best Settings"'),
        om_template: z.string().optional().describe('default "H.264 - Match Render Settings - 40 Mbps"'),
        start_frame: z.number().int().min(0).optional(),
        end_frame: z.number().int().min(0).optional(),
        continue_on_missing_footage: z.boolean().optional(),
        ae_year: z.number().int().optional().describe("Force aerender from this AE year (default newest)."),
        job_id: z.string().optional(),
        path: z.string().optional().describe("verify: media file path."),
        expect: expectSchema,
        wait_ms: z.number().int().min(0).max(45_000).optional().describe("start/status: wait up to this long (max 45 s, below MCP client timeouts) before returning; poll status for longer renders."),
        verify: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const dataDir = ctx.config.dataDir;
        if (a.action === "list") return ok({ jobs: loadJobs(dataDir).map((j) => ({ id: j.id, state: j.state, comp: j.spec.comp, output: j.spec.output, percent: j.progress.percent, startedAt: j.startedAt, endedAt: j.endedAt })) });
        if (a.action === "verify") {
          if (!a.path) return err("path required", "BAD_ARG");
          return ok(await verifyMedia(a.path as string, (a.expect as Record<string, unknown>) ?? {}));
        }
        if (a.action === "cancel") {
          if (!a.job_id) return err("job_id required", "BAD_ARG");
          const j = cancelJob(dataDir, a.job_id as string);
          return j ? ok({ id: j.id, state: j.state }) : err("job not found", "NOT_FOUND");
        }
        const waitFor = async (id: string, waitMs: number) => {
          const deadline = Date.now() + waitMs;
          let job = getJob(dataDir, id);
          while (job && job.state === "running" && Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 500));
            job = getJob(dataDir, id);
          }
          return job;
        };
        const statusOf = async (id: string) => {
          const job = getJob(dataDir, id);
          if (!job) return err("job not found", "NOT_FOUND");
          const out: Record<string, unknown> = { id: job.id, state: job.state, comp: job.spec.comp, output: job.spec.output, progress: job.progress, outputExists: job.outputExists, outputBytes: job.outputBytes, startedAt: job.startedAt, endedAt: job.endedAt, exitCode: job.exitCode, errors: job.errors.slice(-8), lastLines: job.lastLines.slice(-6), meta: job.spec.meta };
          if (job.state === "done" && a.verify !== false) {
            if (!job.verify) job.verify = await verifyMedia(job.spec.output, (a.expect as Record<string, unknown>) ?? {});
            out.verify = job.verify;
          }
          return ok(out);
        };
        if (a.action === "status") {
          if (!a.job_id) return err("job_id required", "BAD_ARG");
          if (a.wait_ms) await waitFor(a.job_id as string, a.wait_ms as number);
          return statusOf(a.job_id as string);
        }
        // start
        if (!a.comp || !a.output) return err("comp and output are required", "BAD_ARG");
        let project = a.project as string | undefined;
        let compMeta: Record<string, unknown> | null = null;
        if (!project) {
          const probe = await runScript(ctx, `${argsVar("a", { comp: a.comp })} var c = __comp(a.comp); return __result({ file: app.project.file ? app.project.file.fsName : null, dirty: app.project.dirty, comp: __compInfo(c), missing: __missingFootage().length });`);
          if (!probe.success) return probe;
          const d = probe.data as Record<string, unknown>;
          compMeta = d.comp as Record<string, unknown>;
          if ((d.missing as number) > 0) ctx.audit({ operationId: "render", action: "ae_render", outcome: "started", timestamp: new Date().toISOString(), details: { missingFootage: d.missing } });
          if (a.save_copy_first !== false || !d.file) {
            const copyPath = join(dataDir, "jobs", `render_${Date.now().toString(36)}.aep`);
            const saved = await runScript(ctx, `${argsVar("a", { path: copyPath })} var p = app.project; var orig = p.file; var f = __file(a.path); __ensureFolder(f.parent.fsName); p.save(f); if (orig) app.open(orig); return __result({ copy: f.fsName, original: orig ? orig.fsName : null });`, { timeoutMs: 120_000, longRunning: true });
            if (!saved.success) return saved;
            project = (saved.data as { copy: string }).copy;
          } else project = d.file as string;
        }
        let job;
        try {
          job = startJob(dataDir, {
            project: project!,
            comp: a.comp as string,
            output: a.output as string,
            rsTemplate: (a.rs_template as string) ?? "Best Settings",
            omTemplate: (a.om_template as string) ?? "H.264 - Match Render Settings - 40 Mbps",
            startFrame: a.start_frame as number | undefined,
            endFrame: a.end_frame as number | undefined,
            continueOnMissingFootage: a.continue_on_missing_footage as boolean | undefined,
            aeYear: a.ae_year as number | undefined,
            meta: compMeta ? { compWidth: compMeta.width, compHeight: compMeta.height, compFps: compMeta.frameRate, compDuration: compMeta.duration } : undefined,
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e), "SPAWN_FAILED");
        }
        if (a.wait_ms) await waitFor(job.id, a.wait_ms as number);
        const st = await statusOf(job.id);
        if (st.success) (st.data as Record<string, unknown>).project = project;
        return st;
      }),
    },
  };
}
