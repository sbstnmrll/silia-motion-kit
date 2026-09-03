/**
 * Motion critique rubric: atomic, binary checks over a keyframe dump.
 *
 * Design sources (CC BY 4.0; numbers and the "one attribute per check" discipline
 * come from them, the wording and the AE mappings are ours):
 * - WebVR — "Evaluating VLMs as judges of web motion/visual quality with atomic binary
 *   rubrics" (arXiv 2603.13391): every rubric item tests ONE attribute, no conjunctions,
 *   and items the model cannot decide from numbers are handed to the vision pass.
 * - AniMINT — "Beyond Screenshots: Evaluating VLMs' Understanding of UI Animations"
 *   (arXiv 2604.26148): the 7 animation intents, the ~10 fps sampling floor, and the
 *   split between mechanically verifiable timing facts and perceptual judgements.
 *
 * Register bands (durations, staggers, scaleFrom) come from src/motion/taxonomy.ts.
 */
import { INTENTS, REGISTERS, type Intent, type Register, type RegisterSpec } from "./taxonomy.js";

// ---------------------------------------------------------------------------
// Dump shape (produced by ae_frame action=keyframe_dump, see src/tools/vision.ts)
// ---------------------------------------------------------------------------

export type Interp = "linear" | "bezier" | "hold" | "unknown";

export interface DumpKey {
  /** Seconds (unrounded beyond 6 decimals). */
  t: number;
  /** round(t · fps) */
  frame: number;
  value: number | number[] | string | Record<string, unknown> | null;
  inInterp: Interp;
  outInterp: Interp;
  inInfluence: number | null;
  outInfluence: number | null;
  inSpeed: number | null;
  outSpeed: number | null;
}

export interface DumpProp {
  /** matchName path, e.g. "ADBE Transform Group/ADBE Opacity" */
  path: string;
  matchName: string;
  name: string;
  dims: number;
  isSpatial: boolean;
  keys: DumpKey[];
  firstKeyT: number;
  lastKeyT: number;
  durationMs: number;
  keysOmitted?: number;
}

export interface DumpGlow {
  name: string;
  matchName: string;
  enabled: boolean;
  props: DumpProp[];
}

export interface DumpLayer {
  index: number;
  name: string;
  kind?: string;
  inPoint: number;
  outPoint: number;
  props: DumpProp[];
  glows: DumpGlow[];
}

export interface StaggerDelta {
  layer: string;
  index: number;
  firstKeyT: number;
  /** ms since the previous layer's first key (null for the first layer). */
  deltaMs: number | null;
}

export interface KeyframeDump {
  comp: string;
  fps: number;
  duration: number;
  width: number;
  height: number;
  layers: DumpLayer[];
  staticLayers?: number;
  staggerDeltas: StaggerDelta[];
}

/** Fill in comp-level derived fields (stagger deltas) from the per-layer data. */
export function finalizeDump(d: Omit<KeyframeDump, "staggerDeltas"> & { staggerDeltas?: StaggerDelta[] }): KeyframeDump {
  const firsts = d.layers
    .filter((l) => l.props.some((p) => p.keys.length > 0))
    .map((l) => ({ layer: l.name, index: l.index, firstKeyT: Math.min(...l.props.filter((p) => p.keys.length).map((p) => p.firstKeyT)) }))
    .sort((a, b) => a.firstKeyT - b.firstKeyT || a.index - b.index);
  const staggerDeltas: StaggerDelta[] = firsts.map((f, i) => ({ ...f, deltaMs: i === 0 ? null : Math.round((f.firstKeyT - firsts[i - 1].firstKeyT) * 1000) }));
  return { ...d, staggerDeltas };
}

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export type RubricGroup = "timing" | "easing" | "choreography" | "legibility" | "spatial" | "intent";

export interface RubricItem {
  id: string;
  group: RubricGroup;
  /** One attribute, phrased so the answer is yes/no. */
  check: string;
  /** true: decided from the keyframe dump; false: the vision pass judges it from the images. */
  auto: boolean;
}

