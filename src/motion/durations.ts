/**
 * Duration scales across design systems (facts, with attribution) plus a
 * distance-aware duration heuristic for the two motion registers.
 */
import { REGISTERS, type Register } from "./taxonomy.js";

export interface DurationScale {
  source: string;
  license: string;
  attribution?: string;
  /** Token name -> ms, or [min, max] ms for bands. */
  tokens: Record<string, number | [number, number]>;
  note?: string;
}

export const DURATION_SCALES: Record<string, DurationScale> = {
  carbon: {
    source: "IBM Carbon Design System — motion duration tokens",
    license: "Apache-2.0",
    tokens: { "fast-01": 70, "fast-02": 110, "moderate-01": 150, "moderate-02": 240, "slow-01": 400, "slow-02": 700 },
    note: "fast: micro-interactions (hover, toggles); moderate: small expansions, tooltips; slow: large expansions, page-level transitions.",
  },
  material3: {
    source: "Material 3 — md.sys.motion.duration",
    license: "CC BY 4.0",
    attribution: "Material Design, Google",
    tokens: { short: [50, 200], medium: [250, 400], long: [450, 600], "extra-long": [700, 1000] },
    note: "Each band has four steps (short1..short4 = 50/100/150/200, medium1..4 = 250/300/350/400, long1..4 = 450/500/550/600, extra-long1..4 = 700/800/900/1000).",
  },
  fluent2: {
    source: "Microsoft Fluent 2 — motion durations",
    license: "numbers only",
    tokens: { ultraFast: 50, faster: 100, fast: 150, normal: 200, gentle: 250, slow: 300, slower: 400, ultraSlow: 500 },
  },
  atlassian: {
    source: "Atlassian Design System — motion",
    license: "numbers only",
    tokens: { interactions: [50, 150], transitions: [150, 400] },
    note: "Small interactions (hover, press) 50–150 ms; entrances, exits and moves 150–400 ms.",
  },
  val_head: {
    source: "Val Head, \"How fast should your UI animations be?\" (valhead.com)",
    license: "cited prose; numbers only",
    tokens: { band: [200, 500], reads_instant: 100, perceive: 230 },
    note: "200–500 ms is the useful band for UI; ~100 ms reads as instant; about 230 ms is needed to perceive motion consciously.",
  },
  silia: {
    source: "Silia motion tokens (SILIA_DURATIONS, seconds*1000)",
    license: "house",
    tokens: { xs: 160, sm: 200, md: 320, lg: 500, xl: 850 },
  },
};

export interface DurationResult {
  /** Final duration in ms (frame-snapped when fps is given). */
  ms: number;
  /** Whole frames when fps is given. */
  frames?: number;
  /** The raw formula output before clamping/snapping. */
  rawMs: number;
  /** The band the value was clamped to. */
  band: [number, number];
  register: Register;
  formula: string;
}

/** Distance-aware band per register: functional_ui standard..large (150–400), product_video standard..hero (300–900). */
export function distanceBand(register: Register): [number, number] {
  if (register === "functional_ui") return [150, 400];
  const r = REGISTERS.product_video.durations;
  return [r.standard[0], r.hero ? r.hero[1] : r.large[1]];
}

export const DISTANCE_FORMULA = "durationMs = 300 * sqrt(distancePx / 200), clamped to the register band, snapped to whole frames (synthesised from Carbon's described non-linearity: duration grows with distance but sub-linearly)";

/**
 * Duration for a move of `distancePx`: 300·sqrt(d/200) ms, clamped to the register's
 * band, then snapped to whole frames when fps is given.
 */
export function durationFor(distancePx: number, register: Register = "product_video", fps?: number): DurationResult {
  const d = Math.max(0, Number(distancePx) || 0);
  const raw = 300 * Math.sqrt(d / 200);
  const band = distanceBand(register);
  let ms = Math.min(band[1], Math.max(band[0], raw));
  let frames: number | undefined;
  if (fps && fps > 0) {
    frames = Math.max(1, Math.round((ms / 1000) * fps));
    ms = Math.round((frames / fps) * 1000);
  }
  return { ms: Math.round(ms), frames, rawMs: Math.round(raw), band, register, formula: DISTANCE_FORMULA };
}

/** Snap milliseconds to whole frames. */
export function snapToFrames(ms: number, fps: number): { ms: number; frames: number } {
  const frames = Math.max(1, Math.round((ms / 1000) * fps));
  return { ms: Math.round((frames / fps) * 1000), frames };
}

/** Distance→duration table for resources. */
export function distanceDurationTable(distances: number[] = [50, 100, 200, 400, 800, 1200], fps = 30) {
  return distances.map((px) => ({
    distancePx: px,
    functional_ui: durationFor(px, "functional_ui", fps),
    product_video: durationFor(px, "product_video", fps),
  }));
}

export const DURATION_ATTRIBUTION = [
  "IBM Carbon Design System motion tokens — Apache-2.0",
  "Material 3 motion duration tokens — CC BY 4.0, Material Design, Google",
  "Fluent 2 and Atlassian durations — numeric values only",
  "Val Head, 'How fast should your UI animations be?' — cited",
];
