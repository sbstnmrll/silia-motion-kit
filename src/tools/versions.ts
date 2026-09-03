import { z } from "zod";
import { existsSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { argsVar, jsLiteral } from "../bridge/index.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { getJob, startJob } from "../render/aerender.js";
import { withAutoDialogs } from "../host/dialogs.js";

const assetSchema = z.object({
  layer: z.string().describe("Layer name in the template comp (or 'comp:Name/Layer' for a nested comp)."),
  type: z.enum(["text", "color", "toggle", "image", "video", "number", "audio"]),
  value: z.unknown().optional().describe("Default value; variants override with the same key. Use {{field}} placeholders to pull from variant fields."),
  property: z.string().optional().describe("For number/color: property path (default: text document / fill / opacity)."),
});

/**
 * Data-driven versioning (nexrender-style): one template comp, N variants, N renders.
 * Each variant: apply overrides via ExtendScript, save a copy, spawn aerender, verify.
 */
export function getVersionTools(ctx: ToolContext): ToolRecord {
  return {
    ae_versions: {
      description:
        "Data-driven versions: render N variants of one template comp. spec: {template:{aep?, comp}, assets:[{layer, type text|color|toggle|image|video|number|audio, value, property?}], variants:[{id, ...fields}], output:{dir, om_template, name_template e.g. 'outro-{{id}}.mp4', rs_template}}. Asset values may contain {{field}} placeholders replaced per variant. plan: validate the spec against the open project (layer names, asset files, fonts) without changing anything. run: for each variant apply overrides, save a copy, start aerender (parallel up to `parallel`), then poll status with job ids. status: aggregate job states for a run id. Requires a saved project (or template.aep).",
      parameters: {
        action: z.enum(["plan", "run", "status", "cancel"]),
        spec: z.object({
          template: z.object({ aep: z.string().optional(), comp: z.string() }),
          assets: z.array(assetSchema).default([]),
          variants: z.array(z.record(z.string(), z.unknown())).min(1),
          output: z.object({ dir: z.string(), om_template: z.string().optional(), rs_template: z.string().optional(), name_template: z.string().optional() }),
        }).optional(),
        run_id: z.string().optional(),
        parallel: z.number().int().min(1).max(4).optional().describe("Concurrent aerender processes (default 2; each renders into a private folder)."),
        force: z.boolean().optional().describe("run: discard unsaved changes when opening template.aep."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const runsDir = join(ctx.config.dataDir, "versions");
        mkdirSync(runsDir, { recursive: true });
        if (a.action === "status" || a.action === "cancel") {
          if (!a.run_id) return err("run_id required", "BAD_ARG");
          const p = join(runsDir, `${a.run_id}.json`);
          if (!existsSync(p)) return err("run not found", "NOT_FOUND");
          const run = JSON.parse(readFileSync(p, "utf-8")) as { id: string; jobs: Array<{ variant: string; jobId: string; output: string }> };
          const jobs = run.jobs.map((j) => {
            const job = getJob(ctx.config.dataDir, j.jobId);
            return { variant: j.variant, jobId: j.jobId, output: j.output, state: job?.state ?? "unknown", percent: job?.progress.percent ?? null, outputBytes: job?.outputBytes ?? 0, errors: job?.errors.slice(-2) ?? [] };
          });
          const summary = jobs.reduce<Record<string, number>>((acc, j) => ((acc[j.state] = (acc[j.state] ?? 0) + 1), acc), {});
          return ok({ runId: run.id, summary, jobs });
        }
        const spec = a.spec as { template: { aep?: string; comp: string }; assets: Array<{ layer: string; type: string; value?: unknown; property?: string }>; variants: Array<Record<string, unknown>>; output: { dir: string; om_template?: string; rs_template?: string; name_template?: string } } | undefined;
        if (!spec) return err("spec required", "BAD_ARG");
        const fill = (v: unknown, variant: Record<string, unknown>): unknown => (typeof v === "string" ? v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => String(variant[k] ?? "")) : v);
        const nameTemplate = spec.output.name_template ?? `${spec.template.comp}-{{id}}.mp4`;
        // Plan / validate in AE
        const planScript = `
          ${argsVar("a", { aep: spec.template.aep ?? null, comp: spec.template.comp, assets: spec.assets, force: a.force === true })}
          var p = app.project;
          if (a.aep) { var cur = p.file ? p.file.fsName : null; if (cur !== __file(a.aep).fsName) { if (p.dirty && !a.force) return __error("Current project is dirty; pass force=true to switch to the template", "DIRTY"); if (p) p.close(CloseOptions.DO_NOT_SAVE_CHANGES); app.open(__file(a.aep)); p = app.project; } }
          if (!p.file) return __error("Project must be saved (or pass template.aep)", "NO_FILE");
          var c = __comp(a.comp);
          var issues = [], resolved = [];
          for (var i = 0; i < a.assets.length; i++) {
            var as = a.assets[i]; var target = c; var lname = as.layer;
            var m = /^comp:([^\\/]+)\\/(.+)$/.exec(as.layer); if (m) { try { target = __comp(m[1]); lname = m[2]; } catch (e0) { issues.push("Nested comp not found: " + m[1]); continue; } }
            var l = null; try { l = __layer(target, lname); } catch (e1) { issues.push("Layer not found: " + as.layer); continue; }
            var rec = { layer: as.layer, kind: __layerKind(l), type: as.type };
            if (as.type === "text" && !(l instanceof TextLayer)) issues.push(as.layer + " is not a text layer");
            if ((as.type === "image" || as.type === "video" || as.type === "audio") && !(__isAV(l) && l.source instanceof FootageItem)) issues.push(as.layer + " has no footage source to replace");
            resolved.push(rec);
          }
          return __result({ project: p.file.fsName, comp: __compInfo(c), resolved: resolved, issues: issues, missingFootage: __missingFootage().length });
        `;
        const { result: plan } = await withAutoDialogs(runScript(ctx, planScript, { timeoutMs: 120_000, longRunning: true }), { allowEmptyText: true });
        if (!plan.success) return plan;
        const pd = plan.data as { project: string; comp: Record<string, unknown>; resolved: unknown[]; issues: string[] };
        const fileIssues: string[] = [];
        for (const v of spec.variants)
          for (const as of spec.assets)
            if (["image", "video", "audio"].includes(as.type)) {
              const src = fill(v[as.layer] ?? as.value, v);
              if (typeof src === "string" && !existsSync(src)) fileIssues.push(`variant ${String(v.id)}: ${as.layer} file missing: ${src}`);
            }
        const planOut = { project: pd.project, comp: pd.comp, assets: pd.resolved, variants: spec.variants.map((v) => ({ id: v.id, output: join(spec.output.dir, String(fill(nameTemplate, v))) })), issues: [...pd.issues, ...fileIssues], ok: pd.issues.length === 0 && fileIssues.length === 0 };
        if (a.action === "plan") return ok(planOut);
        if (!planOut.ok) return err(`Plan has issues: ${planOut.issues.join("; ")}`, "PLAN_INVALID");

        // Run: apply each variant, save a copy, spawn aerender.
        const runId = `run_${Date.now().toString(36)}`;
        const jobs: Array<{ variant: string; jobId: string; output: string; copy: string }> = [];
        mkdirSync(spec.output.dir, { recursive: true });
        for (const v of spec.variants) {
          const overrides = spec.assets.map((as) => ({ layer: as.layer, type: as.type, property: as.property ?? null, value: fill(v[as.layer] ?? v[as.layer.replace(/^comp:[^/]+\//, "")] ?? as.value, v) }));
          const copyPath = join(ctx.config.dataDir, "jobs", `${runId}_${String(v.id).replace(/[^\w-]+/g, "_")}.aep`);
          const applyScript = `
            ${argsVar("a", { comp: spec.template.comp, overrides, copyPath, template: pd.project })}
            var p = app.project;
            // Always start from the template state, then apply this variant.
            if (p.dirty) p.close(CloseOptions.DO_NOT_SAVE_CHANGES); else p.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(__file(a.template)); p = app.project;
            var c = __comp(a.comp); var applied = [];
            __mutate("Variant", function () {
              for (var i = 0; i < a.overrides.length; i++) {
                var o = a.overrides[i]; var target = c; var lname = o.layer; var m = /^comp:([^\\/]+)\\/(.+)$/.exec(o.layer); if (m) { target = __comp(m[1]); lname = m[2]; }
                var l = __layer(target, lname);
                if (o.type === "text") { var dp = l.property("ADBE Text Properties").property("ADBE Text Document"); var d = dp.value; d.text = String(o.value); dp.setValue(d); applied.push({ layer: o.layer, text: String(o.value) }); }
                else if (o.type === "toggle") { l.enabled = !!o.value && o.value !== "false" && o.value !== "0"; applied.push({ layer: o.layer, enabled: l.enabled }); }
                else if (o.type === "number") { var np = __prop(l, o.property || "opacity"); np.setValue(__coerce(np, o.value)); applied.push({ layer: o.layer, property: __propPath(np), value: __value(np.value) }); }
                else if (o.type === "color") { var cp = o.property ? __prop(l, o.property) : (l instanceof TextLayer ? null : __prop(l, "Effects/ADBE Fill/ADBE Fill-0002")); if (cp) { cp.setValue(__coerce(cp, o.value)); applied.push({ layer: o.layer, property: __propPath(cp) }); } else { var tp = l.property("ADBE Text Properties").property("ADBE Text Document"); var td = tp.value; td.fillColor = __color(o.value); tp.setValue(td); applied.push({ layer: o.layer, fillColor: String(o.value) }); } }
                else { var f = __file(String(o.value)); if (!f.exists) __fail("Asset missing: " + f.fsName, "NOT_FOUND"); l.source.replace(f); applied.push({ layer: o.layer, file: f.fsName }); }
              }
            });
            var cf = __file(a.copyPath); __ensureFolder(cf.parent.fsName); p.save(cf); app.open(__file(a.template));
            return __result({ copy: cf.fsName, applied: applied });
          `;
          const { result: r } = await withAutoDialogs(runScript(ctx, applyScript, { timeoutMs: 180_000, longRunning: true }), { allowEmptyText: true });
          if (!r.success) return err(`variant ${String(v.id)}: ${r.error}`, r.code);
          const renderCopy = copyPath.replace(/\.aep$/, "_aerender.aep");
          copyFileSync(copyPath, renderCopy);
          const output = join(spec.output.dir, String(fill(nameTemplate, v)));
          // Concurrent aerenders of the same comp into one folder collide on AE temp files: render
          // into a private folder per job and move the result to the final path when done.
          const privateDir = join(ctx.config.dataDir, "jobs", `${runId}_${String(v.id).replace(/[^\w-]+/g, "_")}_out`);
          mkdirSync(privateDir, { recursive: true });
          const job = startJob(ctx.config.dataDir, { project: renderCopy, comp: spec.template.comp, output: join(privateDir, basename(output)), finalOutput: output, rsTemplate: spec.output.rs_template ?? "Best Settings", omTemplate: spec.output.om_template ?? "H.264 - Match Render Settings - 40 Mbps", meta: { runId, variant: v.id } });
          jobs.push({ variant: String(v.id), jobId: job.id, output, copy: copyPath });
          // Throttle: wait while more than `parallel` jobs are running.
          const parallel = (a.parallel as number) ?? 2;
          while (jobs.filter((j) => getJob(ctx.config.dataDir, j.jobId)?.state === "running").length >= parallel) await new Promise((res) => setTimeout(res, 1500));
        }
        writeFileSync(join(runsDir, `${runId}.json`), JSON.stringify({ id: runId, spec, jobs, createdAt: new Date().toISOString() }, null, 2), "utf-8");
        return ok({ runId, variants: jobs.length, jobs, pollWith: `ae_versions action=status run_id=${runId}`, note: jsLiteral("Each job is also visible in ae_render action=list") });
      }),
    },
  };
}
