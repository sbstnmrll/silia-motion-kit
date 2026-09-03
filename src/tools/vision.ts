/**
 * ae_frame: seeing (capture, contact sheet, onion skin, stats, compare) and judging
 * (keyframe_dump + rubric critique) a composition.
 *
 * Method notes, with sources (CC BY 4.0):
 * - AniMINT, "Beyond Screenshots: Evaluating VLMs' Understanding of UI Animations"
 *   (arXiv 2604.26148): VLMs need ~10 fps frame sampling to judge easing and stagger;
 *   below that, timing judgements collapse to guesses. Short ranges default to 0.1 s.
 * - WebVR (arXiv 2603.13391): binary, single-attribute rubric items; numeric facts are
 *   checked mechanically and only perceptual items are handed to the vision model.
 * - Onion skinning / spacing charts are classical animation practice (Williams, "The
 *   Animator's Survival Kit"); the implementation here is ours.
 */
import { z } from "zod";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, layerRefs, propPath } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { REGISTERS, type Intent, type Register } from "../motion/taxonomy.js";
import { evaluateRubric, finalizeDump, type KeyframeDump } from "../motion/rubric.js";

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

function frameOf(t: number, fps: number): number {
  return Math.round(t * fps);
}

/** "mm:ss:ff · f<absolute frame> · <t>s" */
export function frameLabel(t: number, fps: number): string {
  return `${tc(t, fps)} · f${frameOf(t, fps)} · ${t.toFixed(2)}s`;
}

function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface CompMeta {
  time: number;
  duration: number;
  fps: number;
  width: number;
  height: number;
  name: string;
  markers: number[];
  keyTimes: number[];
}

export interface Captured {
  time: number;
  path: string;
  width: number;
  height: number;
}

