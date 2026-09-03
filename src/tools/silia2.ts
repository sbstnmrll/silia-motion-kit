import { z } from "zod";
import { existsSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";
import { execFile } from "node:child_process";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, easeSpec } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { SILIA_COLORS, SILIA_FONTS, SILIA_PATTERNS, SILIA_TYPE_SCALE, resolveEase } from "../silia/tokens.js";
import { findOverlaps, loadTranscript } from "../silia/transcript.js";
import { startJob, verifyMedia } from "../render/aerender.js";

function easeFor(token: unknown): unknown {
  if (typeof token !== "string") return token ?? { inInfluence: 64.5, outInfluence: 21.5 };
  try {
    const e = resolveEase(token);
    return { inInfluence: e.inInfluence, outInfluence: e.outInfluence, inSpeed: 0, outSpeed: 0 };
  } catch {
    return token;
  }
}

function ffprobeJson(path: string): Promise<Record<string, unknown> | null> {
  return new Promise((res) => execFile("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", path], { windowsHide: true }, (e, out) => res(e ? null : (JSON.parse(String(out)) as Record<string, unknown>))));
}

export function getSilia2Tools(ctx: ToolContext): ToolRecord {
  return {
    silia_captions: {
      description:
        "Word-synced captions from a transcript. preview: parse the file (Whisper word JSON/JSONL in ms or seconds, or TURNS_TIMED in seconds), report format, speakers, word count, duration and turn overlaps without touching AE. build: create caption layers in the comp. mode accumulate_turn (default, one box-text layer per turn whose source text grows word by word with hold keyframes at word onset + latency; only spoken words are ever on screen) | per_turn_hold (full turn text appears at turn start) | per_word_layers (one layer per word, for kinetic treatments). Styles per speaker via speaker_styles {name:{color, size, align, y}}. Returns layers, keyframe counts, first/last word and overlaps.",
      parameters: {
        action: z.enum(["preview", "build", "to_markers"]),
        comp: compRef,
        path: z.string().describe("Transcript file path."),
        mode: z.enum(["accumulate_turn", "per_turn_hold", "per_word_layers"]).optional(),
        latency: z.number().min(0).max(1).optional().describe("Seconds after word onset (default 0.16)."),
        fade: z.number().min(0).max(1).optional().describe("Fade-in at turn start (default 0.2)."),
        opacity: z.number().min(0).max(100).optional().describe("Default 95."),
        box: z.object({ width: z.number().positive().optional(), x: z.number().optional(), y: z.number().optional() }).optional().describe("Caption box in comp px (default: 80% width, bottom safe area)."),
        font: z.string().optional().describe("Default ESKlarheitGrotesk-Md"),
        size: z.number().positive().optional().describe("Default 28 at 1080p (scaled)."),
        color: z.string().optional(),
        speaker_styles: z.record(z.string(), z.object({ color: z.string().optional(), size: z.number().optional(), align: z.enum(["left", "center", "right"]).optional(), y: z.number().optional(), prefix: z.string().optional() })).optional(),
        gap_sec: z.number().min(0).optional().describe("Turn split gap for flat word lists (default 1.2)."),
        time_offset: z.number().optional().describe("Shift all times by this many seconds (e.g. layer start)."),
        max_chars: z.number().int().min(10).optional().describe("Wrap: start a new text layer when a turn exceeds this many characters (default 160)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (!existsSync(a.path as string)) return err(`Transcript not found: ${a.path}`, "NOT_FOUND");
        let t;
        try {
          t = loadTranscript(a.path as string, { gapSec: a.gap_sec as number | undefined });
        } catch (e) {
          return err(`Could not parse transcript: ${e instanceof Error ? e.message : String(e)}`, "PARSE");
        }
        const overlaps = findOverlaps(t);
        if (a.action === "preview") {
          return ok({ file: a.path, format: t.format, speakers: t.speakers, turns: t.turns.length, words: t.wordCount, duration: Math.round(t.duration * 1000) / 1000, overlaps, sample: t.turns.slice(0, 3).map((x) => ({ speaker: x.speaker, start: x.start, end: x.end, text: x.words.map((w) => w.w).join(" ").slice(0, 120) })) });
        }
        const offset = (a.time_offset as number) ?? 0;
        if (a.action === "to_markers") {
          const markers = t.turns.map((x) => ({ time: Math.max(0, x.start + offset), comment: `${x.speaker}: ${x.words.map((w) => w.w).join(" ").slice(0, 60)}`, duration: Math.max(0, x.end - x.start) }));
          const r = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? null, markers })} var c = __comp(a.comp); var mp = c.markerProperty; __mutate("Transcript markers", function () { for (var i = 0; i < a.markers.length; i++) { var v = new MarkerValue(a.markers[i].comment); v.duration = a.markers[i].duration; mp.setValueAtTime(a.markers[i].time, v); } }); return __result({ added: a.markers.length, total: mp.numKeys });`);
          return r;
        }
        const mode = (a.mode as string) ?? "accumulate_turn";
        const latency = (a.latency as number) ?? SILIA_PATTERNS.word_reveal.latency;
        const maxChars = (a.max_chars as number) ?? 160;
        // Split long turns into chunks so a box never overflows.
        const chunks: Array<{ speaker: string; start: number; end: number; words: Array<{ w: string; start: number; end: number }> }> = [];
        for (const turn of t.turns) {
          let cur: (typeof chunks)[number] | null = null;
          let len = 0;
          for (const w of turn.words) {
            if (!cur || len + w.w.length + 1 > maxChars) {
              cur = { speaker: turn.speaker, start: w.start, end: w.end, words: [] };
              chunks.push(cur);
              len = 0;
            }
            cur.words.push(w);
            cur.end = Math.max(cur.end, w.end);
            len += w.w.length + 1;
          }
        }
        const script = `
          ${argsVar("a", { comp: a.comp ?? null, mode, latency, fade: a.fade ?? SILIA_PATTERNS.word_reveal.fade, opacity: a.opacity ?? SILIA_PATTERNS.word_reveal.opacity, box: a.box ?? null, font: a.font ?? SILIA_FONTS.medium, size: a.size ?? SILIA_TYPE_SCALE.caption.size, leading: SILIA_TYPE_SCALE.caption.leading, color: a.color ?? SILIA_COLORS.white, styles: a.speaker_styles ?? {}, offset, chunks, ease: easeFor("power2_out") })}
          var c = __comp(a.comp); var k = c.height / 1080;
          var boxW = (a.box && a.box.width) || Math.round(c.width * 0.8), boxX = (a.box && a.box.x !== undefined) ? a.box.x : c.width / 2, boxY = (a.box && a.box.y !== undefined) ? a.box.y : c.height - Math.round(160 * k);
          var layers = [], totalKeys = 0, firstWord = null, lastWord = null;
          function mkLayer(chunk, text) {
            var st = a.styles[chunk.speaker] || {};
            var l = c.layers.addBoxText([boxW, Math.round(a.leading * k * 2.4)], text);
            l.name = "Caption " + chunk.speaker + " @" + __round(chunk.start + a.offset, 2);
            var dp = l.property("ADBE Text Properties").property("ADBE Text Document"); var d = dp.value;
            d.font = a.font; d.fontSize = Math.round((st.size || a.size) * k); d.applyFill = true; d.fillColor = __color(st.color || a.color); d.applyStroke = false; d.autoLeading = false; d.leading = Math.round(a.leading * k * ((st.size || a.size) / a.size));
            d.justification = st.align === "left" ? ParagraphJustification.LEFT_JUSTIFY : st.align === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
            dp.setValue(d);
            if (dp.value.font !== a.font) __warn("Font substituted: " + dp.value.font);
            l.property("ADBE Transform Group").property("ADBE Position").setValue([boxX, st.y !== undefined ? st.y : boxY]);
            l.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
            return l;
          }
          return __result(__mutate("Silia captions", function () {
            for (var i = 0; i < a.chunks.length; i++) {
              var ch = a.chunks[i]; var st = a.styles[ch.speaker] || {}; var prefix = st.prefix || "";
              var tStart = ch.start + a.offset + a.latency, tEnd = ch.end + a.offset + 0.35;
              if (firstWord === null) firstWord = tStart; lastWord = ch.end + a.offset;
              if (a.mode === "per_word_layers") {
                for (var w = 0; w < ch.words.length; w++) { var wl = mkLayer(ch, ch.words[w].w); wl.inPoint = Math.max(0, ch.words[w].start + a.offset + a.latency); wl.outPoint = tEnd; layers.push(__layerInfo(wl)); }
                continue;
              }
              var full = prefix + __map(ch.words, function (x) { return x.w; }).join(" ");
              var l = mkLayer(ch, a.mode === "per_turn_hold" ? full : prefix + ch.words[0].w);
              l.inPoint = Math.max(0, tStart); l.outPoint = tEnd;
              var dp = l.property("ADBE Text Properties").property("ADBE Text Document");
              if (a.mode === "accumulate_turn") {
                var acc = prefix;
                for (var j = 0; j < ch.words.length; j++) {
                  acc = j === 0 ? prefix + ch.words[j].w : acc + " " + ch.words[j].w;
                  var d = dp.value; d.text = acc; var tt = Math.max(l.inPoint, ch.words[j].start + a.offset + a.latency);
                  dp.setValueAtTime(tt, d); var ki = dp.nearestKeyIndex(tt); dp.setInterpolationTypeAtKey(ki, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                }
                totalKeys += dp.numKeys;
              }
              var op = l.property("ADBE Transform Group").property("ADBE Opacity");
              __setKeys(op, [{ time: l.inPoint, value: 0 }, { time: l.inPoint + a.fade, value: a.opacity, ease: a.ease }, { time: tEnd - 0.15, value: a.opacity }, { time: tEnd, value: 0, ease: a.ease }]);
              layers.push(__layerInfo(l));
            }
            return { comp: c.name, mode: a.mode, layers: layers.length, layerNames: __map(layers, function (x) { return x.name; }).slice(0, 40), sourceTextKeys: totalKeys, firstWordOnScreen: __round(firstWord, 3), lastWord: __round(lastWord, 3), box: { width: boxW, x: boxX, y: boxY } };
          }));
        `;
        const r = await runScript(ctx, script, { timeoutMs: 120_000, longRunning: true });
        if (!r.success) return r;
        return ok({ ...(r.data as object), transcript: { format: t.format, speakers: t.speakers, words: t.wordCount, turns: t.turns.length, chunks: chunks.length }, overlaps });
      }),
    },

    silia_outro: {
      description:
        "Regenerate the Silia outro from its .aep (the source references ~40 files on an external drive; missing-footage layers render opaque white). plan: open the project (as a copy), list comps and every layer with missing footage, and propose which layers to disable. render: apply the plan (disable missing layers, optionally enforce head black of head_black_sec by trimming/adding a black solid), save a copy and start aerender for the chosen orientation(s) with verification expectations (duration, head black 0.43 s). Returns job ids to poll with ae_render status.",
      parameters: {
        action: z.enum(["plan", "render"]),
        aep: z.string().describe("Path to the outro .aep"),
        comp_horizontal: z.string().optional().describe("Default: first comp matching /horizontal/i"),
        comp_vertical: z.string().optional().describe("Default: first comp matching /vertical/i"),
        orientation: z.enum(["h", "v", "both"]).optional(),
        head_black_sec: z.number().min(0).optional().describe("Default 0.43"),
        disable_missing: z.boolean().optional().describe("Default true"),
        disable_layers: z.array(z.string()).optional().describe("Extra layer names to disable."),
        om_template: z.string().optional().describe('Default "H.264 - Match Render Settings - 40 Mbps"'),
        output_dir: z.string().optional().describe("Default <dataDir>/outro"),
        force: z.boolean().optional().describe("Discard unsaved changes in the currently open project."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (!existsSync(a.aep as string)) return err(`.aep not found: ${a.aep}`, "NOT_FOUND");
        const headBlack = (a.head_black_sec as number) ?? 0.43;
        const outDir = (a.output_dir as string) ?? join(ctx.config.dataDir, "outro");
        const stamp = Date.now().toString(36);
        const workCopy = join(ctx.config.dataDir, "jobs", `outro_${stamp}.aep`);
        copyFileSync(a.aep as string, workCopy);
        const script = `
          ${argsVar("a", { ...a, workCopy, headBlack, plan: a.action === "plan", outDir })}
          var p = app.project;
          if (p && p.dirty && !a.force) return __error("Current project has unsaved changes; save it or pass force=true", "DIRTY");
          if (p) p.close(CloseOptions.DO_NOT_SAVE_CHANGES);
          app.open(__file(a.workCopy));
          p = app.project;
          var comps = []; for (var i = 1; i <= p.numItems; i++) if (p.item(i) instanceof CompItem) comps.push(p.item(i));
          function pick(re, explicit) { if (explicit) return __comp(explicit); for (var q = 0; q < comps.length; q++) if (re.test(comps[q].name)) return comps[q]; return null; }
          var h = pick(/horizontal/i, a.comp_horizontal), v = pick(/vertical/i, a.comp_vertical);
          var targets = []; if (a.orientation !== "v" && h) targets.push({ key: "h", comp: h }); if (a.orientation !== "h" && v) targets.push({ key: "v", comp: v });
          if (!targets.length) return __error("No outro comps found (looked for /horizontal/ and /vertical/): " + __map(comps, function (c) { return c.name; }).join(", "), "COMP_NOT_FOUND");
          function inventory(c) { var out = []; for (var L = 1; L <= c.numLayers; L++) { var l = c.layer(L); var rec = { index: L, name: l.name, kind: __layerKind(l), enabled: l.enabled, inPoint: __round(l.inPoint), outPoint: __round(l.outPoint), missing: false }; try { if (__isAV(l) && l.source instanceof FootageItem && l.source.footageMissing) rec.missing = true; if (__isAV(l) && l.source instanceof CompItem) { for (var N = 1; N <= l.source.numLayers; N++) { var nl = l.source.layer(N); try { if (__isAV(nl) && nl.source instanceof FootageItem && nl.source.footageMissing) rec.nestedMissing = (rec.nestedMissing || 0) + 1; } catch (e1) {} } } } catch (e0) {} out.push(rec); } return out; }
          var missing = __missingFootage();
          var plan = { aep: a.aep, workCopy: a.workCopy, missingFootage: missing.length, comps: __map(targets, function (t) { var inv = inventory(t.comp); return { key: t.key, name: t.comp.name, width: t.comp.width, height: t.comp.height, fps: __round(t.comp.frameRate, 3), duration: __round(t.comp.duration), layers: inv, willDisable: __map(__filterMissing(inv), function (x) { return x.name; }) }; }) };
          function __filterMissing(inv) { var o = []; for (var m = 0; m < inv.length; m++) if ((inv[m].missing || inv[m].nestedMissing) && inv[m].enabled) o.push(inv[m]); return o; }
          if (a.plan) return __result(plan);
          // apply
          var applied = [];
          __mutate("Outro prep", function () {
            for (var ti = 0; ti < targets.length; ti++) {
              var c = targets[ti].comp;
              for (var L = 1; L <= c.numLayers; L++) { var l = c.layer(L); var dis = false; if (a.disable_missing !== false) { try { if (__isAV(l) && l.source instanceof FootageItem && l.source.footageMissing) dis = true; } catch (e2) {} } if (a.disable_layers && __indexOf(a.disable_layers, l.name) !== -1) dis = true; if (dis && l.enabled) { l.enabled = false; applied.push(c.name + " / " + l.name); } }
              if (a.headBlack > 0) { var hb = c.layers.addSolid([0, 0, 0], "Head black " + a.headBlack + "s", c.width, c.height, 1, c.duration); hb.outPoint = a.headBlack; hb.moveToBeginning(); }
            }
          });
          p.save(__file(a.workCopy));
          return __result({ plan: plan, disabled: applied, saved: a.workCopy, targets: __map(targets, function (t) { return { key: t.key, name: t.comp.name, duration: __round(t.comp.duration), fps: __round(t.comp.frameRate, 3), width: t.comp.width, height: t.comp.height }; }) });
        `;
        const r = await runScript(ctx, script, { timeoutMs: 180_000, longRunning: true });
        if (!r.success || a.action === "plan") return r;
        const d = r.data as { targets: Array<{ key: string; name: string; duration: number; fps: number; width: number; height: number }>; disabled: string[]; saved: string };
        const renderCopy = join(ctx.config.dataDir, "jobs", `outro_${stamp}_aerender.aep`);
        copyFileSync(d.saved, renderCopy);
        const jobs = d.targets.map((tg) => {
          const output = join(outDir, `outro-${tg.key === "h" ? "horizontal" : "vertical"}-${stamp}.mp4`);
          const job = startJob(ctx.config.dataDir, { project: renderCopy, comp: tg.name, output, rsTemplate: "Best Settings", omTemplate: (a.om_template as string) ?? "H.264 - Match Render Settings - 40 Mbps", meta: { outro: tg.key, expect: { duration: tg.duration, fps: tg.fps, width: tg.width, height: tg.height, headBlackSec: headBlack } } });
          return { key: tg.key, comp: tg.name, jobId: job.id, output, expect: { duration: tg.duration, fps: tg.fps, width: tg.width, height: tg.height, headBlackSec: headBlack } };
        });
        return ok({ disabled: d.disabled, project: renderCopy, jobs, pollWith: "ae_render action=status job_id=<id> expect=<job.expect>" });
      }),
    },

    silia_conform: {
      description:
        "Frame-rate conform helper for mixed sources (59.94 / 60 / 30 / 24 fps). analyze: ffprobe each source file (or every footage item in the project) and report native fps, VFR, drift per minute against target_fps and the recommended strategy. apply: set conformFrameRate on footage items (interpret) so they play at target_fps, or enable frame blending on their layers. Strategies: interpret (exact 60→30/59.94→60 where the ratio is clean), time_remap (when duration must be preserved), frame_blend (off-ratio sources).",
      parameters: {
        action: z.enum(["analyze", "apply"]),
        comp: compRef,
        sources: z.array(z.string()).optional().describe("File paths; default: all footage items in the project."),
        target_fps: z.number().positive().optional().describe("Default: comp fps."),
        strategy: z.enum(["interpret", "time_remap", "frame_blend"]).optional(),
        items: z.array(z.union([z.string(), z.number().int()])).optional().describe("apply: footage items (name/id); default: all with a mismatch."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const inv = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? null })} var target = null; try { target = __comp(a.comp).frameRate; } catch (e0) {} var items = []; for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if (it instanceof FootageItem && it.mainSource instanceof FileSource && it.file && !it.mainSource.isStill) items.push({ id: it.id, name: it.name, file: it.file.fsName, fps: __round(it.frameRate, 3), native: it.mainSource.nativeFrameRate, conform: it.mainSource.conformFrameRate, duration: __round(it.duration) }); } return __result({ compFps: target, items: items });`);
        if (!inv.success) return inv;
        const d = inv.data as { compFps: number | null; items: Array<{ id: number; name: string; file: string; fps: number; native: number; conform: number; duration: number }> };
        const target = (a.target_fps as number) ?? d.compFps ?? 30;
        const files = (a.sources as string[]) ?? d.items.map((i) => i.file);
        const report = [];
        for (const f of files) {
          const info = existsSync(f) ? await ffprobeJson(f) : null;
          const v = info ? ((info.streams as Array<Record<string, unknown>>) ?? []).find((s) => s.codec_type === "video") : null;
          const parse = (s: string | undefined) => {
            if (!s) return null;
            const m = /^(\d+)(?:\/(\d+))?$/.exec(s);
            return m ? parseInt(m[1], 10) / (m[2] ? parseInt(m[2], 10) : 1) : null;
          };
          const r = v ? parse(v.r_frame_rate as string) : null;
          const avg = v ? parse(v.avg_frame_rate as string) : null;
          const item = d.items.find((i) => i.file === f);
          const src = avg ?? r ?? item?.fps ?? null;
          const ratio = src ? target / src : null;
          const clean = ratio !== null && (Math.abs(ratio - Math.round(ratio)) < 0.002 || Math.abs(1 / ratio - Math.round(1 / ratio)) < 0.002);
          const near = src !== null && Math.abs(src - target) / target < 0.002; // 59.94 vs 60
          const driftMsPerMin = src !== null && near ? Math.round(Math.abs(src - target) / target * 60_000) : null;
          const strategy = src === null ? "unknown" : near ? "interpret" : clean ? "interpret" : "frame_blend";
          report.push({ file: basename(f), item: item?.name ?? null, id: item?.id ?? null, sourceFps: src ? Math.round(src * 1000) / 1000 : null, rFps: r, vfr: r !== null && avg !== null && Math.abs(r - avg) > 0.01, targetFps: target, ratio: ratio ? Math.round(ratio * 1000) / 1000 : null, driftMsPerMin, recommended: strategy, note: near ? `Conforming ${src} to ${target} duplicates/drops one frame every ~${Math.round(1 / Math.abs((src as number) - target))} s; invisible.` : clean ? "Clean ratio: interpret to target." : "Off-ratio: enable frame blending or time-remap the layer." });
        }
        if (a.action === "analyze") return ok({ targetFps: target, sources: report });
        const strategy = (a.strategy as string) ?? "interpret";
        const targets = (a.items as Array<string | number>) ?? report.filter((r) => r.id && r.sourceFps && Math.abs(r.sourceFps - target) > 0.001).map((r) => r.id as number);
        const r2 = await runScript(ctx, `${argsVar("a", { items: targets, target, strategy, comp: a.comp ?? null })} var done = []; __mutate("Conform frame rate", function () { for (var i = 0; i < a.items.length; i++) { var it = typeof a.items[i] === "number" ? __itemById(a.items[i]) : __itemByName(String(a.items[i])); if (!it || !(it instanceof FootageItem)) continue; if (a.strategy === "interpret") { it.mainSource.conformFrameRate = a.target; done.push({ item: it.name, conformFrameRate: it.mainSource.conformFrameRate, fps: __round(it.frameRate, 3) }); } else { var c = null; try { c = __comp(a.comp); } catch (e0) {} if (c) for (var L = 1; L <= c.numLayers; L++) { var l = c.layer(L); if (__isAV(l) && l.source === it) { if (a.strategy === "frame_blend") { l.frameBlendingType = FrameBlendingType.PIXEL_MOTION; c.frameBlending = true; done.push({ item: it.name, layer: l.name, frameBlending: "pixel_motion" }); } else { l.timeRemapEnabled = true; done.push({ item: it.name, layer: l.name, timeRemap: true, note: "set time-remap keys with ae_keyframes on ADBE Time Remapping" }); } } } } } }); return __result({ applied: done });`);
        if (!r2.success) return r2;
        return ok({ targetFps: target, strategy, ...(r2.data as object), analysis: report });
      }),
    },

    silia_ui_composite: {
      description:
        "Composite Silia product UI over a plate from a spec (e.g. exported from Figma): rows (text lines), pills (rounded lime/violeta chips) and an optional cursor path, each as its own layer, stacked above plate_layer, entering with the confirmed pattern and a stagger. spec: {panel:{x,y,width,height,radius,color,opacity}, rows:[{text,x,y,size,color,weight}], pills:[{text,x,y,color,textColor}], cursor:{path:[[x,y,t],...]}}. Returns created layers and the entry timeline.",
      parameters: {
        comp: compRef,
        plate_layer: layerRef.optional(),
        spec: z.object({
          panel: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number(), radius: z.number().optional(), color: z.string().optional(), opacity: z.number().optional() }).optional(),
          rows: z.array(z.object({ text: z.string(), x: z.number(), y: z.number(), size: z.number().optional(), color: z.string().optional(), weight: z.enum(["book", "medium"]).optional() })).optional(),
          pills: z.array(z.object({ text: z.string(), x: z.number(), y: z.number(), color: z.string().optional(), textColor: z.string().optional(), height: z.number().optional() })).optional(),
          cursor: z.object({ path: z.array(z.array(z.number()).length(3)), size: z.number().optional() }).optional(),
        }),
        in_time: z.number().min(0).optional(),
        duration: z.number().positive().optional(),
        stagger: z.number().min(0).optional().describe("Seconds between element entries (default 0.06)."),
        ease: easeSpec.optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", { ...a, fonts: SILIA_FONTS, colors: SILIA_COLORS, pattern: SILIA_PATTERNS.confirmed_entry, ease: easeFor(a.ease ?? "power3_out") })}
          var c = __comp(a.comp); var k = c.height / 1080; var spec = a.spec || {};
          var t0 = a.in_time !== undefined ? a.in_time : c.time; var dur = a.duration || 4; var stag = a.stagger !== undefined ? a.stagger : 0.06;
          var plate = a.plate_layer !== undefined ? __layer(c, a.plate_layer) : null;
          var created = [], n = 0;
          function place(l) { l.inPoint = t0; l.outPoint = t0 + dur; if (plate) l.moveBefore(plate); var tg = l.property("ADBE Transform Group"); var pos = tg.property("ADBE Position"); var pv = pos.value; var delay = n * stag; n++;
            __setKeys(tg.property("ADBE Opacity"), [{ time: t0 + delay, value: 0 }, { time: t0 + delay + a.pattern.duration, value: 100, ease: a.ease }]);
            __setKeys(pos, [{ time: t0 + delay, value: [pv[0], pv[1] + Math.round(a.pattern.risePx * k)], ease: a.ease }, { time: t0 + delay + a.pattern.duration, value: [pv[0], pv[1]], ease: a.ease }]);
            created.push({ layer: __layerInfo(l), enters: __round(t0 + delay, 3) }); }
          function rect(name, x, y, w, h, radius, color, opacity) { var s = c.layers.addShape(); s.name = name; var g = s.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group"); var r = g.addProperty("ADBE Vector Shape - Rect"); r.property("ADBE Vector Rect Size").setValue([w, h]); r.property("ADBE Vector Rect Roundness").setValue(radius || 0); var f = g.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(__color(color, true)); if (opacity !== undefined) f.property("ADBE Vector Fill Opacity").setValue(opacity); s.property("ADBE Transform Group").property("ADBE Position").setValue([x + w / 2, y + h / 2]); return s; }
          function text(name, str, x, y, size, color, weight, justify) { var l = c.layers.addText(str); l.name = name; var dp = l.property("ADBE Text Properties").property("ADBE Text Document"); var d = dp.value; d.font = weight === "medium" ? a.fonts.medium : a.fonts.body; d.fontSize = size; d.applyFill = true; d.fillColor = __color(color); d.applyStroke = false; d.justification = justify || ParagraphJustification.LEFT_JUSTIFY; dp.setValue(d); var r = l.sourceRectAtTime(t0, false); l.property("ADBE Transform Group").property("ADBE Position").setValue([x - r.left, y - r.top]); return l; }
          return __result(__mutate("Silia UI composite", function () {
            if (spec.panel) place(rect("UI panel", spec.panel.x, spec.panel.y, spec.panel.width, spec.panel.height, spec.panel.radius !== undefined ? spec.panel.radius : Math.round(24 * k), spec.panel.color || a.colors.grafito, spec.panel.opacity));
            var rows = spec.rows || []; for (var i = 0; i < rows.length; i++) place(text("UI row " + (i + 1), rows[i].text, rows[i].x, rows[i].y, Math.round((rows[i].size || 28) * k), rows[i].color || a.colors.white, rows[i].weight || "book"));
            var pills = spec.pills || []; for (var j = 0; j < pills.length; j++) { var ph = Math.round((pills[j].height || 40) * k); var tmp = c.layers.addText(pills[j].text); var dp = tmp.property("ADBE Text Properties").property("ADBE Text Document"); var d = dp.value; d.font = a.fonts.medium; d.fontSize = Math.round(ph * 0.45); dp.setValue(d); var tw = tmp.sourceRectAtTime(t0, false).width; tmp.remove(); var pw = Math.round(tw + ph * 0.9); var bg = pills[j].color || a.colors.lime; var fg = pills[j].textColor || (bg.toLowerCase() === a.colors.lime.toLowerCase() ? a.colors.black : a.colors.white); var pr = rect("UI pill " + (j + 1), pills[j].x, pills[j].y, pw, ph, ph / 2, bg); var pt = text("UI pill text " + (j + 1), pills[j].text, pills[j].x + pw / 2, pills[j].y + ph / 2, Math.round(ph * 0.45), fg, "medium", ParagraphJustification.CENTER_JUSTIFY); var r = pt.sourceRectAtTime(t0, false); pt.property("ADBE Transform Group").property("ADBE Position").setValue([pills[j].x + pw / 2, pills[j].y + ph / 2 - r.top - r.height / 2]); pt.parent = pr; n--; place(pr); pt.inPoint = t0; pt.outPoint = t0 + dur; if (plate) pt.moveBefore(plate); }
            if (spec.cursor && spec.cursor.path && spec.cursor.path.length) { var cs = spec.cursor.size || Math.round(18 * k); var cur = c.layers.addShape(); cur.name = "UI cursor"; var cg = cur.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group"); var el = cg.addProperty("ADBE Vector Shape - Ellipse"); el.property("ADBE Vector Ellipse Size").setValue([cs, cs]); var cf = cg.addProperty("ADBE Vector Graphic - Fill"); cf.property("ADBE Vector Fill Color").setValue(__color(a.colors.white, true)); var keys = []; for (var q = 0; q < spec.cursor.path.length; q++) keys.push({ time: t0 + spec.cursor.path[q][2], value: [spec.cursor.path[q][0], spec.cursor.path[q][1]], ease: a.ease }); __setKeys(cur.property("ADBE Transform Group").property("ADBE Position"), keys); cur.inPoint = t0; cur.outPoint = t0 + dur; if (plate) cur.moveBefore(plate); created.push({ layer: __layerInfo(cur), keys: keys.length }); }
            return { comp: c.name, created: created, count: created.length };
          }));
        `;
        return runScript(ctx, script, { timeoutMs: 120_000 });
      }),
    },
  };
}

void verifyMedia;
