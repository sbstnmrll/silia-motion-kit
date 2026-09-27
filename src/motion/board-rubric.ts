/**
 * Storyboard rubric: the checks that run on the Figma board BEFORE anything is
 * built in After Effects.
 *
 * Why this exists. Everything else in this server judges motion that already
 * exists (src/motion/rubric.ts on the keyframe dump, verifyMedia on the render).
 * The only real delivery audit in the editorial repo,
 * projects/no-sabias-agente/AUDITORIA.md, found seven defects by watching the
 * finished MP4 - and every one of them was already present in the board and
 * cheap to see there. Each auto item below cites the finding it comes from, so a
 * threshold can be argued with by arguing with the measurement behind it.
 *
 * Shape deliberately mirrors src/motion/rubric.ts: atomic binary items, `auto`
 * items decided from numbers, the rest deferred to a vision pass, and every
 * failure carrying a numeric fix. The fixes here additionally name the Figma
 * node, so they can be applied with `use_figma` without further interpretation.
 */

import { legibilityCheck, type TextKind } from "./typography.js";
import {
  contrastRatio,
  composite,
  effectiveFill,
  requiredTextContrast,
  FIGURE_GROUND_MIN,
  type Rgb,
} from "./contrast.js";

// ---------------------------------------------------------------------------
// Inputs - the shape scripts/figma-dump.js emits
// ---------------------------------------------------------------------------

export interface BoardText {
  chars: string;
  font: string;
  size: number | "mixed";
  lineHeight: string;
  letterSpacing: string;
  align: string;
  alignV?: string;
  autoResize?: string;
  /** Glyphs the dump could not carry (emoji, symbols). Added 2026-09-20. */
  dropped?: number;
}

export interface BoardNode {
  z: number;
  type: string;
  name: string;
  /** Slash-joined ancestor names, for scoping content and skipping board chrome. */
  path?: string;
  depth?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fills?: string[] | "mixed";
  radius?: number | number[];
  effects?: string[];
  opacity?: number;
  visible?: boolean;
  /** absoluteRenderBounds relative to the frame: [x, y, w, h]. The real ink box. */
  rb?: [number, number, number, number] | null;
  text?: BoardText;
  /** Topmost solid fill painted behind this node (sibling below it, else the frame). */
  backdrop?: string[] | "mixed";
}

export interface BoardFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fills?: string[] | "mixed";
  children: BoardNode[];
}

export interface WordSpan {
  startSec: number;
  endSec: number;
  text: string;
}

export interface BoardReviewInput {
  frames: BoardFrame[];
  /** Normalised word timings. Without them the pacing and density items defer. */
  words?: WordSpan[];
  /** Explicit frameId -> anchor seconds. Overrides text matching. */
  anchors?: Record<string, number>;
  /** Length of the piece in seconds, for the tail gap. Defaults to the last word's end. */
  durationSec?: number;
  /** Width in points the viewer actually sees. 390 pt = iPhone feed, the delivery context. */
  viewportPt?: number;
  /** Which legibility band the board's copy belongs to. */
  textKind?: TextKind;
  /**
   * Name of the frame that holds the actual delivered picture. Real boards wrap
   * each shot in annotation chrome (a header with the shot id and its timecode)
   * around a `stage` frame that is the real 1080x1920. Measuring the chrome as if
   * it were the piece produces failures that mean nothing, so when a stage is
   * found the frame is re-scoped to it. Pass "" to measure the whole frame.
   */
  stageName?: string;
  /** Extra path fragments to skip, case-insensitive (board notes, legends). */
  ignorePaths?: string[];
}

// ---------------------------------------------------------------------------
// Thresholds, each with the measurement it came from
// ---------------------------------------------------------------------------