async function captureFrames(ctx: ToolContext, comp: unknown, times: number[], opts: { background?: string | null; hideLayers?: unknown[]; soloLayers?: unknown[]; region?: number[] }, dir: string): Promise<Captured[]> {
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
  const data = r.data as { frames: Captured[] };
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

// ---------------------------------------------------------------------------
// Time sampling
// ---------------------------------------------------------------------------

/** AniMINT floor: ~10 fps sampling for ranges of 2 s or less when the caller did not pick a step. */
const SHORT_RANGE_SEC = 2;
const SHORT_RANGE_EVERY = 0.1;

export function sampleRange(range: { start: number; end: number }, every: number | undefined, maxFrames: number | undefined, fps: number, clamp: (t: number) => number): { times: number[]; every: number; maxFrames: number } {
  const len = Math.max(0, range.end - range.start);
  const short = len <= SHORT_RANGE_SEC && every === undefined;
  const cap = maxFrames ?? (short ? Math.min(24, Math.ceil(len / SHORT_RANGE_EVERY) + 1) : 16);
  const step = every ?? (short ? SHORT_RANGE_EVERY : Math.max(1 / fps, len / Math.min(cap, 12)));
  const times: number[] = [];
  for (let t = range.start; t <= range.end + 1e-9 && times.length < cap; t += step) times.push(clamp(t));
  if (times.length === 0) times.push(clamp(range.start));
  return { times: Array.from(new Set(times)), every: step, maxFrames: cap };
}

// ---------------------------------------------------------------------------
// Contact sheet
// ---------------------------------------------------------------------------

interface SheetOpts {
  columns?: number;
  maxWidth?: number;
  labels?: boolean;
  region?: number[];
  background: string | null;
}

export async function buildContactSheet(frames: Captured[], m: CompMeta, o: SheetOpts): Promise<{ base64: string; mimeType: string; grid: [number, number]; cell: [number, number]; frames: Array<{ time: number; frame: number; timecode: string; label: string }> }> {
  const cols = o.columns ?? (frames.length <= 4 ? frames.length : frames.length <= 9 ? 3 : 4);
  const rows = Math.ceil(frames.length / cols);
  const sheetWidth = o.maxWidth ?? 1600;
  const srcW = o.region ? o.region[2] : m.width;
  const srcH = o.region ? o.region[3] : m.height;
  const cellW = Math.floor(sheetWidth / cols);
  const cellH = Math.round((cellW * srcH) / srcW);
  const labelH = o.labels === false ? 0 : Math.max(18, Math.round(cellH * 0.09));
  const composites: OverlayOptions[] = [];
  const out: Array<{ time: number; frame: number; timecode: string; label: string }> = [];
  for (let i = 0; i < frames.length; i++) {
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * (cellH + labelH);
    let cell = sharp(frames[i].path);
    if (o.region) cell = cell.extract({ left: Math.round(o.region[0]), top: Math.round(o.region[1]), width: Math.round(o.region[2]), height: Math.round(o.region[3]) });
    const buf = await cell.flatten({ background: o.background ?? "#000000" }).resize({ width: cellW, height: cellH, fit: "fill" }).png().toBuffer();
    composites.push({ input: buf, left: x, top: y });
    const label = frameLabel(frames[i].time, m.fps);
    out.push({ time: frames[i].time, frame: frameOf(frames[i].time, m.fps), timecode: tc(frames[i].time, m.fps), label });
    if (labelH) {
      const svg = Buffer.from(`<svg width="${cellW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="8" y="${Math.round(labelH * 0.72)}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(labelH * 0.58)}" fill="#DEFF38">${xml(label)}</text></svg>`);
      composites.push({ input: svg, left: x, top: y + cellH });
    }
  }
  const sheet = await sharp({ create: { width: cellW * cols, height: rows * (cellH + labelH), channels: 3, background: "#000000" } }).composite(composites).jpeg({ quality: 82 }).toBuffer();
  return { base64: sheet.toString("base64"), mimeType: "image/jpeg", grid: [cols, rows], cell: [cellW, cellH], frames: out };
}

// ---------------------------------------------------------------------------
// Onion skin (spacing chart)
// ---------------------------------------------------------------------------

/** Six hues cycled per frame; lime is Silia's accent. */
const ONION_TINTS = ["#FF5C5C", "#FFAD4D", "#DEFF38", "#4DFF9A", "#4DD2FF", "#FF5CE1"];
const DIFF_THRESHOLD = 24;

interface OnionOpts {
  maxWidth?: number;
  region?: number[];
  background: string | null;
  boxes?: boolean;
  format?: "png" | "jpeg";
}

interface OnionFrame {
  time: number;
  frame: number;
  timecode: string;
  tint: string | null;
  /** Bbox of pixels that changed vs the previous sample (null for the first). */
  changedBbox: [number, number, number, number] | null;
  changedPct: number | null;
  /** Bbox of the ghost drawn for this sample (pixels changed against both neighbours); null for the latest. */
  motionBbox: [number, number, number, number] | null;
  /** Centroid of the change region vs the previous sample (comp px); null for the first. */
  centroid: [number, number] | null;
}

export async function buildOnionSkin(frames: Captured[], m: CompMeta, o: OnionOpts): Promise<{ base64: string; mimeType: string; width: number; height: number; frames: OnionFrame[]; spacing: number[]; tints: string[]; note: string }> {
  const srcW = o.region ? Math.round(o.region[2]) : m.width;
  const srcH = o.region ? Math.round(o.region[3]) : m.height;
  const W = Math.min(o.maxWidth ?? 1280, srcW);
  const scale = W / srcW;
  const H = Math.max(1, Math.round(srcH * scale));
  const bg = o.background ?? "#000000";
  const N = frames.length;

  const base = (p: string) => {
    let s = sharp(p);
    if (o.region) s = s.extract({ left: Math.max(0, Math.round(o.region[0])), top: Math.max(0, Math.round(o.region[1])), width: srcW, height: srcH });
    return s.flatten({ background: bg }).resize({ width: W, height: H, fit: "fill" });
  };

  // Greyscale rasters: change detection and, per frame, the luminance the ghost tint is applied to
  // (colourised by hand in the RGBA loop below; sharp.tint() desaturates too much on dark comps).
  const greys: Buffer[] = [];
  for (let i = 0; i < N; i++) greys.push(await base(frames[i].path).removeAlpha().greyscale().raw().toBuffer());
  const tintRgb = ONION_TINTS.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as [number, number, number]);

  const px = W * H;
  const toComp = (v: number) => Math.round(v / scale);
  const info: OnionFrame[] = frames.map((f, i) => ({ time: f.time, frame: frameOf(f.time, m.fps), timecode: tc(f.time, m.fps), tint: i === N - 1 ? null : ONION_TINTS[i % ONION_TINTS.length], changedBbox: null, changedPct: null, motionBbox: null, centroid: null }));

  const measure = (test: (p: number) => boolean): { mask: Uint8Array; bbox: [number, number, number, number] | null; centroid: [number, number] | null; pct: number } => {
    const mask = new Uint8Array(px);
    let minX = W, minY = H, maxX = -1, maxY = -1, count = 0, sx = 0, sy = 0;
    for (let p = 0; p < px; p++) {
      if (!test(p)) continue;
      mask[p] = 1;
      const x = p % W;
      const y = (p - x) / W;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sx += x;
      sy += y;
      count++;
    }
    if (!count) return { mask, bbox: null, centroid: null, pct: 0 };
    return { mask, bbox: [toComp(minX), toComp(minY), toComp(maxX - minX + 1), toComp(maxY - minY + 1)], centroid: [Math.round(sx / count / scale), Math.round(sy / count / scale)], pct: Math.round((count / px) * 1000) / 10 };
  };
  const diff = (a: Buffer, b: Buffer) => measure((p) => Math.abs(a[p] - b[p]) > DIFF_THRESHOLD);

  // Change masks vs the previous sample: bbox/centroid/spacing (the symmetric difference of two
  // poses has its centroid at their midpoint, so consecutive displacements track the spacing).
  const changed: Array<Uint8Array | null> = [null];
  for (let i = 1; i < N; i++) {
    const ch = diff(greys[i - 1], greys[i]);
    changed.push(ch.mask);
    info[i].changedBbox = ch.bbox;
    info[i].changedPct = ch.pct;
    info[i].centroid = ch.centroid;
  }
  // Ghost mask = pixels that changed against BOTH neighbours: the element in this sample, without
  // the region it vacated (which would otherwise paint background over older ghosts). Where poses
  // overlap (ease-out pile-up) the ghost thins to the leading edge, like a drawn onion-skin outline.
  const first = diff(greys[0], greys[N - 1]).mask;
  const fgMasks: Uint8Array[] = [];
  for (let i = 0; i < N - 1; i++) {
    const a = i === 0 ? first : (changed[i] as Uint8Array);
    const b = changed[i + 1] as Uint8Array;
    const fg = measure((p) => a[p] === 1 && b[p] === 1);
    fgMasks.push(fg.mask);
    info[i].motionBbox = fg.bbox;
  }

  // Ghosts: every frame but the latest, alpha decaying with age.
  const composites: OverlayOptions[] = [];
  const latest = await base(frames[N - 1].path).removeAlpha().png().toBuffer();
  composites.push({ input: latest, left: 0, top: 0 });
  for (let i = 0; i < N - 1; i++) {
    const mask = fgMasks[i];
    const age = N - 2 === 0 ? 1 : i / (N - 2); // 0 = oldest, 1 = newest ghost
    const alpha = Math.round(255 * (0.28 + 0.52 * age));
    const rgba = Buffer.alloc(px * 4);
    const src = greys[i];
    const [tr, tg, tb] = tintRgb[i % tintRgb.length];
    for (let p = 0, q = 0; p < px; p++, q += 4) {
      if (!mask[p]) continue;
      // Colourise: keep the element's luminance (lifted so dark elements still read), in the frame's hue.
      const l = Math.min(1, 0.35 + (src[p] / 255) * 0.75);
      rgba[q] = Math.round(tr * l);
      rgba[q + 1] = Math.round(tg * l);
      rgba[q + 2] = Math.round(tb * l);
      rgba[q + 3] = alpha;
    }
    composites.push({ input: rgba, raw: { width: W, height: H, channels: 4 }, left: 0, top: 0 });
  }

  // Bounding boxes of change (thin rectangles) and the legend strip.
  const legendH = Math.max(22, Math.round(H * 0.05));
  if (o.boxes !== false) {
    const rects = info
      .map((f, i) => {
        const bb = f.changedBbox;
        if (!bb) return "";
        const [x, y, w, h] = bb.map((v) => v * scale);
        const color = i === N - 1 ? "#FFFFFF" : ONION_TINTS[i % ONION_TINTS.length];
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, w).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9"/>`;
      })
      .join("");
    if (rects) composites.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`), left: 0, top: 0 });
  }
  const slot = W / N;
  const fs = Math.max(9, Math.min(13, Math.floor(slot / 4.2)));
  const sw = Math.round(legendH * 0.45);
  const legendItems = info
    .map((f, i) => {
      const x = i * slot;
      const color = i === N - 1 ? "#FFFFFF" : ONION_TINTS[i % ONION_TINTS.length];
      const label = `f${f.frame}${i === N - 1 ? "*" : ""}`;
      return `<rect x="${(x + 4).toFixed(1)}" y="${Math.round((legendH - sw) / 2)}" width="${sw}" height="${sw}" fill="${color}"/><text x="${(x + 8 + sw).toFixed(1)}" y="${Math.round(legendH * 0.68)}" font-family="Segoe UI, Arial, sans-serif" font-size="${fs}" fill="#EEE">${xml(label)}</text>`;
    })
    .join("");
  const legend = Buffer.from(`<svg width="${W}" height="${legendH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/>${legendItems}</svg>`);
  composites.push({ input: legend, left: 0, top: H });

  const canvas = sharp({ create: { width: W, height: H + legendH, channels: 3, background: "#000000" } }).composite(composites);
  const buf = o.format === "png" ? await canvas.png({ compressionLevel: 8 }).toBuffer() : await canvas.jpeg({ quality: 86 }).toBuffer();

  const spacing: number[] = [];
  for (let i = 2; i < N; i++) {
    const a = info[i - 1].centroid;
    const b = info[i].centroid;
    spacing.push(a && b ? Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10) / 10 : 0);
  }
  return {
    base64: buf.toString("base64"),
    mimeType: o.format === "png" ? "image/png" : "image/jpeg",
    width: W,
    height: H + legendH,
    frames: info,
    spacing,
    tints: ONION_TINTS,
    note: `Latest frame (f${info[N - 1].frame}, legend '*') is drawn untinted; earlier frames are tinted ghosts of the pixels they changed against both neighbouring samples (the element, minus the region it vacated), alpha decaying with age (oldest faintest); where poses overlap the ghost thins to the leading edge. Rectangles outline the changed region between consecutive samples. spacing[k] = displacement of the change-region centroid between samples k+1 and k+2 in comp px (≈ the element's per-sample travel): shrinking values = ease-out, growing = ease-in, flat = linear.`,
  };
}