export const RUBRIC: RubricItem[] = [
  // timing
  { id: "timing.whole_frame", group: "timing", check: "Every keyframe sits on a whole frame.", auto: true },
  { id: "timing.min_visible", group: "timing", check: "Every opacity/position/scale tween lasts at least the register's minVisibleMs.", auto: true },
  { id: "timing.max_single", group: "timing", check: "No single tween is longer than the register's maxSingleMs.", auto: true },
  { id: "timing.exit_shorter", group: "timing", check: "On a layer with both, the opacity exit is shorter than the opacity entrance.", auto: true },
  { id: "timing.no_dead_uniformity", group: "timing", check: "With 3+ animated layers, not every layer uses the identical tween duration.", auto: true },
  // easing
  { id: "easing.no_linear_motion", group: "easing", check: "No position/scale/rotation tween uses linear interpolation (hold is allowed).", auto: true },
  { id: "easing.entrance_decelerates", group: "easing", check: "Each entrance tween decelerates (outInfluence of the first key <= inInfluence of the second).", auto: true },
  { id: "easing.exit_accelerates", group: "easing", check: "Each exit tween accelerates (outInfluence of the first key >= inInfluence of the second).", auto: true },
  { id: "easing.consistent_influences", group: "easing", check: "Layers tweening the same property over the same duration share the same influences.", auto: true },
  // choreography
  { id: "choreography.stagger_in_band", group: "choreography", check: "Each first-key delta between consecutive layers is within the register's per-item stagger band.", auto: true },
  { id: "choreography.sequence_cap", group: "choreography", check: "The whole entrance sequence (first to last first-key) fits the register's sequence cap.", auto: true },
  { id: "choreography.one_focal_motion", group: "choreography", check: "Only one element carries the focal motion in any given beat.", auto: false },
  // spatial
  { id: "spatial.no_pop_in", group: "spatial", check: "No scale entrance starts below 0.9 x its target (pop-in), unless it starts at exactly 0.", auto: true },
  { id: "spatial.keys_in_range", group: "spatial", check: "Every keyframe lies inside its layer's in/out range.", auto: true },
  { id: "spatial.glow_not_zeroed", group: "spatial", check: "No glow effect has its intensity or opacity animated to 0 (house rule: fade the layer, not the glow).", auto: true },
  { id: "spatial.no_unintended_overlap", group: "spatial", check: "No two elements overlap unintentionally in any sampled frame.", auto: false },
  { id: "spatial.nothing_clipped_mid_move", group: "spatial", check: "Nothing is clipped by the frame edge or a matte while it is moving.", auto: false },
  // legibility
  { id: "legibility.title_safe", group: "legibility", check: "All text stays inside the title-safe area (10% inset per edge).", auto: false },
  { id: "legibility.smallest_glyph", group: "legibility", check: "The smallest glyph on screen is readable at the delivery size.", auto: false },
  { id: "legibility.text_holds_after_rest", group: "legibility", check: "Text holds still long enough to be read after it comes to rest.", auto: false },
  { id: "legibility.contrast_darkest_cell", group: "legibility", check: "Text contrast is sufficient in the darkest sampled cell.", auto: false },
  // intent
  { id: "intent.nameable", group: "intent", check: `Every animated element has a nameable intent (${Object.keys(INTENTS).join(", ")}).`, auto: false },
];

export interface RubricResult {
  id: string;
  check: string;
  observed: string;
  /** Numeric, actionable. Present on failures. */
  fix?: string;
  note?: string;
}

export interface RubricEvaluation {
  register: Register;
  passed: RubricResult[];
  failed: RubricResult[];
  /** Items the vision pass must judge from the images (plus auto items that need intent to decide). */
  unverifiable: Array<{ id: string; check: string; note?: string }>;
}

