import { z } from "zod";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs }, (e, stdout, stderr) => resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), ok: !e }));
  });
}

/** Decode to mono 16-bit PCM at `rate` and compute an RMS envelope per window. */
async function envelope(path: string, windowMs = 10, rate = 8000): Promise<{ windowMs: number; rate: number; rms: number[]; peak: number; durationSec: number } | null> {
  const r = await new Promise<Buffer | null>((resolve) => {
    execFile("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { windowsHide: true, encoding: "buffer", maxBuffer: 512 * 1024 * 1024, timeout: 300_000 }, (e, stdout) => resolve(e ? null : (stdout as Buffer)));
  });
  if (!r) return null;
  const samples = r.length / 2;
  const win = Math.max(1, Math.round((rate * windowMs) / 1000));
  const rms: number[] = [];
  let peak = 0;
  for (let i = 0; i < samples; i += win) {
    let acc = 0;
    let n = 0;
    for (let j = i; j < Math.min(samples, i + win); j++) {
      const v = r.readInt16LE(j * 2) / 32768;
      acc += v * v;
      n++;
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    rms.push(n ? Math.sqrt(acc / n) : 0);
  }
  return { windowMs, rate, rms, peak, durationSec: samples / rate };
}

function onsets(rms: number[], windowMs: number, threshold: number, minGapSec: number): number[] {
  const out: number[] = [];
  const minGap = Math.round((minGapSec * 1000) / windowMs);
  let last = -Infinity;
  const mean = rms.reduce((a, b) => a + b, 0) / Math.max(1, rms.length);
  const thr = mean * (1 + threshold);
  for (let i = 1; i < rms.length; i++) {
    const rise = rms[i] - rms[i - 1];
    if (rms[i] > thr && rise > mean * 0.5 && i - last >= minGap) {
      out.push(Math.round(((i * windowMs) / 1000) * 1000) / 1000);
      last = i;
    }
  }
  return out;
}

export function getAudioTools(ctx: ToolContext): ToolRecord {
  return {
    ae_audio: {
      description:
        "Audio inspection and audio-driven markers (analysis runs in Node with ffmpeg; AE cannot read samples). info: audio layers in a comp with source file and levels. envelope: RMS envelope of a layer's source (or any file path) in windows of window_ms; returns a downsampled curve plus peak/duration. to_markers: place comp markers at detected onsets (threshold relative to mean, min_gap seconds) or at silences' ends. silences: ffmpeg silencedetect (noise_db, min_duration). set_levels: audio levels in dB (static or keyframes [{time, db}]).",
      parameters: {
        action: z.enum(["info", "envelope", "to_markers", "silences", "set_levels"]),
        comp: compRef,
        layer: layerRef.optional(),
        file: z.string().optional().describe("Analyse this file instead of a layer's source."),
        window_ms: z.number().int().min(5).max(1000).optional(),
        max_points: z.number().int().min(50).max(5000).optional().describe("envelope: downsample to this many points (default 400)."),
        threshold: z.number().min(0).max(5).optional().describe("to_markers: onset sensitivity as a fraction above the mean RMS (default 0.8)."),
        min_gap: z.number().min(0.05).optional().describe("to_markers: min seconds between markers (default 0.25)."),
        mode: z.enum(["onsets", "silence_ends"]).optional(),
        label: z.number().int().min(0).max(16).optional(),
        comment_prefix: z.string().optional(),
        noise_db: z.number().max(0).optional().describe("silences: threshold (default -35 dB)."),
        min_duration: z.number().min(0.05).optional().describe("silences: min silence length (default 0.4 s)."),
        db: z.number().optional().describe("set_levels: static level in dB."),
        keyframes: z.array(z.object({ time: z.number().min(0), db: z.number() })).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (a.action === "info") {
          return runScript(ctx, `${argsVar("a", a)} var c = __comp(a.comp); var out = [];
            for (var i = 1; i <= c.numLayers; i++) { var l = c.layer(i); if (!__isAV(l) || !l.hasAudio) continue; var rec = { index: i, name: l.name, audioEnabled: l.audioEnabled, file: null, levelsDb: null, inPoint: __round(l.inPoint), outPoint: __round(l.outPoint) }; try { rec.file = l.source && l.source.file ? l.source.file.fsName : null; } catch (e0) {} try { rec.levelsDb = __value(l.property("ADBE Audio Group").property("ADBE Audio Levels").value); rec.levelKeys = l.property("ADBE Audio Group").property("ADBE Audio Levels").numKeys; } catch (e1) {} out.push(rec); }
            return __result({ comp: c.name, audioLayers: out });`);
        }
        if (a.action === "set_levels") {
          if (a.layer === undefined) return err("layer required", "BAD_ARG");
          return runScript(ctx, `${argsVar("a", a)} var c = __comp(a.comp); var l = __layer(c, a.layer); if (!__isAV(l) || !l.hasAudio) return __error("Layer has no audio", "BAD_ARG");
            var p = l.property("ADBE Audio Group").property("ADBE Audio Levels");
            __mutate("Audio levels", function () { if (a.keyframes) { var keys = []; for (var k = 0; k < a.keyframes.length; k++) keys.push({ time: a.keyframes[k].time, value: [a.keyframes[k].db, a.keyframes[k].db] }); __setKeys(p, keys); } else if (a.db !== undefined) { if (p.numKeys) p.setValueAtTime(c.time, [a.db, a.db]); else p.setValue([a.db, a.db]); } });
            return __result({ layer: l.name, levelsDb: __value(p.value), numKeys: p.numKeys, keys: __keyList(p) });`);
        }
        // Resolve the source file.
        let file = a.file as string | undefined;
        let compName: string | null = null;
        let fps = 30;
        let layerIn = 0;
        if (!file) {
          if (a.layer === undefined) return err("layer or file required", "BAD_ARG");
          const r = await runScript(ctx, `${argsVar("a", a)} var c = __comp(a.comp); var l = __layer(c, a.layer); var f = null; try { f = l.source && l.source.file ? l.source.file.fsName : null; } catch (e0) {} if (!f) return __error("Layer has no file source", "NO_FILE"); return __result({ file: f, comp: c.name, fps: c.frameRate, inPoint: l.inPoint, startTime: l.startTime });`);
          if (!r.success) return r;
          const d = r.data as { file: string; comp: string; fps: number; inPoint: number; startTime: number };
          file = d.file;
          compName = d.comp;
          fps = d.fps;
          layerIn = d.startTime;
        }
        if (!existsSync(file)) return err(`File not found: ${file}`, "NOT_FOUND");

        if (a.action === "silences") {
          const noise = (a.noise_db as number) ?? -35;
          const minDur = (a.min_duration as number) ?? 0.4;
          const r = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `silencedetect=noise=${noise}dB:d=${minDur}`, "-f", "null", "-"]);
          const silences: Array<{ start: number; end: number; duration: number }> = [];
          const starts = [...r.stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
          const ends = [...r.stderr.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)];
          ends.forEach((m, i) => silences.push({ start: starts[i] ?? 0, end: parseFloat(m[1]), duration: parseFloat(m[2]) }));
          return ok({ file, noiseDb: noise, minDuration: minDur, silences });
        }

        const env = await envelope(file, (a.window_ms as number) ?? 10);
        if (!env) return err("ffmpeg could not decode the audio (is ffmpeg on PATH?)", "FFMPEG_FAILED");

        if (a.action === "envelope") {
          const maxPoints = (a.max_points as number) ?? 400;
          const step = Math.max(1, Math.ceil(env.rms.length / maxPoints));
          const curve: number[] = [];
          for (let i = 0; i < env.rms.length; i += step) {
            let m = 0;
            for (let j = i; j < Math.min(env.rms.length, i + step); j++) m = Math.max(m, env.rms[j]);
            curve.push(Math.round(m * 1000) / 1000);
          }
          const mean = env.rms.reduce((x, y) => x + y, 0) / env.rms.length;
          return ok({ file, durationSec: Math.round(env.durationSec * 1000) / 1000, windowMs: env.windowMs * step, points: curve.length, peak: Math.round(env.peak * 1000) / 1000, meanRms: Math.round(mean * 1000) / 1000, curve });
        }

        // to_markers
        let times: number[] = [];
        if ((a.mode as string) === "silence_ends") {
          const r = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `silencedetect=noise=${(a.noise_db as number) ?? -35}dB:d=${(a.min_duration as number) ?? 0.4}`, "-f", "null", "-"]);
          times = [...r.stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
        } else {
          times = onsets(env.rms, env.windowMs, (a.threshold as number) ?? 0.8, (a.min_gap as number) ?? 0.25);
        }
        times = times.map((t) => Math.round((t + layerIn) * fps) / fps).filter((t) => t >= 0);
        if (!times.length) return ok({ file, markers: [], note: "no events detected; lower threshold or noise_db" });
        const prefix = (a.comment_prefix as string) ?? "beat";
        const r = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? compName, times, label: a.label ?? 0, prefix })} var c = __comp(a.comp); var mp = c.markerProperty; __mutate("Audio markers", function () { for (var i = 0; i < a.times.length; i++) { var v = new MarkerValue(a.prefix + " " + (i + 1)); v.label = a.label; mp.setValueAtTime(a.times[i], v); } }); return __result({ comp: c.name, added: a.times.length, totalMarkers: mp.numKeys });`);
        if (!r.success) return r;
        return ok({ ...(r.data as object), times, source: file });
      }),
    },
  };
}
