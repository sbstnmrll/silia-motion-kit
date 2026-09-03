/**
 * Transcript normaliser for silia_captions. Accepts the two shapes in the workspace:
 *  - Whisper word-level JSON / JSONL: {"start": 230, "end": 650, "text": "Hola,"} in MILLISECONDS
 *    (editorial/projects/demo-agente-voz/<n>/work/audio/palabras.json), or the same in seconds.
 *  - TURNS_TIMED = [{who, start, end, words: [{w, t}]}] in SECONDS (turns-timed.js).
 * Output: seconds everywhere, words grouped into turns.
 */
import { readFileSync } from "node:fs";

export interface Word {
  w: string;
  start: number;
  end: number;
}

export interface Turn {
  speaker: string;
  start: number;
  end: number;
  words: Word[];
}

export interface Transcript {
  format: "whisper_ms" | "whisper_s" | "turns_timed" | "words_json";
  turns: Turn[];
  wordCount: number;
  duration: number;
  speakers: string[];
}

function parseLoose(text: string): unknown {
  const trimmed = text.trim();
  // turns-timed.js: `const TURNS_TIMED = [...]` or `module.exports = [...]`
  const m = /(?:TURNS_TIMED\s*=|module\.exports\s*=|export\s+default)\s*(\[[\s\S]*\])\s*;?\s*$/.exec(trimmed);
  if (m) return JSON.parse(m[1].replace(/,(\s*[}\]])/g, "$1").replace(/(['"])?([a-zA-Z_]\w*)\1\s*:/g, '"$2":').replace(/'/g, '"'));
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // JSONL
    }
  }
  return trimmed
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

export function normaliseTranscript(input: unknown, options: { gapSec?: number; defaultSpeaker?: string } = {}): Transcript {
  const gap = options.gapSec ?? 1.2;
  const speaker = options.defaultSpeaker ?? "voz";
  let data: unknown = input;
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.words)) data = o.words;
    else if (Array.isArray(o.segments)) data = (o.segments as Array<Record<string, unknown>>).flatMap((s) => (Array.isArray(s.words) ? s.words : [s]));
    else if (Array.isArray(o.turns)) data = o.turns;
  }
  if (!Array.isArray(data) || data.length === 0) throw new Error("Transcript has no words");
  const first = data[0] as Record<string, unknown>;

  // TURNS_TIMED
  if (Array.isArray(first.words) && (first.who !== undefined || first.speaker !== undefined)) {
    const turns: Turn[] = (data as Array<Record<string, unknown>>).map((t) => {
      const words = (t.words as Array<Record<string, unknown>>).map((w, i, arr) => {
        const start = Number(w.t ?? w.start);
        const next = arr[i + 1] ? Number((arr[i + 1] as Record<string, unknown>).t ?? (arr[i + 1] as Record<string, unknown>).start) : Number(t.end ?? start + 0.3);
        return { w: String(w.w ?? w.text ?? "").trim(), start, end: Number(w.end ?? Math.min(next, start + 0.6)) };
      });
      return { speaker: String(t.who ?? t.speaker ?? speaker), start: Number(t.start ?? words[0]?.start ?? 0), end: Number(t.end ?? words[words.length - 1]?.end ?? 0), words };
    });
    return finish("turns_timed", turns);
  }

  // Flat words: detect ms vs s by magnitude.
  const rows = (data as Array<Record<string, unknown>>).map((r) => ({ text: String(r.text ?? r.word ?? r.w ?? "").trim(), start: Number(r.start ?? r.t), end: Number(r.end ?? r.start ?? r.t), speaker: r.speaker !== undefined ? String(r.speaker) : undefined })).filter((r) => r.text);
  const maxEnd = Math.max(...rows.map((r) => r.end));
  // A spoken word never lasts > 5 s; if the median (end-start) does, the numbers are milliseconds.
  const durations = rows.map((r) => r.end - r.start).filter((d) => d > 0).sort((x, y) => x - y);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const ms = median > 5 || maxEnd > 3600 * 2;
  const scale = ms ? 1 / 1000 : 1;
  const words: Array<Word & { speaker?: string }> = rows.map((r) => ({ w: r.text, start: r.start * scale, end: r.end * scale, speaker: r.speaker }));
  const turns: Turn[] = [];
  for (const w of words) {
    const cur = turns[turns.length - 1];
    const sp = w.speaker ?? speaker;
    if (!cur || cur.speaker !== sp || w.start - cur.end > gap) turns.push({ speaker: sp, start: w.start, end: w.end, words: [{ w: w.w, start: w.start, end: w.end }] });
    else {
      cur.words.push({ w: w.w, start: w.start, end: w.end });
      cur.end = Math.max(cur.end, w.end);
    }
  }
  return finish(ms ? "whisper_ms" : "whisper_s", turns);
}

function finish(format: Transcript["format"], turns: Turn[]): Transcript {
  const wordCount = turns.reduce((n, t) => n + t.words.length, 0);
  const duration = Math.max(0, ...turns.map((t) => t.end));
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  return { format, turns, wordCount, duration, speakers };
}

export function loadTranscript(path: string, options?: { gapSec?: number; defaultSpeaker?: string }): Transcript {
  const text = readFileSync(path, "utf-8").replace(/^﻿/, "");
  return normaliseTranscript(parseLoose(text), options);
}

/** Consecutive turns whose spans overlap (their sync-QA criterion is zero overlaps). */
export function findOverlaps(t: Transcript): Array<{ a: number; b: number; overlapSec: number }> {
  const out: Array<{ a: number; b: number; overlapSec: number }> = [];
  for (let i = 1; i < t.turns.length; i++) {
    const prev = t.turns[i - 1];
    const cur = t.turns[i];
    if (cur.start < prev.end) out.push({ a: i - 1, b: i, overlapSec: Math.round((prev.end - cur.start) * 1000) / 1000 });
  }
  return out;
}