export interface RubricOptions {
  intent?: Intent;
  /** Tolerance in frames for the whole-frame check (default 0.01). */
  frameTolerance?: number;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type PropClass = "opacity" | "position" | "scale" | "rotation" | "other";

function classify(p: DumpProp): PropClass {
  const m = p.matchName;
  if (/Opacity/i.test(m)) return "opacity";
  if (/Position/i.test(m)) return "position";
  if (/Scale/i.test(m)) return "scale";
  if (/Rotat|Orientation/i.test(m)) return "rotation";
  return "other";
}

interface Tween {
  layer: DumpLayer;
  prop: DumpProp;
  cls: PropClass;
  a: DumpKey;
  b: DumpKey;
  durationMs: number;
  /** Scalar magnitude of the start/end values (for opacity/scale direction). */
  from: number | null;
  to: number | null;
}

function magnitude(v: DumpKey["value"]): number | null {
  if (typeof v === "number") return v;
  if (Array.isArray(v) && v.length && v.every((x) => typeof x === "number")) return Math.hypot(...(v as number[]));
  return null;
}

function scalar(v: DumpKey["value"]): number | null {
  if (typeof v === "number") return v;
  if (Array.isArray(v) && typeof v[0] === "number") return v[0] as number;
  return null;
}

function sameValue(a: DumpKey["value"], b: DumpKey["value"]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Consecutive key pairs that actually interpolate (not hold, values differ). */
function tweensOf(layer: DumpLayer, prop: DumpProp): Tween[] {
  const out: Tween[] = [];
  const cls = classify(prop);
  for (let i = 0; i < prop.keys.length - 1; i++) {
    const a = prop.keys[i];
    const b = prop.keys[i + 1];
    if (a.outInterp === "hold") continue;
    if (sameValue(a.value, b.value)) continue;
    const durationMs = Math.round((b.t - a.t) * 1000);
    if (durationMs <= 0) continue;
    const from = cls === "position" ? null : scalar(a.value);
    const to = cls === "position" ? null : scalar(b.value);
    out.push({ layer, prop, cls, a, b, durationMs, from, to });
  }
  return out;
}

function fmtS(sec: number): string {
  return `${sec.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} s`;
}

function framesFor(ms: number, fps: number): number {
  return Math.max(1, Math.round((ms / 1000) * fps));
}

function snapMs(ms: number, fps: number): number {
  return Math.round((framesFor(ms, fps) / fps) * 1000);
}

function lbl(layer: DumpLayer): string {
  return `L${layer.index} '${layer.name}'`;
}

function propLabel(t: Tween): string {
  return t.cls === "other" ? t.prop.name : t.cls;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export function evaluateRubric(dump: KeyframeDump, register: Register | RegisterSpec = "product_video", opts: RubricOptions = {}): RubricEvaluation {
  const reg: RegisterSpec = typeof register === "string" ? REGISTERS[register] : register;
  const fps = dump.fps || 30;
  const tol = opts.frameTolerance ?? 0.01;
  const passed: RubricResult[] = [];
  const failed: RubricResult[] = [];
  const unverifiable: RubricEvaluation["unverifiable"] = [];
  const item = (id: string): RubricItem => RUBRIC.find((r) => r.id === id) as RubricItem;
  const pass = (id: string, observed: string, note?: string) => passed.push({ id, check: item(id).check, observed, ...(note ? { note } : {}) });
  const fail = (id: string, observed: string, fix: string) => failed.push({ id, check: item(id).check, observed, fix });
  const defer = (id: string, note?: string) => unverifiable.push({ id, check: item(id).check, ...(note ? { note } : {}) });

  const layers = dump.layers.filter((l) => l.props.some((p) => p.keys.length > 0));
  const allTweens: Tween[] = [];
  for (const l of layers) for (const p of l.props) allTweens.push(...tweensOf(l, p));
  const totalKeys = layers.reduce((n, l) => n + l.props.reduce((m, p) => m + p.keys.length, 0), 0);

  // ---- timing.whole_frame
  {
    const off: string[] = [];
    for (const l of layers) for (const p of l.props) for (const k of p.keys) {
      const f = k.t * fps;
      if (Math.abs(f - Math.round(f)) > tol) off.push(`${lbl(l)} ${p.name} @ ${fmtS(k.t)} = ${f.toFixed(2)} f`);
    }
    if (off.length) fail("timing.whole_frame", `${off.length} of ${totalKeys} keys off-frame: ${off.slice(0, 5).join("; ")}${off.length > 5 ? "; ..." : ""}`, `snap each listed key to round(t x ${fps}) / ${fps} (ae_keyframes action=set with the rounded time, or rebuild with frame-aligned times)`);
    else pass("timing.whole_frame", `${totalKeys} keys, all on whole frames at ${fps} fps`);
  }

  // ---- timing.min_visible / timing.max_single
  {
    const visible = allTweens.filter((t) => t.cls === "opacity" || t.cls === "position" || t.cls === "scale");
    const tooShort = visible.filter((t) => t.durationMs < reg.durations.minVisibleMs);
    if (tooShort.length) fail("timing.min_visible", tooShort.slice(0, 6).map((t) => `${lbl(t.layer)} ${propLabel(t)} tween ${t.durationMs} ms @ ${fmtS(t.a.t)}`).join("; "), `lengthen each to >= ${reg.durations.minVisibleMs} ms (${framesFor(reg.durations.minVisibleMs, fps)} f at ${fps} fps): ae_keyframes action=set on the second key`);
    else pass("timing.min_visible", `${visible.length} opacity/position/scale tweens, shortest ${visible.length ? Math.min(...visible.map((t) => t.durationMs)) : 0} ms >= ${reg.durations.minVisibleMs} ms`);

    const tooLong = allTweens.filter((t) => t.durationMs > reg.durations.maxSingleMs);
    if (tooLong.length) fail("timing.max_single", tooLong.slice(0, 6).map((t) => `${lbl(t.layer)} ${propLabel(t)} tween ${t.durationMs} ms @ ${fmtS(t.a.t)}`).join("; "), `shorten each to <= ${reg.durations.maxSingleMs} ms (${framesFor(reg.durations.maxSingleMs, fps)} f) or split it into two beats`);
    else pass("timing.max_single", `${allTweens.length} tweens, longest ${allTweens.length ? Math.max(...allTweens.map((t) => t.durationMs)) : 0} ms <= ${reg.durations.maxSingleMs} ms`);
  }

  // ---- entrances / exits (shared by timing.exit_shorter and easing checks)
  interface EE { layer: DumpLayer; prop: DumpProp; cls: PropClass; entrance: Tween | null; exit: Tween | null; holdOnly: boolean }
  const ee: EE[] = [];
  for (const l of layers) for (const p of l.props) {
    const cls = classify(p);
    if (cls !== "opacity" && cls !== "position" && cls !== "scale") continue;
    const tw = tweensOf(l, p);
    if (!tw.length) {
      ee.push({ layer: l, prop: p, cls, entrance: null, exit: null, holdOnly: p.keys.length > 1 && p.keys.every((k) => k.outInterp === "hold" || k === p.keys[p.keys.length - 1]) });
      continue;
    }
    const first = tw[0];
    const last = tw[tw.length - 1];
    const increasing = (t: Tween) => t.from !== null && t.to !== null && t.to > t.from;
    const decreasing = (t: Tween) => t.from !== null && t.to !== null && t.to < t.from;
    const entrance = cls === "position" ? first : increasing(first) ? first : null;
    const exit = cls === "position" ? null : decreasing(last) && last !== entrance ? last : null;
    ee.push({ layer: l, prop: p, cls, entrance, exit, holdOnly: false });
  }

  // ---- timing.exit_shorter (opacity only)
  {
    const pairs = ee.filter((e) => e.cls === "opacity" && e.entrance && e.exit);
    const bad = pairs.filter((e) => (e.exit as Tween).durationMs >= (e.entrance as Tween).durationMs);
    if (bad.length) fail("timing.exit_shorter", bad.map((e) => `${lbl(e.layer)} opacity in ${(e.entrance as Tween).durationMs} ms / out ${(e.exit as Tween).durationMs} ms`).join("; "), bad.map((e) => `${lbl(e.layer)}: out ${(e.exit as Tween).durationMs} ms -> ${snapMs(Math.round((e.entrance as Tween).durationMs * 0.7), fps)} ms`).join("; "));
    else pass("timing.exit_shorter", pairs.length ? `${pairs.length} layer(s) with in+out: every exit shorter than its entrance` : "no layer has both an opacity entrance and exit", pairs.length ? undefined : "nothing to compare");
  }

  // ---- timing.no_dead_uniformity
  {
    if (layers.length >= 3 && allTweens.length) {
      const durs = new Set(allTweens.map((t) => t.durationMs));
      if (durs.size === 1) {
        const d = allTweens[0].durationMs;
        fail("timing.no_dead_uniformity", `duration ${(d / 1000).toFixed(2)} s uniform on ${layers.length} layers (${allTweens.length} tweens)`, `duration ${(d / 1000).toFixed(2)} s uniform on ${layers.length} layers -> vary ${(Math.round(d * 0.87) / 1000).toFixed(2)}/${(Math.round(d * 1.07) / 1000).toFixed(2)}/${(Math.round(d * 1.33) / 1000).toFixed(2)} (snap to frames: ${framesFor(d * 0.87, fps)}/${framesFor(d * 1.07, fps)}/${framesFor(d * 1.33, fps)} f)`);
      } else pass("timing.no_dead_uniformity", `${durs.size} distinct tween durations across ${layers.length} layers`);
    } else pass("timing.no_dead_uniformity", `${layers.length} animated layer(s); check applies from 3`, "not applicable");
  }

  // ---- easing.no_linear_motion
  {
    const motion = allTweens.filter((t) => t.cls === "position" || t.cls === "scale" || t.cls === "rotation");
    const linear = motion.filter((t) => t.a.outInterp === "linear" || t.b.inInterp === "linear");
    if (linear.length) fail("easing.no_linear_motion", linear.slice(0, 6).map((t) => `${lbl(t.layer)} ${propLabel(t)} linear @ ${fmtS(t.a.t)}-${fmtS(t.b.t)}`).join("; "), linear.slice(0, 6).map((t) => `${lbl(t.layer)} ${propLabel(t)}: ae_ease action=preset preset=${reg.eases.enter} keys=[${t.prop.keys.indexOf(t.a) + 1},${t.prop.keys.indexOf(t.b) + 1}]`).join("; ") + ` (${linear.length} linear tween(s); set in_type/out_type=bezier first if AE refuses)`);
    else pass("easing.no_linear_motion", `${motion.length} motion tweens, none linear`);
  }

  // ---- easing.entrance_decelerates
  {
    const notes: string[] = [];
    const bad: EE[] = [];
    let checked = 0;
    for (const e of ee) {
      if (e.holdOnly && e.cls === "opacity") { notes.push(`${lbl(e.layer)} appear (hold), no easing required`); continue; }
      if (!e.entrance) continue;
      checked++;
      const o = e.entrance.a.outInfluence;
      const i = e.entrance.b.inInfluence;
      if (o === null || i === null) continue;
      if (e.entrance.a.outInterp === "linear" && e.entrance.b.inInterp === "linear" && e.cls !== "opacity") { bad.push(e); continue; }
      if (o > i + 0.5) bad.push(e);
    }
    if (bad.length) fail("easing.entrance_decelerates", bad.slice(0, 6).map((e) => `${lbl(e.layer)} ${e.cls} out ${e.entrance?.a.outInfluence}% / in ${e.entrance?.b.inInfluence}% (ease-in shape)`).join("; "), bad.slice(0, 6).map((e) => `${lbl(e.layer)} ${e.cls}: ae_ease action=preset preset=${reg.eases.enter} keys=[${e.prop.keys.indexOf(e.entrance?.a as DumpKey) + 1},${e.prop.keys.indexOf(e.entrance?.b as DumpKey) + 1}] (or custom outInfluence 0.1-25, inInfluence 60-80)`).join("; "));
    else pass("easing.entrance_decelerates", `${checked} entrance tween(s) decelerate${notes.length ? `; ${notes.join("; ")}` : ""}`, notes.length ? "appear (hold), no easing required" : undefined);
  }

  // ---- easing.exit_accelerates
  {
    const exits = ee.filter((e) => e.exit);
    const bad = exits.filter((e) => {
      const o = (e.exit as Tween).a.outInfluence;
      const i = (e.exit as Tween).b.inInfluence;
      return o !== null && i !== null && o + 0.5 < i;
    });
    if (bad.length) fail("easing.exit_accelerates", bad.slice(0, 6).map((e) => `${lbl(e.layer)} ${e.cls} exit out ${(e.exit as Tween).a.outInfluence}% / in ${(e.exit as Tween).b.inInfluence}% (ease-out shape)`).join("; "), bad.slice(0, 6).map((e) => `${lbl(e.layer)} ${e.cls}: ae_ease action=preset preset=${reg.eases.exit} keys=[${e.prop.keys.indexOf((e.exit as Tween).a) + 1},${e.prop.keys.indexOf((e.exit as Tween).b) + 1}]`).join("; "));
    else pass("easing.exit_accelerates", exits.length ? `${exits.length} exit tween(s) accelerate` : "no exit tweens", exits.length ? undefined : "nothing to check");
  }

  // ---- easing.consistent_influences
  {
    const groups = new Map<string, Tween[]>();
    for (const t of allTweens) {
      if (t.cls === "other") continue;
      const key = `${t.prop.matchName}|${t.durationMs}`;
      const arr = groups.get(key) ?? [];
      arr.push(t);
      groups.set(key, arr);
    }
    const bad: string[] = [];
    const fixes: string[] = [];
    let compared = 0;
    for (const [, arr] of groups) {
      const byLayer = new Map<number, Tween>();
      for (const t of arr) if (!byLayer.has(t.layer.index)) byLayer.set(t.layer.index, t);
      if (byLayer.size < 2) continue;
      compared++;
      const list = [...byLayer.values()];
      const ref = list[0];
      const sig = (t: Tween) => `${Math.round((t.a.outInfluence ?? 0) * 10) / 10}/${Math.round((t.b.inInfluence ?? 0) * 10) / 10}`;
      const diff = list.filter((t) => Math.abs((t.a.outInfluence ?? 0) - (ref.a.outInfluence ?? 0)) > 1 || Math.abs((t.b.inInfluence ?? 0) - (ref.b.inInfluence ?? 0)) > 1);
      if (diff.length) {
        bad.push(`${propLabel(ref)} ${ref.durationMs} ms: ${list.map((t) => `${lbl(t.layer)} ${sig(t)}%`).join(" vs ")}`);
        fixes.push(`${diff.map((t) => lbl(t.layer)).join(", ")}: ae_ease action=custom custom={outInfluence:${ref.a.outInfluence},inInfluence:${ref.b.inInfluence}} to match ${lbl(ref.layer)}`);
      }
    }
    if (bad.length) fail("easing.consistent_influences", bad.slice(0, 4).join("; "), fixes.slice(0, 4).join("; "));
    else pass("easing.consistent_influences", compared ? `${compared} property/duration group(s) share influences across layers` : "no two layers share a property tween of equal duration", compared ? undefined : "nothing to compare");
  }

  // ---- choreography.stagger_in_band / choreography.sequence_cap
  {
    const deltas = dump.staggerDeltas?.length ? dump.staggerDeltas : finalizeDump({ ...dump }).staggerDeltas;
    const [lo, hi] = reg.stagger.perItemMs;
    const zero = deltas.filter((d, i) => i > 0 && d.deltaMs === 0);
    const out = deltas.filter((d, i) => i > 0 && d.deltaMs !== null && d.deltaMs !== 0 && (d.deltaMs < lo || d.deltaMs > hi));
    const mid = snapMs(Math.round((lo + hi) / 2), fps);
    if (out.length) fail("choreography.stagger_in_band", out.slice(0, 6).map((d) => `stagger ${d.deltaMs} ms before L${d.index} '${d.layer}'`).join("; ") + ` (band ${lo}-${hi} ms)`, out.slice(0, 6).map((d) => { const prev = deltas[deltas.indexOf(d) - 1]; return `stagger ${d.deltaMs} ms -> set ${mid} ms (${framesFor(mid, fps)} f) between L${prev.index} and L${d.index} (ae_keyframes action=offset on L${d.index} by ${((mid - (d.deltaMs ?? 0)) / 1000).toFixed(3)} s)`; }).join("; "));
    else if (deltas.length >= 2) pass("choreography.stagger_in_band", `${deltas.length - 1 - zero.length} non-zero delta(s) all within ${lo}-${hi} ms`);
    else pass("choreography.stagger_in_band", "single animated layer; no stagger", "not applicable");
    if (zero.length) defer("choreography.stagger_in_band", `${zero.length} pair(s) start simultaneously (delta 0 ms): ${zero.map((d) => `L${d.index} '${d.layer}'`).join(", ")} — confirm from the images that they are meant to move as one unit; else stagger ${mid} ms`);

    if (deltas.length >= 2) {
      const span = Math.round((deltas[deltas.length - 1].firstKeyT - deltas[0].firstKeyT) * 1000);
      if (span > reg.stagger.sequenceCapMs) fail("choreography.sequence_cap", `entrance sequence spans ${span} ms across ${deltas.length} layers (cap ${reg.stagger.sequenceCapMs} ms)`, `compress first-key spread to <= ${reg.stagger.sequenceCapMs} ms: stagger ${Math.floor(reg.stagger.sequenceCapMs / (deltas.length - 1))} ms per layer, or split into two beats`);
      else pass("choreography.sequence_cap", `entrance sequence spans ${span} ms <= ${reg.stagger.sequenceCapMs} ms`);
    } else pass("choreography.sequence_cap", "single animated layer; sequence is intentional", "not applicable");
  }

  // ---- spatial.no_pop_in
  {
    const scaleIn = ee.filter((e) => e.cls === "scale" && e.entrance);
    const bad: EE[] = [];
    const fromZero: EE[] = [];
    for (const e of scaleIn) {
      const from = e.entrance?.from ?? null;
      const to = e.entrance?.to ?? null;
      if (from === null || to === null || to <= 0) continue;
      if (from === 0) { fromZero.push(e); continue; }
      if (from < 0.9 * to) bad.push(e);
    }
    if (bad.length) fail("spatial.no_pop_in", bad.map((e) => `${lbl(e.layer)} scale ${e.entrance?.from} -> ${e.entrance?.to}`).join("; "), bad.map((e) => `${lbl(e.layer)}: start scale at ${Math.round((e.entrance?.to ?? 100) * reg.scaleFrom[0])}-${Math.round((e.entrance?.to ?? 100) * reg.scaleFrom[1])} (register scaleFrom ${reg.scaleFrom.join("-")})`).join("; "));
    else pass("spatial.no_pop_in", scaleIn.length ? `${scaleIn.length} scale entrance(s) start >= 0.9 x target` : "no scale entrances", scaleIn.length ? undefined : "nothing to check");
    if (fromZero.length) defer("spatial.no_pop_in", `${fromZero.map((e) => lbl(e.layer)).join(", ")} scale from exactly 0 — acceptable only as a spawn/cloning device; judge from the images`);
  }

  // ---- spatial.keys_in_range
  {
    const eps = 0.5 / fps;
    const off: string[] = [];
    for (const l of layers) for (const p of l.props) for (const k of p.keys) if (k.t < l.inPoint - eps || k.t > l.outPoint + eps) off.push(`${lbl(l)} ${p.name} @ ${fmtS(k.t)} outside [${fmtS(l.inPoint)}, ${fmtS(l.outPoint)}]`);
    if (off.length) fail("spatial.keys_in_range", `${off.length} key(s) outside layer range: ${off.slice(0, 5).join("; ")}`, "move the keys inside the layer (ae_keyframes action=offset) or extend the layer (ae_layer_update action=set_timing)");
    else pass("spatial.keys_in_range", `${totalKeys} keys inside their layers' in/out ranges`);
  }

  // ---- spatial.glow_not_zeroed
  {
    const bad: string[] = [];
    let glows = 0;
    for (const l of dump.layers) for (const g of l.glows ?? []) {
      glows++;
      for (const p of g.props) for (const k of p.keys) if (scalar(k.value) === 0 && /intens|opacity/i.test(p.name)) bad.push(`${lbl(l)} ${g.name} ${p.name} = 0 @ ${fmtS(k.t)}`);
    }
    if (bad.length) fail("spatial.glow_not_zeroed", bad.slice(0, 6).join("; "), "keep glow intensity/opacity >= 0.2 of its resting value and animate the layer's opacity for the fade instead (ae_keyframes action=set)");
    else pass("spatial.glow_not_zeroed", glows ? `${glows} glow effect(s), none animated to 0` : "no glow effects", glows ? undefined : "nothing to check");
  }

  // ---- non-auto items
  for (const r of RUBRIC) {
    if (r.auto) continue;
    if (r.id === "intent.nameable" && opts.intent) defer(r.id, `declared intent: ${opts.intent} — ${INTENTS[opts.intent]}; confirm every animated element serves it`);
    else defer(r.id);
  }

  return { register: reg.id, passed, failed, unverifiable };
}