// ---------------------------------------------------------------------------
// Keyframe dump
// ---------------------------------------------------------------------------

function dumpScript(comp: unknown, layers: unknown[] | undefined, maxLayers: number, maxKeys: number): string {
  return `${argsVar("a", { comp: comp ?? null, layers: layers ?? null, maxLayers, maxKeys })}
    var c = __comp(a.comp); var fps = c.frameRate;
    var targets = [];
    if (a.layers && a.layers.length) { for (var i0 = 0; i0 < a.layers.length; i0++) targets.push(__layer(c, a.layers[i0])); }
    else { for (var j0 = 1; j0 <= c.numLayers; j0++) targets.push(c.layer(j0)); }
    var truncatedLayers = Math.max(0, targets.length - a.maxLayers); targets = targets.slice(0, a.maxLayers);
    function keyDump(p, k) {
      var t = p.keyTime(k);
      var o = { t: __round(t, 6), frame: Math.round(t * fps), value: null, inInterp: "unknown", outInterp: "unknown", inInfluence: null, outInfluence: null, inSpeed: null, outSpeed: null };
      try { var v = p.keyValue(k); o.value = (v instanceof TextDocument) ? v.text : __value(v); } catch (e0) {}
      try { o.inInterp = __interpName(p.keyInInterpolationType(k)); o.outInterp = __interpName(p.keyOutInterpolationType(k)); } catch (e1) {}
      try { var ie = p.keyInTemporalEase(k), oe = p.keyOutTemporalEase(k); o.inInfluence = __round(ie[0].influence, 2); o.outInfluence = __round(oe[0].influence, 2); o.inSpeed = __round(ie[0].speed, 3); o.outSpeed = __round(oe[0].speed, 3); } catch (e2) {}
      return o;
    }
    function propDump(p) {
      var n = p.numKeys;
      var d = { path: __propPath(p), matchName: p.matchName, name: p.name, dims: 1, isSpatial: false, keys: [], firstKeyT: 0, lastKeyT: 0, durationMs: 0 };
      try { d.dims = __dims(p); } catch (e0) {}
      try { d.isSpatial = !!p.isSpatial; } catch (e1) {}
      for (var k = 1; k <= n && k <= a.maxKeys; k++) d.keys.push(keyDump(p, k));
      if (n > a.maxKeys) d.keysOmitted = n - a.maxKeys;
      d.firstKeyT = __round(p.keyTime(1), 6); d.lastKeyT = __round(p.keyTime(n), 6); d.durationMs = Math.round((p.keyTime(n) - p.keyTime(1)) * 1000);
      return d;
    }
    function walk(group, depth, out) {
      var n = 0; try { n = group.numProperties; } catch (e0) { return; }
      for (var i = 1; i <= n; i++) {
        var p = null; try { p = group.property(i); } catch (e1) { continue; }
        if (!p || p.matchName === "ADBE Marker") continue;
        if (p.propertyType === PropertyType.PROPERTY) { var nk = 0; try { nk = p.numKeys; } catch (e2) {} if (nk > 0) out.push(propDump(p)); }
        else if (depth > 1) walk(p, depth - 1, out);
      }
    }
    function glowsOf(l) {
      var out = []; var fx = null; try { fx = l.property("ADBE Effect Parade"); } catch (e0) {}
      if (!fx) return out;
      for (var i = 1; i <= fx.numProperties; i++) {
        var e = fx.property(i);
        if (!(e.matchName === "ADBE Glo2" || /glow/i.test(e.name) || /glow/i.test(e.matchName))) continue;
        var g = { name: e.name, matchName: e.matchName, enabled: e.enabled, props: [] };
        for (var j = 1; j <= e.numProperties; j++) { var p = e.property(j); if (p.propertyType === PropertyType.PROPERTY && p.numKeys > 0) g.props.push(propDump(p)); }
        out.push(g);
      }
      return out;
    }
    var layers = [], staticCount = 0;
    for (var q = 0; q < targets.length; q++) {
      var l = targets[q]; var props = []; walk(l, 6, props);
      var gl = glowsOf(l);
      if (!props.length && !gl.length) { staticCount++; continue; }
      layers.push({ index: l.index, name: l.name, kind: __layerKind(l), inPoint: __round(l.inPoint, 6), outPoint: __round(l.outPoint, 6), props: props, glows: gl });
    }
    return __result({ comp: c.name, fps: fps, duration: c.duration, width: c.width, height: c.height, layers: layers, staticLayers: staticCount, truncatedLayers: truncatedLayers });`;
}