export const BOARD_RULES = {
  /**
   * Comfortable reading floor in apparent points at delivery size.
   * AUDITORIA.md section A measured it: 26 px in a 1080 frame = 9.4 pt on a
   * 390 pt phone, and the comfortable floor is about 11 pt.
   */
  minApparentPt: 11,
  /** Feed width on the phone the piece is watched on. Same source. */
  viewportPt: 390,
  /** Reading speed for prose on screen, words per minute. Same source. */
  readingWpm: 200,
  /**
   * Fraction of a node's ink box that must fall inside the frame before it reads
   * as an element rather than an accident. AUDITORIA.md finding 6: a rotated card
   * showing only two syllables and half an avatar did not read as a tilted card,
   * it read as a render error.
   */
  minVisibleFraction: 0.6,
  /**
   * Dead air before the first thing happens. AUDITORIA.md finding 2: the first
   * 1.9 s were empty, in the window that decides whether the viewer scrolls past;
   * the reference it lost to lands its first card inside 8 frames.
   */
  maxOpeningGapSec: 0.8,
  /**
   * Longest hold with nothing entering or moving. AUDITORIA.md finding 5: a 2.6 s
   * hold, 79 frames with nothing entering, called an eternity in vertical.
   */
  maxHoldSec: 1.5,
  /**
   * Gap between the last event and the cut. AUDITORIA.md finding 4 measured a
   * 0.27 s white hole before the cut: the exit ended before the clip did.
   */
  maxTailGapSec: 0.3,
  /** Rows on the board are grouped by y; this is the tolerance in px. */
  rowTolerancePx: 40,
  /** A node smaller than this share of the frame is not a "mass" for figure/ground. */
  minMassAreaFraction: 0.02,
  /**
   * Share of an element that may be covered by what is painted over it before it
   * stops reading as an element. Measured on the board of no-sabias-agente
   * (shot A2.6, 2026-09-20): the cards that read fine inside the fanned stack sit
   * at 36-52% covered, while the two that vanish sit at 98.7% and 99.9%. The cut
   * is put at 85%, between the two populations and far from both.
   * A deliberately stacked element will trip this; that is what the declared
   * deviation is for, and seeing the number is the point.
   */
  maxOccludedFraction: 0.85,
} as const;

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type BoardGroup =
  | "legibility"
  | "density"
  | "spatial"
  | "pacing"
  | "text"
  | "coverage"
  | "intent";

export interface BoardRubricItem {
  id: string;
  group: BoardGroup;
  check: string;
  auto: boolean;
  /** The measured defect this item exists to catch. */
  origin: string;
}

export const BOARD_RUBRIC: BoardRubricItem[] = [
  { id: "board.legibility.phone_size", group: "legibility", check: "Every text is at least 11 apparent points at delivery size.", auto: true, origin: "AUDITORIA.md A: 26 px @1080 = 9.4 pt, floor about 11 pt" },
  { id: "board.legibility.video_min_size", group: "legibility", check: "Every text meets the house minimum size for its frame height.", auto: true, origin: "house rule, src/motion/typography.ts" },
  { id: "board.legibility.contrast", group: "legibility", check: "Every text meets its WCAG contrast ratio against what is behind it.", auto: true, origin: "AUDITORIA.md 3, and nothing in this server measured contrast before" },
  { id: "board.legibility.figure_ground", group: "legibility", check: "Every mass (card, chip, container) separates from its ground.", auto: true, origin: "AUDITORIA.md 3: white cards on white read as one grey mass" },
  { id: "board.density.chars_per_line", group: "density", check: "No text exceeds its characters-per-line or line-count limit.", auto: true, origin: "Netflix TTSG / house rule via typography.ts" },
  { id: "board.density.cps", group: "density", check: "No text passes faster than its reading speed.", auto: true, origin: "Netflix TTSG 17 CPS, house 13 CPS" },
  { id: "board.density.reading_time", group: "density", check: "Every text stays on screen at least as long as it takes to read.", auto: true, origin: "AUDITORIA.md A: 4.5 s to read, 2.6 s on screen" },
  { id: "board.spatial.title_safe", group: "spatial", check: "Every text stays inside the title-safe area.", auto: true, origin: "SMPTE RP 218 / EBU R95, never applied to the board before" },
  { id: "board.spatial.not_clipped", group: "spatial", check: "Every element is at least 60% inside the frame.", auto: true, origin: "AUDITORIA.md 6: an element reading as a fragment reads as a render error" },
  { id: "board.spatial.not_occluded", group: "spatial", check: "No element is buried under what is painted over it.", auto: true, origin: "measured on the A2.6 stack: readable cards sit at 36-52% covered, vanished ones at 98.7% and 99.9%" },
  { id: "board.pacing.opening_gap", group: "pacing", check: "Something happens within the first 0.8 s.", auto: true, origin: "AUDITORIA.md 2: 1.9 s of empty opening" },
  { id: "board.pacing.max_hold", group: "pacing", check: "No hold longer than 1.5 s with nothing entering.", auto: true, origin: "AUDITORIA.md 5: a 2.6 s static hold" },
  { id: "board.pacing.tail_gap", group: "pacing", check: "The last event lands within 0.3 s of the end.", auto: true, origin: "AUDITORIA.md 4: 0.27 s white hole before the cut" },
  { id: "board.text.renderable_glyphs", group: "text", check: "No text relies on a glyph the pipeline cannot carry.", auto: true, origin: "AUDITORIA.md 7: the maple-leaf emoji rendered as a magenta blob" },
  { id: "board.coverage.rows_anchored", group: "coverage", check: "Every board step matches a point in the voice track.", auto: true, origin: "the plan transcribes anchors by hand and nothing checked them" },
  { id: "board.intent.reads_in_one_second", group: "intent", check: "Each shot's point is graspable in about a second at phone width.", auto: false, origin: "AUDITORIA.md A: too small to read and too long to skim" },
  { id: "board.intent.one_focal_point", group: "intent", check: "Each shot has one clear focal point.", auto: false, origin: "mirrors choreography.one_focal_motion in the motion rubric" },
];

