import { describe, expect, it } from "vitest";
import { findOverlaps, normaliseTranscript } from "../../src/silia/transcript.js";

describe("normaliseTranscript", () => {
  it("detects Whisper word JSON in milliseconds and groups into one turn", () => {
    const words = ["Hola", "soy", "Silia"].map((w, i) => ({ start: 400 + i * 420, end: 400 + i * 420 + 350, text: w }));
    const t = normaliseTranscript(words);
    expect(t.format).toBe("whisper_ms");
    expect(t.turns).toHaveLength(1);
    expect(t.turns[0].words[0]).toEqual({ w: "Hola", start: 0.4, end: 0.75 });
    expect(t.wordCount).toBe(3);
    expect(t.duration).toBeCloseTo(1.59, 2);
  });

  it("keeps seconds when word durations are plausible and splits turns on gaps", () => {
    const words = [
      { start: 0.2, end: 0.5, text: "Hola" },
      { start: 0.6, end: 0.9, text: "mundo" },
      { start: 3.0, end: 3.3, text: "Adiós" },
    ];
    const t = normaliseTranscript(words, { gapSec: 1.2 });
    expect(t.format).toBe("whisper_s");
    expect(t.turns.map((x) => x.words.map((w) => w.w).join(" "))).toEqual(["Hola mundo", "Adiós"]);
  });

  it("accepts TURNS_TIMED shape with speakers and flags overlaps", () => {
    const turns = [
      { who: "agente", start: 0, end: 2.0, words: [{ w: "Hola", t: 0.1 }, { w: "qué", t: 0.6 }, { w: "tal", t: 1.0 }] },
      { who: "cliente", start: 1.8, end: 3.0, words: [{ w: "Bien", t: 1.9 }] },
    ];
    const t = normaliseTranscript(turns);
    expect(t.format).toBe("turns_timed");
    expect(t.speakers).toEqual(["agente", "cliente"]);
    expect(t.turns[0].words[0].w).toBe("Hola");
    expect(findOverlaps(t)).toEqual([{ a: 0, b: 1, overlapSec: 0.2 }]);
  });

  it("unwraps {words:[...]} and {segments:[{words}]} containers", () => {
    const t = normaliseTranscript({ segments: [{ words: [{ start: 0.1, end: 0.3, word: "a" }, { start: 0.4, end: 0.6, word: "b" }] }] });
    expect(t.wordCount).toBe(2);
    expect(() => normaliseTranscript([])).toThrow(/no words/);
  });
});
