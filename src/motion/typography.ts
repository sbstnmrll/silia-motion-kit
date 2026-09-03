/**
 * Legibility rules for text in motion (body copy, captions, titles).
 *
 * Numbers are quoted from public style guides; the check logic is ours.
 * - Netflix Timed Text Style Guide: 42 characters per line, max 2 lines, 17 CPS adult
 *   (20 hard max), minimum event duration 5/6 s, maximum 7 s.
 * - BBC Subtitle Guidelines: ~0.3 s per word floor for reading; 2 lines preferred.
 * - Broadcast safe areas (SMPTE RP 218 / EBU R95 practice): title-safe 80% (10% inset
 *   per edge), action-safe 90% (5% inset per edge).
 * - Body copy minimums are a house rule: 40 px at 1080-height, scaled by comp height;
 *   ~13 CPS reading speed and ~1 s hold per 13 characters after the text comes to rest.
 * - Caption minimum size 28 px at 1080 is the Silia type scale (src/silia/tokens.ts).
 */

export type TextKind = "body" | "caption" | "title";

export const LEGIBILITY_RULES = {
  /** Minimum font size in px at a 1080 px tall comp; scale by compH / 1080. */
  minFontPx1080: { body: 40, caption: 28, title: 40 } as Record<TextKind, number>,
  maxCharsPerLine: { body: 30, caption: 42, title: 30 } as Record<TextKind, number>,
  maxLines: { body: 3, caption: 2, title: 3 } as Record<TextKind, number>,
  /** Characters per second (spaces included). */
  readingCps: { body: 13, caption: 17, title: 13 } as Record<TextKind, number>,
  readingCpsHardMax: 20,
  /** Body/title: hold at least 1 s per 13 characters once at rest. */
  holdSecPerChars: { sec: 1, chars: 13 },
  /** BBC floor: 0.3 s per word. */
  minSecPerWord: 0.3,
  /** Caption event duration bounds (Netflix). */
  captionEvent: { minSec: 5 / 6, maxSec: 7 },
  titleSafe: 0.8,
  actionSafe: 0.9,
  sources: [
    "Netflix Timed Text Style Guide (42 chars/line, 2 lines, 17 CPS adult / 20 max, 5/6 s min, 7 s max)",
    "BBC Subtitle Guidelines (0.3 s per word floor)",
    "SMPTE RP 218 / EBU R95 safe areas (title 80%, action 90%)",
    "Silia house rule: body >= 40 px @1080, 13 CPS, hold 1 s per 13 chars",
    "Silia type scale: caption 28 px @1080 (src/silia/tokens.ts)",
  ],
} as const;

export interface SafeArea {
  insetX: number;
  insetY: number;
  /** [x, y, w, h] in px. */
  box: [number, number, number, number];
}

export function safeAreas(width: number, height: number): { title: SafeArea; action: SafeArea } {
  const mk = (frac: number): SafeArea => {
    const insetX = Math.round((width * (1 - frac)) / 2);
    const insetY = Math.round((height * (1 - frac)) / 2);
    return { insetX, insetY, box: [insetX, insetY, width - 2 * insetX, height - 2 * insetY] };
  };
  return { title: mk(LEGIBILITY_RULES.titleSafe), action: mk(LEGIBILITY_RULES.actionSafe) };
}

export interface LegibilityInput {
  text: string;
  fontSizePx: number;
  compW: number;
  compH: number;
  /** Explicit lines, or a line count (box text wraps without newline characters). */
  lines?: string[] | number;
  /** [x, y, w, h] of the rendered text in comp px (for the title-safe check). */
  bbox?: [number, number, number, number];
  /** Seconds the text is on screen at rest. */
  onScreenSec?: number;
  kind: TextKind;
}

export interface LegibilityIssue {
  rule: string;
  observed: string;
  limit: string;
  fix: string;
}

export interface LegibilityResult {
  pass: boolean;
  kind: TextKind;
  issues: LegibilityIssue[];
  metrics: { chars: number; words: number; lines: number; maxLineChars: number; cps: number | null; minFontPx: number };
  safe: { title: SafeArea; action: SafeArea };
}

function splitLines(text: string, lines?: string[] | number): string[] {
  if (Array.isArray(lines)) return lines;
  const explicit = text.split(/\r\n|\r|\n/).filter((l) => l.length > 0);
  if (typeof lines === "number" && lines > explicit.length) {
    // Box text wrapped visually: distribute the characters evenly to estimate per-line length.
    const per = Math.ceil(text.replace(/\r\n|\r|\n/g, " ").length / lines);
    const flat = text.replace(/\r\n|\r|\n/g, " ");
    const out: string[] = [];
    for (let i = 0; i < flat.length; i += per) out.push(flat.slice(i, i + per));
    return out.length ? out : [""];
  }
  return explicit.length ? explicit : [""];
}