async function dumpKeyframes(ctx: ToolContext, comp: unknown, layers: unknown[] | undefined, maxLayers = 60, maxKeys = 200): Promise<{ success: true; dump: KeyframeDump } | { success: false; result: Awaited<ReturnType<typeof runScript>> }> {
  const r = await runScript(ctx, dumpScript(comp, layers, maxLayers, maxKeys), { timeoutMs: 60_000 });
  if (!r.success) return { success: false, result: r };
  return { success: true, dump: finalizeDump(r.data as Omit<KeyframeDump, "staggerDeltas">) };
}

/** Keys reduced to [t, frame, value, outInterp, outInfluence, inInfluence] for the critique payload. */
function compactDump(d: KeyframeDump, maxKeysPerProp = 12) {
  return {
    comp: d.comp,
    fps: d.fps,
    duration: d.duration,
    size: [d.width, d.height],
    staticLayers: d.staticLayers ?? 0,
    keyFormat: "[t, frame, value, outInterp, outInfluence, inInfluence]",
    staggerDeltas: d.staggerDeltas,
    layers: d.layers.map((l) => ({
      index: l.index,
      name: l.name,
      kind: l.kind,
      in: l.inPoint,
      out: l.outPoint,
      props: l.props.map((p) => ({
        path: p.path,
        dims: p.dims,
        spatial: p.isSpatial || undefined,
        numKeys: p.keys.length + (p.keysOmitted ?? 0),
        firstKeyT: p.firstKeyT,
        lastKeyT: p.lastKeyT,
        durationMs: p.durationMs,
        keys: p.keys.slice(0, maxKeysPerProp).map((k) => [k.t, k.frame, typeof k.value === "string" ? k.value.slice(0, 24) : k.value, k.outInterp, k.outInfluence, k.inInfluence]),
        ...(p.keys.length > maxKeysPerProp ? { keysTruncated: p.keys.length - maxKeysPerProp } : {}),
      })),
      ...(l.glows.length ? { glows: l.glows.map((g) => ({ name: g.name, animated: g.props.map((p) => p.name) })) } : {}),
    })),
  };
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export function getVisionTools(ctx: ToolContext): ToolRecord {
  return {
    ae_frame: {
      description:
        "See what a comp actually renders, and judge it. capture: one frame at time t as an image (PNG, or JPEG for smaller payloads); background '#0A0A0B' flattens alpha (recommended). contact_sheet: several frames tiled into one labeled JPEG grid (labels: timecode · f<frame> · seconds); times[], every N seconds, at_markers, or at_keyframes of a layer property; ranges <= 2 s default to every 0.1 s (~10 fps). onion_skin: the same frames composited into ONE spacing chart (latest frame untinted, earlier frames as hue-tinted ghosts of changed pixels with decaying alpha, change bounding boxes, legend with frame numbers) plus spacing[] = per-sample centroid displacement in px. stats: per-frame mean/max luma and alpha coverage (flash/black detection). compare: mean absolute difference between two times or a time and a reference PNG. keyframe_dump: no images; every animated property of the layers (default all, cap 60) with keys {t, frame, value, in/out interpolation, influences, speeds}, glow effects, and first-key stagger deltas. critique: contact_sheet + onion_skin + keyframe_dump, then the motion rubric for a register (product_video | functional_ui): failed items carry numeric fixes, unverifiable items are for you to judge from the two images. hide_layers/solo_layers isolate parts of the comp during capture (restored afterwards).",
      parameters: {
        action: z.enum(["capture", "contact_sheet", "onion_skin", "stats", "compare", "keyframe_dump", "critique"]),
        comp: compRef,
        time: z.number().min(0).optional().describe("capture/compare: seconds (default comp time)."),
        times: z.array(z.number().min(0)).max(64).optional(),
        every: z.number().positive().optional().describe("contact_sheet/onion_skin/stats/critique: sample every N seconds across the range (default 0.1 s when the range is <= 2 s, else range/12)."),
        range: z.object({ start: z.number().min(0), end: z.number().min(0) }).optional().describe("Sampling range (default whole comp; critique defaults to the animated span)."),
        at_markers: z.boolean().optional(),
        at_keyframes: z.object({ layer: layerRef, path: propPath }).optional(),
        max_frames: z.number().int().min(1).max(64).optional().describe("Cap for every/at_* (default 16; 24 for short ranges at 0.1 s)."),
        max_width: z.number().int().min(160).max(4096).optional().describe("Output width cap (default 1280 for capture/onion_skin, 1600 for sheets)."),
        format: z.enum(["png", "jpeg"]).optional(),
        background: z.string().nullable().optional().describe("Flatten onto this color (default #0A0A0B). null keeps alpha (PNG only)."),
        region: z.array(z.number()).length(4).optional().describe("Crop [x,y,w,h] in comp pixels before scaling."),
        hide_layers: layerRefs.optional(),
        solo_layers: layerRefs.optional(),
        labels: z.boolean().optional().describe("contact_sheet: draw labels (default true)."),
        columns: z.number().int().min(1).max(8).optional(),
        boxes: z.boolean().optional().describe("onion_skin/critique: outline the changed region per sample (default true)."),
        reference_png: z.string().optional().describe("compare: path of a reference image (else compare time vs time_b)."),
        time_b: z.number().min(0).optional(),
        keep_files: z.boolean().optional().describe("Keep the PNG files on disk and return their paths (default true)."),
        layers: layerRefs.optional().describe("keyframe_dump/critique: layers to inspect (default all, cap 60)."),
        max_layers: z.number().int().min(1).max(200).optional(),
        register: z.enum(["product_video", "functional_ui"]).optional().describe("critique: motion register (default product_video)."),
        intent: z.enum(["transition", "demonstration", "guidance", "feedback", "visualization", "highlight", "aesthetic"]).optional().describe("critique: declared animation intent (AniMINT)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const background = a.background === undefined ? "#0A0A0B" : (a.background as string | null);
        const layersArg = a.layers as unknown[] | undefined;
        const maxLayers = (a.max_layers as number) ?? 60;

        if (a.action === "keyframe_dump") {
          const d = await dumpKeyframes(ctx, a.comp, layersArg, maxLayers);
          if (!d.success) return d.result;
          return ok(d.dump);
        }

        const dir = scratchDir(ctx.config.dataDir);
        const opts = { background, hideLayers: a.hide_layers as unknown[] | undefined, soloLayers: a.solo_layers as unknown[] | undefined };

        // Resolve comp metadata (and marker / keyframe times).
        const meta = await runScript(ctx, `${argsVar("a", { comp: a.comp ?? null, atMarkers: a.at_markers === true, kf: a.at_keyframes ?? null })}
          var c = __comp(a.comp); var out = { time: c.time, duration: c.duration, fps: c.frameRate, width: c.width, height: c.height, name: c.name, markers: [], keyTimes: [] };
          if (a.atMarkers && c.markerProperty) for (var m = 1; m <= c.markerProperty.numKeys; m++) out.markers.push(c.markerProperty.keyTime(m));
          if (a.kf) { var p = __prop(__layer(c, a.kf.layer), a.kf.path); for (var k = 1; k <= p.numKeys; k++) out.keyTimes.push(p.keyTime(k)); }
          return __result(out);`);
        if (!meta.success) return meta;
        const m = meta.data as CompMeta;
        const clamp = (t: number) => Math.min(Math.max(0, t), Math.max(0, m.duration - 1 / m.fps));

        // critique: dump first so the default range can follow the animated span.
        let dump: KeyframeDump | null = null;
        if (a.action === "critique") {
          const d = await dumpKeyframes(ctx, a.comp, layersArg, maxLayers);
          if (!d.success) return d.result;
          dump = d.dump;
        }

        let times: number[] = [];
        let sampling: { every: number; maxFrames: number } | null = null;
        if (a.action === "capture") times = [clamp((a.time as number) ?? m.time)];
        else if (a.action === "compare") times = a.reference_png ? [clamp((a.time as number) ?? m.time)] : [clamp((a.time as number) ?? m.time), clamp((a.time_b as number) ?? m.time)];
        else if (Array.isArray(a.times) && a.times.length) times = (a.times as number[]).map(clamp);
        else if (a.at_markers) times = m.markers.map(clamp);
        else if (a.at_keyframes) times = m.keyTimes.map(clamp);
        else {
          let range = a.range as { start: number; end: number } | undefined;
          if (!range && dump) {
            const firsts = dump.layers.flatMap((l) => l.props.map((p) => p.firstKeyT));
            const lasts = dump.layers.flatMap((l) => l.props.map((p) => p.lastKeyT));
            if (firsts.length) range = { start: Math.max(0, Math.min(...firsts) - 1 / m.fps), end: Math.min(m.duration, Math.max(...lasts) + 2 / m.fps) };
          }
          range ??= { start: 0, end: m.duration };
          const s = sampleRange(range, a.every as number | undefined, a.max_frames as number | undefined, m.fps, clamp);
          times = s.times;
          sampling = { every: s.every, maxFrames: s.maxFrames };
        }
        const maxFrames = (a.max_frames as number) ?? sampling?.maxFrames ?? 16;
        times = times.slice(0, maxFrames);
        if (times.length === 0) return err("No times resolved (no markers/keyframes?)", "NO_TIMES");
        if (a.action === "onion_skin" && times.length < 2) return err("onion_skin needs at least 2 frames (widen range or lower every)", "BAD_ARG");

        const frames = await captureFrames(ctx, a.comp, times, opts, dir);
        const format = (a.format as "png" | "jpeg") ?? (a.action === "contact_sheet" ? "jpeg" : "png");
        const region = a.region as number[] | undefined;
        const cleanup = () => {
          if (a.keep_files === false) for (const f of frames) { try { unlinkSync(f.path); } catch { /* ignore */ } }
        };
        const files = () => (a.keep_files === false ? undefined : frames.map((f) => f.path));

        if (a.action === "capture") {
          const img = await toImage(frames[0].path, (a.max_width as number) ?? 1280, background === null ? "png" : format, region);
          cleanup();
          return ok({ ...img, comp: m.name, time: frames[0].time, frame: frameOf(frames[0].time, m.fps), timecode: tc(frames[0].time, m.fps), compSize: [m.width, m.height], file: a.keep_files === false ? undefined : frames[0].path });
        }

        if (a.action === "stats") {
          const stats = [];
          for (const f of frames) {
            let img = sharp(f.path);
            if (region) img = img.extract({ left: Math.round(region[0]), top: Math.round(region[1]), width: Math.round(region[2]), height: Math.round(region[3]) });
            const s = await img.stats();
            const [r, g, b, al] = s.channels;
            const luma = r && g && b ? 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean : 0;
            const maxLuma = r && g && b ? 0.2126 * r.max + 0.7152 * g.max + 0.0722 * b.max : 0;
            stats.push({ time: f.time, frame: frameOf(f.time, m.fps), timecode: tc(f.time, m.fps), meanLuma: Math.round(luma * 10) / 10, maxLuma: Math.round(maxLuma), stdev: Math.round(((r?.stdev ?? 0) + (g?.stdev ?? 0) + (b?.stdev ?? 0)) / 3), alphaCoverage: al ? Math.round((al.mean / 255) * 1000) / 10 : null });
          }
          cleanup();
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
            if (d > DIFF_THRESHOLD) changed++;
          }
          const diffImg = Buffer.alloc(A.data.length);
          for (let i = 0; i < A.data.length; i++) diffImg[i] = Math.min(255, Math.abs(A.data[i] - B[i]) * 3);
          const diffPng = await sharp(diffImg, { raw: { width: A.info.width, height: A.info.height, channels: 1 } }).png().toBuffer();
          cleanup();
          return ok({ base64: diffPng.toString("base64"), mimeType: "image/png", comp: m.name, timeA: frames[0].time, timeB: a.reference_png ? null : frames[1].time, reference: a.reference_png ?? null, meanAbsDiff: Math.round((sum / A.data.length) * 100) / 100, changedPct: Math.round((changed / A.data.length) * 1000) / 10, note: "image is the amplified difference (x3)" });
        }

        if (a.action === "onion_skin") {
          const onion = await buildOnionSkin(frames, m, { maxWidth: a.max_width as number | undefined, region, background, boxes: a.boxes as boolean | undefined, format: a.format as "png" | "jpeg" | undefined });
          cleanup();
          const { base64, mimeType, ...rest } = onion;
          return ok({ images: [{ base64, mimeType, label: "onion" }], comp: m.name, compSize: [m.width, m.height], fps: m.fps, sampling, ...rest, files: files() });
        }

        if (a.action === "critique") {
          const register = ((a.register as Register | undefined) ?? "product_video") as Register;
          const sheet = await buildContactSheet(frames, m, { columns: a.columns as number | undefined, maxWidth: a.max_width as number | undefined, labels: a.labels as boolean | undefined, region, background });
          const onion = await buildOnionSkin(frames, m, { maxWidth: Math.min((a.max_width as number) ?? 1280, 1280), region, background, boxes: a.boxes as boolean | undefined });
          cleanup();
          const d = dump as KeyframeDump;
          const rubric = evaluateRubric(d, register, { intent: a.intent as Intent | undefined });
          return ok({
            images: [
              { base64: sheet.base64, mimeType: sheet.mimeType, label: "contact_sheet", grid: sheet.grid, frames: sheet.frames.map((f) => f.label) },
              { base64: onion.base64, mimeType: onion.mimeType, label: "onion", spacing: onion.spacing, note: onion.note },
            ],
            comp: m.name,
            compSize: [m.width, m.height],
            fps: m.fps,
            register,
            registerSpec: { durations: REGISTERS[register].durations, stagger: REGISTERS[register].stagger, scaleFrom: REGISTERS[register].scaleFrom },
            sampling: { ...sampling, times, frames: times.map((t) => frameOf(t, m.fps)) },
            rubric: { passed: rubric.passed, failed: rubric.failed, unverifiable: rubric.unverifiable, summary: `${rubric.passed.length} passed, ${rubric.failed.length} failed, ${rubric.unverifiable.length} for the vision pass` },
            dump: compactDump(d),
            spacing: onion.spacing,
            instructions: "Judge only the unverifiable items from the images; apply the numeric fixes with ae_ease/ae_keyframes; re-run critique once.",
          });
        }

        // contact sheet
        const sheet = await buildContactSheet(frames, m, { columns: a.columns as number | undefined, maxWidth: a.max_width as number | undefined, labels: a.labels as boolean | undefined, region, background });
        cleanup();
        const paths = files();
        return ok({ base64: sheet.base64, mimeType: sheet.mimeType, comp: m.name, grid: sheet.grid, cell: sheet.cell, sampling, frames: sheet.frames.map((f, i) => ({ ...f, file: paths ? paths[i] : undefined })), compSize: [m.width, m.height] });
      }),
    },
  };
}