export interface BoardFix {
  /** Figma node reference, "frameId#z" for a child the dump reports positionally. */
  node: string;
  nodeName: string;
  prop: string;
  from: string | number;
  to: string | number;
  why: string;
}

export interface BoardResult {
  id: string;
  check: string;
  observed: string;
  fix?: string;
  fixes?: BoardFix[];
  note?: string;
}

export interface BoardEvaluation {
  passed: BoardResult[];
  failed: BoardResult[];
  unverifiable: Array<{ id: string; check: string; note?: string }>;
  summary: {
    frames: number;
    rows: number;
    texts: number;
    anchored: number;
    passed: number;
    failed: number;
    deferred: number;
  };
  anchors: Array<{ frame: string; name: string; tSec: number | null; matchedBy: "explicit" | "name" | "text" | "none" }>;
}

// ---------------------------------------------------------------------------
// palabras.json - both formats found in the wild
// ---------------------------------------------------------------------------

/**
 * Normalises the two transcript shapes the editorial repo actually contains:
 *  - JSONL, one word per line, milliseconds: {"start":110,"end":360,"text":"ya"}
 *    (silia-university, agente-diferenciadores, the four demo-agente-voz videos)
 *  - faster-whisper segments, seconds: {duration, segments:[{start,end,text}]}
 *    (decir-no-se)
 * The unit is inferred and reported, never silently assumed.
 */
export function parseWords(raw: string): {
  words: WordSpan[];
  unit: "ms" | "s";
  shape: "jsonl" | "array" | "segments";
} {
  const trimmed = raw.trim();
  let rows: Array<{ start: number; end: number; text: string }> = [];
  let shape: "jsonl" | "array" | "segments";

  // JSONL also starts with "{", so the shape is decided by whether the WHOLE
  // text parses as one JSON value, not by its first character.
  let whole: any;
  try {
    whole = JSON.parse(trimmed);
  } catch {
    whole = undefined;
  }

  if (whole !== undefined && !Array.isArray(whole) && typeof whole === "object" && whole !== null) {
    if (!Array.isArray(whole.segments)) throw new Error("object transcript without a `segments` array");
    rows = whole.segments.map((s: any) => ({ start: Number(s.start), end: Number(s.end), text: String(s.text ?? "") }));
    shape = "segments";
  } else if (Array.isArray(whole)) {
    rows = whole.map((w: any) => ({ start: Number(w.start), end: Number(w.end), text: String(w.text ?? w.word ?? "") }));
    shape = "array";
  } else {
    rows = trimmed
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        const w = JSON.parse(l);
        return { start: Number(w.start), end: Number(w.end), text: String(w.text ?? w.word ?? "") };
      });
    shape = "jsonl";
  }

  if (!rows.length) return { words: [], unit: "s", shape };
  // Two signals, because neither is sufficient alone:
  //  - magnitude: a piece is tens of seconds long, so an end past 1000 is ms;
  //  - granularity: Whisper word timings in ms are whole numbers, while timings
  //    already in seconds carry decimals.
  // The one shape this would misread is a seconds-based transcript whose every
  // timing is a whole second, which no transcriber produces.
  const maxEnd = Math.max(...rows.map((r) => r.end));
  const allInt = rows.every((r) => Number.isInteger(r.start) && Number.isInteger(r.end));
  const unit: "ms" | "s" = shape === "segments" ? "s" : maxEnd > 1000 || (allInt && maxEnd > 100) ? "ms" : "s";
  const div = unit === "ms" ? 1000 : 1;
  return {
    words: rows.map((r) => ({ startSec: r.start / div, endSec: r.end / div, text: r.text.trim() })),
    unit,
    shape,
  };
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Anchors each board step to the voice track by matching its opening words,
 * scanning forward only (the board is in narrative order). Returns null for a
 * step it cannot place rather than guessing - an unplaced step defers its pacing
 * items instead of inventing a time.
 */