export function legibilityCheck(input: LegibilityInput): LegibilityResult {
  const R = LEGIBILITY_RULES;
  const kind = input.kind;
  const issues: LegibilityIssue[] = [];
  const scale = input.compH / 1080;
  const minFontPx = Math.round(R.minFontPx1080[kind] * scale);
  const lines = splitLines(input.text, input.lines);
  const chars = input.text.replace(/\r\n|\r|\n/g, " ").trim().length;
  const words = input.text.split(/\s+/).filter(Boolean).length;
  const maxLineChars = Math.max(...lines.map((l) => l.length));
  const safe = safeAreas(input.compW, input.compH);

  if (input.fontSizePx < minFontPx) issues.push({ rule: "min_font_size", observed: `${Math.round(input.fontSizePx)} px`, limit: `>= ${minFontPx} px (${R.minFontPx1080[kind]} @1080 x ${scale.toFixed(2)})`, fix: `set size ${minFontPx} px (ae_text action=set size=${minFontPx})` });
  if (maxLineChars > R.maxCharsPerLine[kind]) issues.push({ rule: "max_chars_per_line", observed: `${maxLineChars} chars on the longest line`, limit: `<= ${R.maxCharsPerLine[kind]}`, fix: `break into ${Math.ceil(chars / R.maxCharsPerLine[kind])} lines or shorten by ${maxLineChars - R.maxCharsPerLine[kind]} chars` });
  if (lines.length > R.maxLines[kind]) issues.push({ rule: "max_lines", observed: `${lines.length} lines`, limit: `<= ${R.maxLines[kind]}`, fix: `split into ${Math.ceil(lines.length / R.maxLines[kind])} events or widen the box` });

  let cps: number | null = null;
  if (typeof input.onScreenSec === "number" && input.onScreenSec > 0) {
    cps = Math.round((chars / input.onScreenSec) * 10) / 10;
    const limit = R.readingCps[kind];
    if (cps > R.readingCpsHardMax) issues.push({ rule: "reading_speed_hard_max", observed: `${cps} CPS`, limit: `<= ${R.readingCpsHardMax} CPS`, fix: `hold >= ${(chars / R.readingCpsHardMax).toFixed(2)} s (now ${input.onScreenSec.toFixed(2)} s)` });
    else if (cps > limit) issues.push({ rule: "reading_speed", observed: `${cps} CPS`, limit: `<= ${limit} CPS (${kind})`, fix: `hold >= ${(chars / limit).toFixed(2)} s (now ${input.onScreenSec.toFixed(2)} s)` });
    const wordFloor = words * R.minSecPerWord;
    if (input.onScreenSec < wordFloor) issues.push({ rule: "min_sec_per_word", observed: `${input.onScreenSec.toFixed(2)} s for ${words} words`, limit: `>= ${wordFloor.toFixed(2)} s (0.3 s/word)`, fix: `hold >= ${wordFloor.toFixed(2)} s` });
    if (kind === "caption") {
      if (input.onScreenSec < R.captionEvent.minSec) issues.push({ rule: "caption_min_event", observed: `${input.onScreenSec.toFixed(2)} s`, limit: `>= ${R.captionEvent.minSec.toFixed(3)} s`, fix: `extend to ${R.captionEvent.minSec.toFixed(2)} s` });
      if (input.onScreenSec > R.captionEvent.maxSec) issues.push({ rule: "caption_max_event", observed: `${input.onScreenSec.toFixed(2)} s`, limit: `<= ${R.captionEvent.maxSec} s`, fix: `split the event at ${R.captionEvent.maxSec} s` });
    } else {
      const holdFloor = (chars / R.holdSecPerChars.chars) * R.holdSecPerChars.sec;
      if (input.onScreenSec < holdFloor) issues.push({ rule: "hold_after_rest", observed: `${input.onScreenSec.toFixed(2)} s for ${chars} chars`, limit: `>= ${holdFloor.toFixed(2)} s (1 s per 13 chars)`, fix: `hold >= ${holdFloor.toFixed(2)} s` });
    }
  }

  if (input.bbox) {
    const [x, y, w, h] = input.bbox;
    const [sx, sy, sw, sh] = safe.title.box;
    const over: string[] = [];
    if (x < sx) over.push(`left by ${Math.round(sx - x)} px`);
    if (y < sy) over.push(`top by ${Math.round(sy - y)} px`);
    if (x + w > sx + sw) over.push(`right by ${Math.round(x + w - (sx + sw))} px`);
    if (y + h > sy + sh) over.push(`bottom by ${Math.round(y + h - (sy + sh))} px`);
    if (over.length) issues.push({ rule: "title_safe", observed: `text box [${input.bbox.map(Math.round).join(",")}] exceeds title-safe ${over.join(", ")}`, limit: `inside [${safe.title.box.join(",")}]`, fix: `move/shrink so the box stays inside x ${sx}-${sx + sw}, y ${sy}-${sy + sh}` });
  }

  return { pass: issues.length === 0, kind, issues, metrics: { chars, words, lines: lines.length, maxLineChars, cps, minFontPx }, safe };
}
