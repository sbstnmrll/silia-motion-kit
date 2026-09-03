import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, layerRefs, propPath } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

function scratchDir(dataDir: string): string {
  const d = join(dataDir, "scratch", "frames");
  mkdirSync(d, { recursive: true });
  // Sweep files older than 24 h.
  try {
    const cutoff = Date.now() - 24 * 3600_000;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      try {
        if (statSync(p).mtimeMs < cutoff) unlinkSync(p);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return d;
}

function tc(t: number, fps: number): string {
  const total = Math.max(0, t);
  const s = Math.floor(total);
  const f = Math.round((total - s) * fps);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

async function captureFrames(ctx: ToolContext, comp: unknown, times: number[], opts: { background?: string | null; hideLayers?: unknown[]; soloLayers?: unknown[]; region?: number[] }, dir: string): Promise<Array<{ time: number; path: string; width: number; height: number }>> {
  const stamp = Date.now().toString(36);
  const paths = times.map((t, i) => join(dir, `f_${stamp}_${i}_${String(t).replace(/[^\d.]/g, "")}.png`));
  const r = await runScript(
    ctx,
    `${argsVar("a", { comp: comp ?? null, times, paths, background: opts.background ?? null, hideLayers: opts.hideLayers ?? null, soloLayers: opts.soloLayers ?? null })}
     var c = __comp(a.comp); var out = [];
     for (var i = 0; i < a.times.length; i++) out.push(__saveFrame(c, a.times[i], a.paths[i], { background: a.background, hideLayers: a.hideLayers, soloLayers: a.soloLayers }));
     return __result({ frames: out, fps: c.frameRate, duration: c.duration, name: c.name });`,
    { timeoutMs: Math.max(30_000, 4000 * times.length), longRunning: true },
  );
  if (!r.success) throw new Error(`${r.error}${r.code ? ` (${r.code})` : ""}`);
  const data = r.data as { frames: Array<{ time: number; path: string; width: number; height: number }> };
  return data.frames;
}

async function toImage(path: string, maxWidth: number, format: "png" | "jpeg", region?: number[]): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  let img = sharp(path);
  if (region && region.length === 4) img = img.extract({ left: Math.max(0, Math.round(region[0])), top: Math.max(0, Math.round(region[1])), width: Math.round(region[2]), height: Math.round(region[3]) });
  const meta = await img.metadata();
  if ((meta.width ?? 0) > maxWidth) img = img.resize({ width: maxWidth });
  const buf = format === "jpeg" ? await img.flatten({ background: "#000000" }).jpeg({ quality: 82 }).toBuffer() : await img.png({ compressionLevel: 8 }).toBuffer();
  const outMeta = await sharp(buf).metadata();
  return { base64: buf.toString("base64"), mimeType: format === "jpeg" ? "image/jpeg" : "image/png", width: outMeta.width ?? 0, height: outMeta.height ?? 0 };
}

export function getVisionTools(ctx: ToolContext): ToolRecord {
  return {
    ae_frame: {
      description:
        "See what a comp actually renders. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended; avoids the black fringe of transparent captures). contact_sheet: several frames tiled into one labeled JPEG grid (times[], or every N seconds, or at_markers, or at_keyframes of a layer property), max_width caps the sheet. stats: per-frame mean/max luma and alpha coverage without returning pixels (flash/black detection). compare: mean absolute difference between two times or a time and a reference PNG. hide_layers/solo_layers isolate parts of the comp during capture (restored afterwards).",
      parameters: {
        action: z.enum(["capture", "contact_sheet", "stats", "compare"]),
        comp: compRef,
        time: z.number().min(0).optional().describe("capture/compare: seconds (default comp time)."),
        times: z.array(z.number().min(0)).max(64).optional(),
        every: z.number().positive().optional().describe("contact_sheet/stats: sample every N seconds across the range."),
        range: z.object({ start: z.number().min(0), end: z.number().min(0) }).optional(),
        at_markers: z.boolean().optional(),
        at_keyframes: z.object({ layer: layerRef, path: propPath }).optional(),
        max_frames: z.number().int().min(1).max(64).optional().describe("Cap for every/at_* (default 16)."),
        max_width: z.number().int().min(160).max(4096).optional().describe("Output width cap (default 1280 for capture, 1600 for sheets)."),
        format: z.enum(["png", "jpeg"]).optional(),
        background: z.string().nullable().optional().describe("Flatten onto this color (default #0A0A0B). null keeps alpha (PNG only)."),
        region: z.array(z.number()).length(4).optional().describe("Crop [x,y,w,h] in comp pixels before scaling."),
        hide_layers: layerRefs.optional(),
        solo_layers: layerRefs.optional(),
        labels: z.boolean().optional().describe("contact_sheet: draw timecodes (default true)."),
        columns: z.number().int().min(1).max(8).optional(),
        reference_png: z.string().optional().describe("compare: path of a reference image (else compare time vs time_b)."),
        time_b: z.number().min(0).optional(),
        keep_files: z.boolean().optional().describe("Keep the PNG files on disk and return their paths (default true)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const dir = scratchDir(ctx.config.dataDir);
        const background = a.background === undefined ? "#0A0A0B" : (a.background as string | null);
        const opts = { background, hideLayers: a.hide_layers as unknown[] | undefined, soloLayers: a.solo_layers as unknown[] | undefined };

        // Resolve times.
        const meta = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? null, atMarkers: a.at_markers === true, kf: a.at_keyframes ?? null })}
          var c = __comp(a.comp); var out = { time: c.time, duration: c.duration, fps: c.frameRate, width: c.width, height: c.height, name: c.name, markers: [], keyTimes: [] };
          if (a.atMarkers && c.markerProperty) for (var m = 1; m <= c.markerProperty.numKeys; m++) out.markers.push(c.markerProperty.keyTime(m));
          if (a.kf) { var p = __prop(__layer(c, a.kf.layer), a.kf.path); for (var k = 1; k <= p.numKeys; k++) out.keyTimes.push(p.keyTime(k)); }
          return __result(out);`);
        if (!meta.success) return meta;
        const m = meta.data as { time: number; duration: number; fps: number; width: number; height: number; name: string; markers: number[]; keyTimes: number[] };
        const maxFrames = (a.max_frames as number) ?? 16;
        const clamp = (t: number) => Math.min(Math.max(0, t), Math.max(0, m.duration - 1 / m.fps));
        let times: number[] = [];
        if (a.action === "capture") times = [clamp((a.time as number) ?? m.time)];
        else if (a.action === "compare") times = a.reference_png ? [clamp((a.time as number) ?? m.time)] : [clamp((a.time as number) ?? m.time), clamp((a.time_b as number) ?? m.time)];
        else if (Array.isArray(a.times) && a.times.length) times = (a.times as number[]).map(clamp);
        else if (a.at_markers) times = m.markers.map(clamp);
        else if (a.at_keyframes) times = m.keyTimes.map(clamp);
        else {
          const range = (a.range as { start: number; end: number }) ?? { start: 0, end: m.duration };
          const every = (a.every as number) ?? Math.max(1 / m.fps, (range.end - range.start) / Math.min(maxFrames, 12));
          for (let t = range.start; t < range.end && times.length < maxFrames; t += every) times.push(clamp(t));
          if (times.length === 0) times = [clamp(range.start)];
        }
        times = times.slice(0, maxFrames);
        if (times.length === 0) return err("No times resolved (no markers/keyframes?)", "NO_TIMES");

        const frames = await captureFrames(ctx, a.comp, times, opts, dir);
        const format = (a.format as "png" | "jpeg") ?? (a.action === "contact_sheet" ? "jpeg" : "png");

        if (a.action === "capture") {
          const img = await toImage(frames[0].path, (a.max_width as number) ?? 1280, background === null ? "png" : format, a.region as number[] | undefined);
          if (a.keep_files === false) unlinkSync(frames[0].path);
          return ok({ ...img, comp: m.name, time: frames[0].time, timecode: tc(frames[0].time, m.fps), compSize: [m.width, m.height], file: a.keep_files === false ? undefined : frames[0].path });
        }

        if (a.action === "stats") {
          const stats = [];
          for (const f of frames) {
            let img = sharp(f.path);
            if (a.region) img = img.extract({ left: Math.round((a.region as number[])[0]), top: Math.round((a.region as number[])[1]), width: Math.round((a.region as number[])[2]), height: Math.round((a.region as number[])[3]) });
            const s = await img.stats();
            const [r, g, b, al] = s.channels;
            const luma = r && g && b ? 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean : 0;
            const maxLuma = r && g && b ? 0.2126 * r.max + 0.7152 * g.max + 0.0722 * b.max : 0;
            stats.push({ time: f.time, timecode: tc(f.time, m.fps), meanLuma: Math.round(luma * 10) / 10, maxLuma: Math.round(maxLuma), stdev: Math.round(((r?.stdev ?? 0) + (g?.stdev ?? 0) + (b?.stdev ?? 0)) / 3), alphaCoverage: al ? Math.round((al.mean / 255) * 1000) / 10 : null });
            if (a.keep_files === false) unlinkSync(f.path);
          }
          const flags: string[] = [];
          for (const s of stats) {
            if (s.meanLuma > 235) flags.push(`${s.timecode}: near-white frame (mean luma ${s.meanLuma})`);
            if (s.meanLuma < 3 && s.stdev < 2) flags.push(`${s.timecode}: black frame`);
          }
          return ok({ comp: m.name, frames: stats, flags });
        }

        if (a.action === "compare") {
          const aPath = frames[0].path;
          const bPath = a.reference_png ? (a.reference_png as string) : frames[1].path;
          if (!existsSync(bPath)) return err(`Reference not found: ${bPath}`, "NOT_FOUND");
          const w = 320;
          const A = await sharp(aPath).resize({ width: w }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
          const B = await sharp(bPath).resize({ width: w, height: A.info.height, fit: "fill" }).removeAlpha().greyscale().raw().toBuffer();
          let sum = 0,
            changed = 0;
          for (let i = 0; i < A.data.length; i++) {
            const d = Math.abs(A.data[i] - B[i]);
            sum += d;
            if (d > 24) changed++;
          }
          const diffImg = Buffer.alloc(A.data.length);
          for (let i = 0; i < A.data.length; i++) diffImg[i] = Math.min(255, Math.abs(A.data[i] - B[i]) * 3);
          const diffPng = await sharp(diffImg, { raw: { width: A.info.width, height: A.info.height, channels: 1 } }).png().toBuffer();
          return ok({ base64: diffPng.toString("base64"), mimeType: "image/png", comp: m.name, timeA: frames[0].time, timeB: a.reference_png ? null : frames[1].time, reference: a.reference_png ?? null, meanAbsDiff: Math.round((sum / A.data.length) * 100) / 100, changedPct: Math.round((changed / A.data.length) * 1000) / 10, note: "image is the amplified difference (x3)" });
        }

        // contact sheet
        const cols = (a.columns as number) ?? (frames.length <= 4 ? frames.length : frames.length <= 9 ? 3 : 4);
        const rows = Math.ceil(frames.length / cols);
        const sheetWidth = (a.max_width as number) ?? 1600;
        const cellW = Math.floor(sheetWidth / cols);
        const cellH = Math.round((cellW * m.height) / m.width);
        const labelH = a.labels === false ? 0 : Math.max(18, Math.round(cellH * 0.09));
        const composites: OverlayOptions[] = [];
        for (let i = 0; i < frames.length; i++) {
          const x = (i % cols) * cellW;
          const y = Math.floor(i / cols) * (cellH + labelH);
          let cell = sharp(frames[i].path);
          if (a.region) cell = cell.extract({ left: Math.round((a.region as number[])[0]), top: Math.round((a.region as number[])[1]), width: Math.round((a.region as number[])[2]), height: Math.round((a.region as number[])[3]) });
          const buf = await cell.flatten({ background: background ?? "#000000" }).resize({ width: cellW, height: cellH, fit: "fill" }).png().toBuffer();
          composites.push({ input: buf, left: x, top: y });
          if (labelH) {
            const label = `${tc(frames[i].time, m.fps)}  (${frames[i].time.toFixed(2)}s)`;
            const svg = Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="8" y="${Math.round(labelH * 0.72)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(labelH * 0.6)}" fill="#DEFF38">${label}</text></svg>`);
            composites.push({ input: svg, left: x, top: y + cellH });
          }
          if (a.keep_files === false) unlinkSync(frames[i].path);
        }
        const sheet = await sharp({ create: { width: cellW * cols, height: rows * (cellH + labelH), channels: 3, background: "#000000" } }).composite(composites).jpeg({ quality: 82 }).toBuffer();
        return ok({ base64: sheet.toString("base64"), mimeType: "image/jpeg", comp: m.name, grid: [cols, rows], cell: [cellW, cellH], frames: frames.map((f) => ({ time: f.time, timecode: tc(f.time, m.fps), file: a.keep_files === false ? undefined : f.path })), compSize: [m.width, m.height] });
      }),
    },
  };
}

// keep the readFileSync import for potential reference-loading extensions
void readFileSync;