export function matchAnchors(
  steps: Array<{ id: string; text: string }>,
  words: WordSpan[],
): Array<{ id: string; tSec: number | null }> {
  const toks = words.map((w) => ({ t: w.startSec, n: norm(w.text) })).filter((w) => w.n.length > 0);
  let cursor = 0;
  return steps.map((step) => {
    const needle = norm(step.text).split(" ").filter(Boolean).slice(0, 3);
    if (!needle.length) return { id: step.id, tSec: null };
    for (let i = cursor; i <= toks.length - needle.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (toks[i + j].n !== needle[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        cursor = i + needle.length;
        return { id: step.id, tSec: toks[i].t };
      }
    }
    return { id: step.id, tSec: null };
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };

function ref(frame: BoardFrame, node: BoardNode): string {
  return `${frame.id}#${node.z}`;
}

function inkBox(node: BoardNode): [number, number, number, number] {
  return node.rb ?? [node.x, node.y, node.w, node.h];
}

function textNodes(frame: BoardFrame): BoardNode[] {
  return frame.children.filter((c) => c.visible !== false && c.text && String(c.text.chars).trim().length > 0);
}

/**
 * Real boards name each shot with its own timecode - "A1.2 · 0:00.5 · pregunta".
 * When they do, that is a better anchor than matching copy against the voice,
 * because it is what the author decided rather than what an algorithm inferred.
 */
export function anchorFromName(name: string): number | null {
  const m = /(\d{1,2}):(\d{2}(?:\.\d+)?)/.exec(name);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return Number.isFinite(sec) ? Math.round(sec * 1000) / 1000 : null;
}

/**
 * Re-scopes each frame to its `stage` child when there is one, and drops the
 * annotation chrome around it. Coordinates stay usable because `rb` is relative
 * to the dumped frame: everything is shifted by the stage origin.
 */
export function scopeToStage(frames: BoardFrame[], stageName = "stage", ignorePaths: string[] = []): BoardFrame[] {
  const skip = ignorePaths.map((s) => s.toLowerCase());
  return frames.map((f) => {
    const stage = f.children.find((c) => c.name.toLowerCase() === stageName.toLowerCase() && (c.depth ?? 0) === 0);
    if (!stageName || !stage || !stage.rb) {
      const kept = f.children.filter((c) => !skip.some((s) => (c.path ?? c.name).toLowerCase().includes(s)));
      return { ...f, children: kept };
    }
    const [sx, sy, sw, sh] = stage.rb;
    const prefix = `${stage.name}/`;
    const inside = f.children.filter(
      (c) => (c.path ?? "").startsWith(prefix) && !skip.some((s) => (c.path ?? c.name).toLowerCase().includes(s)),
    );
    return {
      ...f,
      w: sw,
      h: sh,
      fills: stage.fills ?? f.fills,
      children: inside.map((c) => ({
        ...c,
        x: c.x - sx,
        y: c.y - sy,
        rb: c.rb ? ([c.rb[0] - sx, c.rb[1] - sy, c.rb[2], c.rb[3]] as [number, number, number, number]) : c.rb,
      })),
    };
  });
}

/** Groups frames into board rows by y, then orders each row left to right. */
export function groupRows(frames: BoardFrame[]): BoardFrame[][] {
  const sorted = [...frames].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: BoardFrame[][] = [];
  for (const f of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - f.y) <= BOARD_RULES.rowTolerancePx);
    if (row) row.push(f);
    else rows.push([f]);
  }
  for (const r of rows) r.sort((a, b) => a.x - b.x);
  return rows;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export function evaluateBoard(input: BoardReviewInput): BoardEvaluation {
  const R = BOARD_RULES;
  const viewportPt = input.viewportPt ?? R.viewportPt;
  const kind: TextKind = input.textKind ?? "body";
  const passed: BoardResult[] = [];
  const failed: BoardResult[] = [];
  const unverifiable: BoardEvaluation["unverifiable"] = [];

  const item = (id: string) => BOARD_RUBRIC.find((r) => r.id === id) as BoardRubricItem;
  const pass = (id: string, observed: string, note?: string) =>
    passed.push({ id, check: item(id).check, observed, ...(note ? { note } : {}) });
  const fail = (id: string, observed: string, fix: string, fixes?: BoardFix[]) =>
    failed.push({ id, check: item(id).check, observed, fix, ...(fixes && fixes.length ? { fixes } : {}) });
  const defer = (id: string, note?: string) =>
    unverifiable.push({ id, check: item(id).check, ...(note ? { note } : {}) });

  const frames = scopeToStage(
    input.frames.filter((f) => f.w > 0 && f.h > 0),
    input.stageName ?? "stage",
    input.ignorePaths ?? ["shot-head", "shot-dur", "nota"],
  );
  const rows = groupRows(frames);
  const ordered = rows.flat();
  const allTexts = frames.flatMap((f) => textNodes(f).map((n) => ({ f, n })));

  // ---- anchors -------------------------------------------------------------
  const stepText = (f: BoardFrame) =>
    textNodes(f)
      .sort((a, b) => a.z - b.z)
      .map((n) => n.text!.chars)
      .join(" ");

  // Three sources, most authoritative first: what the caller stated, what the
  // board author wrote into the shot name, and only then inference from the copy.
  const matchedByText =
    input.words && input.words.length
      ? matchAnchors(ordered.map((f) => ({ id: f.id, text: stepText(f) })), input.words)
      : null;
  const anchors: BoardEvaluation["anchors"] = ordered.map((f, i) => {
    const explicit = input.anchors?.[f.id];
    if (typeof explicit === "number") return { frame: f.id, name: f.name, tSec: explicit, matchedBy: "explicit" as const };
    const named = anchorFromName(f.name);
    if (named !== null) return { frame: f.id, name: f.name, tSec: named, matchedBy: "name" as const };
    const byText = matchedByText?.[i].tSec ?? null;
    return { frame: f.id, name: f.name, tSec: byText, matchedBy: byText === null ? ("none" as const) : ("text" as const) };
  });
  const anchorOf = new Map(anchors.map((a) => [a.frame, a.tSec] as const));
  const placed = anchors.filter((a) => a.tSec !== null);
  const haveTiming = placed.length > 0;
  const endSec =
    input.durationSec ??
    (input.words && input.words.length ? Math.max(...input.words.map((w) => w.endSec)) : undefined);

  /** Seconds a step's content stays up: until the next placed step, else to the end. */
  function onScreenSec(frameId: string): number | null {
    const t = anchorOf.get(frameId);
    if (t === null || t === undefined) return null;
    const later = placed.filter((a) => (a.tSec as number) > t).map((a) => a.tSec as number);
    const next = later.length ? Math.min(...later) : endSec;
    if (next === undefined) return null;
    return Math.round((next - t) * 100) / 100;
  }

  // ---- board.legibility.phone_size ----------------------------------------
  {
    const bad: BoardFix[] = [];
    let smallest = Infinity;
    for (const { f, n } of allTexts) {
      const size = n.text!.size;
      if (typeof size !== "number") continue;
      const apparent = (size * viewportPt) / f.w;
      smallest = Math.min(smallest, apparent);
      if (apparent < R.minApparentPt) {
        const target = Math.ceil((R.minApparentPt * f.w) / viewportPt);
        bad.push({
          node: ref(f, n),
          nodeName: n.name,
          prop: "fontSize",
          from: size,
          to: target,
          why: `${apparent.toFixed(1)} pt aparentes a ${viewportPt} pt de ancho; piso ${R.minApparentPt} pt`,
        });
      }
    }
    if (bad.length)
      fail(
        "board.legibility.phone_size",
        `${bad.length} de ${allTexts.length} textos por debajo de ${R.minApparentPt} pt aparentes (el menor, ${smallest.toFixed(1)} pt)`,
        `subir cada uno al tamaño indicado (${bad.map((b) => `${b.nodeName}: ${b.from}->${b.to} px`).slice(0, 6).join("; ")})`,
        bad,
      );
    else if (allTexts.length)
      pass("board.legibility.phone_size", `${allTexts.length} textos, el menor ${smallest.toFixed(1)} pt aparentes >= ${R.minApparentPt} pt`);
    else defer("board.legibility.phone_size", "el board no tiene nodos de texto");
  }

  // ---- board.legibility.video_min_size / density / title_safe --------------
  // One legibilityCheck per text, its issues mapped onto the board items.
  {
    const buckets: Record<string, BoardFix[]> = {
      "board.legibility.video_min_size": [],
      "board.density.chars_per_line": [],
      "board.density.cps": [],
      "board.density.reading_time": [],
      "board.spatial.title_safe": [],
    };
    const observed: Record<string, string[]> = {
      "board.legibility.video_min_size": [],
      "board.density.chars_per_line": [],
      "board.density.cps": [],
      "board.density.reading_time": [],
      "board.spatial.title_safe": [],
    };
    const ruleToItem: Record<string, string> = {
      min_font_size: "board.legibility.video_min_size",
      max_chars_per_line: "board.density.chars_per_line",
      max_lines: "board.density.chars_per_line",
      reading_speed: "board.density.cps",
      reading_speed_hard_max: "board.density.cps",
      min_sec_per_word: "board.density.reading_time",
      hold_after_rest: "board.density.reading_time",
      caption_min_event: "board.density.reading_time",
      caption_max_event: "board.density.reading_time",
      title_safe: "board.spatial.title_safe",
    };

    let timedTexts = 0;
    for (const { f, n } of allTexts) {
      const size = n.text!.size;
      if (typeof size !== "number") continue;
      const secs = onScreenSec(f.id);
      if (secs !== null) timedTexts++;
      const res = legibilityCheck({
        text: n.text!.chars,
        fontSizePx: size,
        compW: f.w,
        compH: f.h,
        bbox: inkBox(n),
        ...(secs !== null && secs > 0 ? { onScreenSec: secs } : {}),
        kind,
      });
      for (const iss of res.issues) {
        const id = ruleToItem[iss.rule];
        if (!id) continue;
        observed[id].push(`${f.name}/${n.name}: ${iss.observed} (limite ${iss.limit})`);
        buckets[id].push({
          node: ref(f, n),
          nodeName: n.name,
          prop: iss.rule,
          from: iss.observed,
          to: iss.limit,
          why: iss.fix,
        });
      }
    }

    // Reading time at 200 wpm, the audit's own measure, on top of the guide floors.
    for (const f of frames) {
      const secs = onScreenSec(f.id);
      if (secs === null) continue;
      const words = norm(stepText(f)).split(" ").filter(Boolean).length;
      if (!words) continue;
      const need = Math.round((words / R.readingWpm) * 60 * 100) / 100;
      if (need > secs) {
        observed["board.density.reading_time"].push(`${f.name}: ${words} palabras necesitan ${need.toFixed(2)} s, en pantalla ${secs.toFixed(2)} s`);
        buckets["board.density.reading_time"].push({
          node: f.id,
          nodeName: f.name,
          prop: "onScreenSec",
          from: secs,
          to: need,
          why: `${words} palabras a ${R.readingWpm} wpm`,
        });
      }
    }

    for (const id of Object.keys(buckets)) {
      const fixes = buckets[id];
      const needsTiming = id === "board.density.cps" || id === "board.density.reading_time";
      if (fixes.length) {
        fail(id, `${fixes.length} incumplimientos: ${observed[id].slice(0, 5).join("; ")}${observed[id].length > 5 ? "; ..." : ""}`, fixes[0].why, fixes);
      } else if (needsTiming && !timedTexts) {
        defer(id, "sin anclas: no se sabe cuánto tiempo está cada texto en pantalla");
      } else {
        pass(id, `${allTexts.length} textos, ninguno lo incumple`);
      }
    }
  }

  // ---- board.legibility.contrast ------------------------------------------
  {
    const bad: BoardFix[] = [];
    const undecidable: string[] = [];
    let worst = Infinity;
    for (const { f, n } of allTexts) {
      const size = n.text!.size;
      const fg = effectiveFill(n.fills);
      const bg = effectiveFill(n.backdrop) ?? effectiveFill(f.fills);
      if (!fg || !bg) {
        undecidable.push(`${f.name}/${n.name}`);
        continue;
      }
      const ground = composite(bg, WHITE);
      const ratio = contrastRatio(composite(fg, ground), ground);
      worst = Math.min(worst, ratio);
      const apparent = typeof size === "number" ? (size * viewportPt) / f.w : 0;
      const need = requiredTextContrast(apparent);
      if (ratio < need) {
        const hex = (c: Rgb) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
        bad.push({
          node: ref(f, n),
          nodeName: n.name,
          prop: "fills",
          from: `${hex(fg)} sobre ${hex(ground)} = ${ratio}:1`,
          to: `ratio >= ${need}:1`,
          why: `contraste ${ratio}:1, hace falta ${need}:1 para ${apparent.toFixed(1)} pt aparentes`,
        });
      }
    }
    if (bad.length)
      fail(
        "board.legibility.contrast",
        `${bad.length} textos por debajo de su ratio (el peor ${worst === Infinity ? "n/d" : worst + ":1"})`,
        "oscurecer el texto o aclarar/oscurecer el fondo hasta alcanzar el ratio",
        bad,
      );
    else if (undecidable.length === allTexts.length && allTexts.length)
      defer("board.legibility.contrast", `ningún par texto/fondo es color sólido (${undecidable.slice(0, 4).join(", ")}): gradiente, imagen o mixed`);
    else pass("board.legibility.contrast", `${allTexts.length - undecidable.length} pares medidos, el peor ${worst === Infinity ? "n/d" : worst + ":1"}${undecidable.length ? `; ${undecidable.length} sin color sólido` : ""}`);
  }

  // ---- board.legibility.figure_ground -------------------------------------
  {
    const bad: BoardFix[] = [];
    let measured = 0;
    let worst = Infinity;
    for (const f of frames) {
      const ground = effectiveFill(f.fills);
      if (!ground) continue;
      const groundC = composite(ground, WHITE);
      const frameArea = f.w * f.h;
      for (const n of f.children) {
        if (n.visible === false || n.text) continue;
        const fill = effectiveFill(n.fills);
        if (!fill) continue;
        const [, , bw, bh] = inkBox(n);
        if ((bw * bh) / frameArea < R.minMassAreaFraction) continue;
        measured++;
        const ratio = contrastRatio(composite(fill, groundC), groundC);
        worst = Math.min(worst, ratio);
        if (ratio < FIGURE_GROUND_MIN) {
          bad.push({
            node: ref(f, n),
            nodeName: n.name,
            prop: "fills",
            from: Array.isArray(n.fills) ? n.fills.join(",") : String(n.fills),
            to: `ratio >= ${FIGURE_GROUND_MIN}:1 contra ${Array.isArray(f.fills) ? f.fills.join(",") : f.fills}`,
            why: `la masa contrasta ${ratio}:1 con su fondo; por debajo de ${FIGURE_GROUND_MIN}:1 lee como una mancha`,
          });
        }
      }
    }
    if (bad.length)
      fail("board.legibility.figure_ground", `${bad.length} de ${measured} masas por debajo de ${FIGURE_GROUND_MIN}:1 (la peor ${worst}:1)`, "cambiar el relleno de la masa o el del fondo", bad);
    else if (!measured) defer("board.legibility.figure_ground", "ninguna masa con relleno sólido por encima del 2% del cuadro");
    else pass("board.legibility.figure_ground", `${measured} masas, la peor ${worst}:1 >= ${FIGURE_GROUND_MIN}:1`);
  }

  // ---- board.spatial.not_clipped ------------------------------------------
  {
    const bad: BoardFix[] = [];
    for (const f of frames) {
      for (const n of f.children) {
        if (n.visible === false) continue;
        const [x, y, w, h] = inkBox(n);
        const area = w * h;
        if (area <= 0) continue;
        const ix = Math.max(0, Math.min(x + w, f.w) - Math.max(x, 0));
        const iy = Math.max(0, Math.min(y + h, f.h) - Math.max(y, 0));
        const frac = (ix * iy) / area;
        if (frac < R.minVisibleFraction) {
          bad.push({
            node: ref(f, n),
            nodeName: n.name,
            prop: "position",
            from: `[${Math.round(x)}, ${Math.round(y)}]`,
            to: `dentro del cuadro ${f.w}x${f.h}`,
            why: `solo el ${Math.round(frac * 100)}% de su caja de tinta está dentro; por debajo del ${Math.round(R.minVisibleFraction * 100)}% lee como error, no como elemento`,
          });
        }
      }
    }
    if (bad.length) fail("board.spatial.not_clipped", `${bad.length} elementos cortados por el borde`, "moverlos dentro del cuadro, o comprometer el gesto (que el recorte sea inconfundiblemente intencional)", bad);
    else pass("board.spatial.not_clipped", `todos los elementos al menos ${Math.round(R.minVisibleFraction * 100)}% dentro del cuadro`);
  }

  // ---- board.spatial.not_occluded -----------------------------------------
  // Lo que tapa a un elemento no es el marco, son las capas pintadas encima. El
  // defecto de la auditoría (una card que solo asoma como un sliver) no lo ve un
  // chequeo de recorte: hay que medir cobertura.
  {
    const bad: BoardFix[] = [];
    let measured = 0;
    let worst = 0;
    for (const f of frames) {
      const paintable = f.children.filter((n) => n.visible !== false && n.rb && (n.text || effectiveFill(n.fills)));
      for (let i = 0; i < paintable.length; i++) {
        const n = paintable[i];
        const [x, y, w, h] = inkBox(n);
        if (w <= 0 || h <= 0 || (w * h) / (f.w * f.h) < R.minMassAreaFraction) continue;
        // Solo tapan los que se pintan DESPUÉS y son opacos; los descendientes del
        // propio nodo van encima pero forman parte de él, no lo ocultan.
        const over = paintable.filter(
          (o) => o.z > n.z && !(o.path ?? "").startsWith((n.path ?? "") + "/") && effectiveFill(o.fills)?.a === 1,
        );
        if (!over.length) { measured++; continue; }
        measured++;
        const N = 60;
        let covered = 0;
        for (let a = 0; a < N; a++)
          for (let b = 0; b < N; b++) {
            const px = x + ((a + 0.5) * w) / N;
            const py = y + ((b + 0.5) * h) / N;
            for (const o of over) {
              const [ox, oy, ow, oh] = inkBox(o);
              if (px >= ox && px <= ox + ow && py >= oy && py <= oy + oh) { covered++; break; }
            }
          }
        const frac = covered / (N * N);
        worst = Math.max(worst, frac);
        if (frac > R.maxOccludedFraction) {
          bad.push({
            node: ref(f, n),
            nodeName: `${f.name} / ${n.name}`,
            prop: "z-order",
            from: `${Math.round(frac * 100)}% tapado`,
            to: `<= ${Math.round(R.maxOccludedFraction * 100)}%`,
            why: `queda ${Math.round((1 - frac) * 100)}% visible: no lee como elemento, lee como fragmento. Subirlo en el z-order, moverlo, o quitarlo de esta toma`,
          });
        }
      }
    }
    if (bad.length)
      fail(
        "board.spatial.not_occluded",
        `${bad.length} de ${measured} elementos tapados por encima del ${Math.round(R.maxOccludedFraction * 100)}% (el peor ${Math.round(worst * 100)}%)`,
        "subir en z-order, mover, o quitarlo de la toma; si la pila lo tapa a propósito, decláralo como desviación",
        bad,
      );
    else if (!measured) defer("board.spatial.not_occluded", "ningún elemento con relleno por encima del 2% del cuadro");
    else pass("board.spatial.not_occluded", `${measured} elementos, el más tapado al ${Math.round(worst * 100)}% <= ${Math.round(R.maxOccludedFraction * 100)}%`);
  }

  // ---- board.text.renderable_glyphs ---------------------------------------
  {
    const bad: BoardFix[] = [];
    let known = 0;
    for (const { f, n } of allTexts) {
      const d = n.text!.dropped;
      if (typeof d !== "number") continue;
      known++;
      if (d > 0) {
        bad.push({
          node: ref(f, n),
          nodeName: n.name,
          prop: "characters",
          from: `${d} glifos fuera de Latin`,
          to: "solo glifos que la fuente de marca tiene",
          why: "un glifo que la fuente no tiene se sustituye en el render; el emoji de la auditoría salió como una mancha magenta",
        });
      }
    }
    if (bad.length) fail("board.text.renderable_glyphs", `${bad.length} textos con glifos no representables`, "quitar el glifo o sustituirlo por un elemento gráfico de marca", bad);
    else if (!known) defer("board.text.renderable_glyphs", "el volcado no trae el contador `dropped` (script de volcado anterior a 2026-09-20)");
    else pass("board.text.renderable_glyphs", `${known} textos, ningún glifo perdido`);
  }

  // ---- board.coverage.rows_anchored ---------------------------------------
  {
    if (!input.words?.length && !input.anchors) {
      defer("board.coverage.rows_anchored", "sin palabras.json ni anclas explícitas");
    } else {
      const missing = anchors.filter((a) => a.tSec === null);
      if (missing.length)
        fail(
          "board.coverage.rows_anchored",
          `${missing.length} de ${anchors.length} pasos sin ancla: ${missing.slice(0, 6).map((m) => m.name).join(", ")}`,
          "el texto del paso no aparece literal en la voz: corregir el copy del board para que coincida, o dar el ancla a mano en `anchors`",
        );
      else pass("board.coverage.rows_anchored", `${anchors.length} pasos, todos anclados a la voz`);
    }
  }

  // ---- pacing --------------------------------------------------------------
  {
    const ts = placed.map((a) => a.tSec as number).sort((x, y) => x - y);
    if (!haveTiming) {
      defer("board.pacing.opening_gap", "sin anclas");
      defer("board.pacing.max_hold", "sin anclas");
      defer("board.pacing.tail_gap", "sin anclas");
    } else {
      const first = ts[0];
      if (first > R.maxOpeningGapSec)
        fail("board.pacing.opening_gap", `el primer evento entra en ${first.toFixed(2)} s`, `adelantarlo a <= ${R.maxOpeningGapSec} s, o meter algo antes: son ${first.toFixed(2)} s en la ventana que decide el scroll`);
      else pass("board.pacing.opening_gap", `primer evento en ${first.toFixed(2)} s <= ${R.maxOpeningGapSec} s`);

      let worstGap = 0;
      let worstAt = 0;
      for (let i = 1; i < ts.length; i++) {
        const g = ts[i] - ts[i - 1];
        if (g > worstGap) { worstGap = g; worstAt = ts[i - 1]; }
      }
      if (worstGap > R.maxHoldSec)
        fail("board.pacing.max_hold", `hueco de ${worstGap.toFixed(2)} s a partir de ${worstAt.toFixed(2)} s`, `partir el hueco con un evento, o acortar la pieza: nada entra durante ${worstGap.toFixed(2)} s (limite ${R.maxHoldSec} s)`);
      else pass("board.pacing.max_hold", `hueco mayor ${worstGap.toFixed(2)} s <= ${R.maxHoldSec} s`);

      if (endSec === undefined) {
        defer("board.pacing.tail_gap", "no se conoce la duración de la pieza (`durationSec`)");
      } else {
        const tail = endSec - ts[ts.length - 1];
        if (tail > R.maxTailGapSec)
          fail("board.pacing.tail_gap", `${tail.toFixed(2)} s entre el último evento (${ts[ts.length - 1].toFixed(2)} s) y el final (${endSec.toFixed(2)} s)`, `llevar la salida hasta el corte, o acortar la pieza a ${(ts[ts.length - 1] + R.maxTailGapSec).toFixed(2)} s`);
        else pass("board.pacing.tail_gap", `cola de ${tail.toFixed(2)} s <= ${R.maxTailGapSec} s`);
      }
    }
  }

  // ---- vision items --------------------------------------------------------
  for (const it of BOARD_RUBRIC.filter((r) => !r.auto)) {
    defer(it.id, "se juzga mirando el board a ancho de teléfono, no con números");
  }

  return {
    passed,
    failed,
    unverifiable,
    summary: {
      frames: frames.length,
      rows: rows.length,
      texts: allTexts.length,
      anchored: placed.length,
      passed: passed.length,
      failed: failed.length,
      deferred: unverifiable.length,
    },
    anchors,
  };
}
