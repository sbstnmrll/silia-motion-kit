import { describe, it, expect } from "vitest";
import {
  evaluateBoard,
  parseWords,
  matchAnchors,
  groupRows,
  BOARD_RUBRIC,
  BOARD_RULES,
  type BoardFrame,
} from "../../src/motion/board-rubric.js";
import { contrastRatio, parseFill, effectiveFill, composite, requiredTextContrast } from "../../src/motion/contrast.js";

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

describe("contrast", () => {
  it("matches the WCAG anchors", () => {
    expect(contrastRatio(BLACK, WHITE)).toBe(21);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
    // #767676 on white is the canonical 4.5:1 boundary colour.
    expect(contrastRatio(parseFill("#767676")!, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseFill("#777777")!, WHITE)).toBeLessThan(4.5);
  });

  it("parses the dump's colour strings, including the opacity suffix", () => {
    expect(parseFill("#DEFF38")).toEqual({ r: 222, g: 255, b: 56, a: 1 });
    expect(parseFill("#000000@10")).toEqual({ r: 0, g: 0, b: 0, a: 0.1 });
    expect(parseFill("GRADIENT_LINEAR")).toBeNull();
    expect(parseFill("mixed")).toBeNull();
    expect(effectiveFill(["#111111", "#222222"])).toEqual({ r: 34, g: 34, b: 34, a: 1 });
    expect(effectiveFill("mixed")).toBeNull();
  });

  it("composites a translucent fill before judging it", () => {
    // A 10% black border on white is the audit's grey mass: nearly no contrast.
    const composited = composite(parseFill("#000000@10")!, WHITE);
    expect(contrastRatio(composited, WHITE)).toBeLessThan(BOARD_RULES.minVisibleFraction + 1);
  });

  it("asks less of large text, as WCAG does", () => {
    expect(requiredTextContrast(9)).toBe(4.5);
    expect(requiredTextContrast(24)).toBe(3);
  });
});

describe("parseWords", () => {
  it("reads the JSONL-in-milliseconds shape used by most projects", () => {
    const raw = ['{"start":110,"end":360,"text":"ya"}', '{"start":360,"end":900,"text":"sabes"}'].join("\n");
    const { words, unit, shape } = parseWords(raw);
    expect({ unit, shape }).toEqual({ unit: "ms", shape: "jsonl" });
    expect(words[0]).toEqual({ startSec: 0.11, endSec: 0.36, text: "ya" });
  });

  it("reads the faster-whisper segments shape in seconds", () => {
    const raw = JSON.stringify({ duration: 37.8, segments: [{ start: 0.5, end: 2.1, text: " decir no se " }] });
    const { words, unit, shape } = parseWords(raw);
    expect({ unit, shape }).toEqual({ unit: "s", shape: "segments" });
    expect(words[0]).toEqual({ startSec: 0.5, endSec: 2.1, text: "decir no se" });
  });
});

describe("matchAnchors", () => {
  const words = [
    { startSec: 0.0, endSec: 0.3, text: "todo" },
    { startSec: 0.3, endSec: 0.6, text: "empieza" },
    { startSec: 0.6, endSec: 0.8, text: "con" },
    { startSec: 0.8, endSec: 1.2, text: "un" },
    { startSec: 1.2, endSec: 1.8, text: "agente" },
  ];

  it("places a step at the start of its first matching word, ignoring case and accents", () => {
    const got = matchAnchors([{ id: "a", text: "Todo empieza" }, { id: "b", text: "un agente" }], words);
    expect(got).toEqual([{ id: "a", tSec: 0 }, { id: "b", tSec: 0.8 }]);
  });

  it("returns null rather than guessing when the copy is not in the voice track", () => {
    expect(matchAnchors([{ id: "x", text: "esto no se dice" }], words)).toEqual([{ id: "x", tSec: null }]);
  });
});

// ---------------------------------------------------------------------------
// The control pair. A rubric that cannot fail is theatre; one that cannot pass
// is noise. Both directions are asserted on the same shapes.
// ---------------------------------------------------------------------------

/**
 * A board reproducing the numbers measured in
 * projects/no-sabias-agente/AUDITORIA.md: 26 px copy in a 1080-wide vertical
 * frame (9.4 apparent pt), white cards with a 10% border on a white ground,
 * the first event at 1.9 s, a 2.6 s hold, and a card hanging off the left edge.
 */
function badBoard(): BoardFrame[] {
  const card = (z: number, x: number, name: string) => ({
    z,
    type: "FRAME",
    name,
    x,
    y: 400,
    w: 800,
    h: 220,
    fills: ["#ffffff"],
    effects: [],
    rb: [x, 400, 800, 220] as [number, number, number, number],
  });
  const msg = (z: number, name: string, chars: string) => ({
    z,
    type: "TEXT",
    name,
    x: 140,
    y: 440,
    w: 700,
    h: 40,
    fills: ["#000000@10"],
    backdrop: ["#ffffff"],
    effects: [],
    rb: [140, 440, 700, 40] as [number, number, number, number],
    text: { chars, font: "ES Klarheit Grotesk Medium", size: 26, lineHeight: "92%", letterSpacing: "-3%", align: "LEFT", dropped: 0 },
  });
  return [
    { id: "1:1", name: "a1", x: 0, y: 0, w: 1080, h: 1920, fills: ["#ffffff"], children: [card(0, 140, "card-1"), msg(1, "msg-1", "hola equipo")] },
    // A card hanging off the left edge: only a sliver of its ink box is inside.
    { id: "1:2", name: "a2", x: 1200, y: 0, w: 1080, h: 1920, fills: ["#ffffff"], children: [card(0, -740, "card-benito"), msg(1, "msg-2", "me quede sin bateria ayer")] },
    { id: "1:3", name: "a3", x: 2400, y: 0, w: 1080, h: 1920, fills: ["#ffffff"], children: [card(0, 140, "card-3"), msg(1, "msg-3", "rene dice que manda el reporte manana temprano sin falta")] },
  ];
}

/** The same three shots, corrected. Same code path, opposite verdict. */
function goodBoard(): BoardFrame[] {
  const frames = badBoard();
  for (const f of frames) {
    f.fills = ["#0b0b0b"];
    for (const n of f.children) {
      if (n.text) {
        n.text.size = 72;
        n.fills = ["#ffffff"];
        n.backdrop = ["#0b0b0b"];
      } else {
        n.fills = ["#DEFF38"];
        n.x = 140;
        n.rb = [140, 400, 800, 220];
      }
    }
  }
  return frames;
}

const badWords = [
  // Nothing said until 1.9 s: the empty opening the audit measured.
  { startSec: 1.9, endSec: 2.2, text: "hola" },
  { startSec: 2.2, endSec: 2.6, text: "equipo" },
  // ... then nothing enters for 2.6 s, the hold the audit measured.
  { startSec: 4.5, endSec: 4.8, text: "me" },
  { startSec: 4.8, endSec: 5.1, text: "quede" },
  { startSec: 5.1, endSec: 5.4, text: "sin" },
  { startSec: 5.4, endSec: 5.8, text: "bateria" },
  { startSec: 5.8, endSec: 6.2, text: "ayer" },
  { startSec: 6.3, endSec: 6.6, text: "rene" },
  { startSec: 6.6, endSec: 6.9, text: "dice" },
  { startSec: 6.9, endSec: 7.2, text: "que" },
];

describe("evaluateBoard - positive control on the audited board", () => {
  const ev = evaluateBoard({ frames: badBoard(), words: badWords, durationSec: 10.7 });
  const failedIds = ev.failed.map((f) => f.id);

  it("catches every defect the audit found by hand on the finished MP4", () => {
    // These five were found by watching the render. They are all visible in the board.
    expect(failedIds).toContain("board.legibility.phone_size");
    expect(failedIds).toContain("board.legibility.figure_ground");
    expect(failedIds).toContain("board.pacing.opening_gap");
    expect(failedIds).toContain("board.pacing.max_hold");
    expect(failedIds).toContain("board.spatial.not_clipped");
  });

  it("reports the audit's own numbers back", () => {
    const phone = ev.failed.find((f) => f.id === "board.legibility.phone_size")!;
    // 26 px * 390 / 1080 = 9.39 pt, the figure in AUDITORIA.md section A.
    expect(phone.observed).toMatch(/9\.4 pt/);
    const open = ev.failed.find((f) => f.id === "board.pacing.opening_gap")!;
    expect(open.observed).toMatch(/1\.90 s/);
    const hold = ev.failed.find((f) => f.id === "board.pacing.max_hold")!;
    expect(hold.observed).toMatch(/2\.60 s/);
  });

  it("emits fixes that name a node and a new value, so they can be applied", () => {
    const phone = ev.failed.find((f) => f.id === "board.legibility.phone_size")!;
    expect(phone.fixes && phone.fixes.length).toBeTruthy();
    for (const fix of phone.fixes!) {
      expect(fix.node).toMatch(/^\d+:\d+#\d+$/);
      expect(fix.prop).toBe("fontSize");
      expect(Number(fix.to)).toBeGreaterThanOrEqual(31); // 11 pt * 1080 / 390
      expect(Number(fix.to)).toBeGreaterThan(Number(fix.from));
    }
  });
});

describe("evaluateBoard - negative control on the corrected board", () => {
  const ev = evaluateBoard({
    frames: goodBoard(),
    words: badWords.map((w) => ({ ...w, startSec: Math.max(0, w.startSec - 1.6), endSec: w.endSec - 1.6 })),
    durationSec: 6.5,
  });
  const failedIds = ev.failed.map((f) => f.id);

  it("passes the items the bad board failed, so none of them is a check that cannot pass", () => {
    for (const id of ["board.legibility.phone_size", "board.legibility.figure_ground", "board.pacing.opening_gap", "board.spatial.not_clipped"]) {
      expect(failedIds).not.toContain(id);
    }
  });

  it("still has the vision items waiting for a human or a VLM", () => {
    expect(ev.unverifiable.map((u) => u.id)).toEqual(expect.arrayContaining(["board.intent.reads_in_one_second", "board.intent.one_focal_point"]));
  });
});

// ---------------------------------------------------------------------------
// Real data. Verbatim excerpt of a figma-dump.js run against the actual board of
// projects/no-sabias-agente (file Z9RphJlboAaqBWQJH1E6wa, shots 331:18, 337:86,
// 340:112), taken 2026-09-20. Trimmed to the nodes the rubric reads; every value
// is as Figma returned it. This is the board the audit reproved, so the rubric
// has to reprove it too - from the board alone, before any of it was animated.
// ---------------------------------------------------------------------------

const txt = (over: Record<string, unknown>) => ({
  font: "ES Klarheit Grotesk Book",
  lineHeight: "32px",
  letterSpacing: "0%",
  align: "LEFT",
  dropped: 0,
  ...over,
});

const realBoard = (): BoardFrame[] => [
  {
    id: "331:18",
    name: "A1.1 · 0:00.0 · pregunta",
    x: 0,
    y: 0,
    w: 1080,
    h: 2000,
    fills: [],
    children: [
      { z: 0, depth: 0, path: "shot-head", type: "FRAME", name: "shot-head", x: 0, y: 0, w: 1080, h: 80, fills: [], effects: [], visible: true, rb: [0, 0, 1080, 80], backdrop: [] },
      { z: 2, depth: 1, path: "shot-head/0:00.0 · fr 0", type: "TEXT", name: "0:00.0 · fr 0", x: 120, y: 22, w: 181, h: 39, fills: ["#ffffff@45"], effects: [], visible: true, rb: [121.8, 28.4, 177, 26.1], backdrop: [], text: txt({ chars: "0:00.0 · fr 0", size: 34 }) },
      { z: 5, depth: 0, path: "stage", type: "FRAME", name: "stage", x: 0, y: 80, w: 1080, h: 1920, fills: ["#ffffff"], effects: [], visible: true, rb: [0, 80, 1080, 1920], backdrop: [] },
      { z: 6, depth: 1, path: "stage/pregunta", type: "TEXT", name: "pregunta", x: 72, y: 843, w: 936, h: 234, fills: ["#09070f"], effects: [], visible: true, rb: [99.9, 935.2, 881.1, 223.9], backdrop: ["#ffffff"], text: txt({ chars: "¿Qué es algo que no sabías?que un agente de Silia?puede hacer?", size: 70, dropped: 2 }) },
    ],
  },
  {
    id: "337:86",
    name: "A2.6 · 0:05.6 · pila",
    x: 6500,
    y: 2300,
    w: 1080,
    h: 2000,
    fills: [],
    children: [
      { z: 5, depth: 0, path: "stage", type: "FRAME", name: "stage", x: 0, y: 80, w: 1080, h: 1920, fills: ["#ffffff"], effects: [], visible: true, rb: [0, 80, 1080, 1920], backdrop: [] },
      { z: 6, depth: 1, path: "stage/highlight", type: "RECTANGLE", name: "highlight", x: 719.5, y: 262, w: 139, h: 74, fills: ["#deff38"], effects: [], visible: true, rb: [719.5, 342, 139, 74], backdrop: ["#ffffff"] },
      // Every card is white on a white stage: the audit's "masa gris de bajo contraste".
      { z: 8, depth: 1, path: "stage/card · Alejandro Arellano", type: "INSTANCE", name: "card · Alejandro Arellano", x: 80, y: 1234, w: 920, h: 286, fills: ["#ffffff"], effects: ["DROP_SHADOW"], visible: true, rb: [16, 1274, 1048, 414], backdrop: ["#ffffff"] },
      { z: 13, depth: 2, path: "stage/card · Alejandro Arellano/mensaje", type: "TEXT", name: "mensaje", x: 24, y: 70, w: 872, h: 192, fills: ["#09070f"], effects: [], visible: true, rb: [105.1, 1389.9, 825.7, 184.7], backdrop: ["#ffffff"], text: txt({ chars: "que una IA en un entorno controlado y cerrado logarara salir del mismo, conectandose a internet y vulnerando a hugging face para obtener datos que le ayudaran a completar su tarea, ocultando ciertas a", size: 26 }) },
      { z: 14, depth: 1, path: "stage/card · Nestor Rendon", type: "INSTANCE", name: "card · Nestor Rendon", x: 90, y: 812, w: 920, h: 446, fills: ["#ffffff"], effects: ["DROP_SHADOW"], visible: true, rb: [26, 852, 1048, 574], backdrop: ["#ffffff"] },
      { z: 19, depth: 2, path: "stage/card · Nestor Rendon/mensaje", type: "TEXT", name: "mensaje", x: 24, y: 70, w: 872, h: 352, fills: ["#09070f"], effects: [], visible: true, rb: [114.4, 967.3, 867.3, 341.5], backdrop: ["#ffffff"], text: txt({ chars: "¿Sabían que tenemos nuestro propio marketplace de agentes de IA? (Cualquier equipo de desarrollo lo puede usar) El Silia Marketplace es un set de plugins para Claude Code que ya usan 3 equipos: automa", size: 26, dropped: 5 }) },
      // Rotated card: x = 20 but its ink box starts at 0 and is 1012 wide - it hangs off the edge.
      { z: 20, depth: 1, path: "stage/card · Benito Rodriguez", type: "INSTANCE", name: "card · Benito Rodriguez", x: 20, y: 1070.7, w: 920, h: 158, fills: ["#ffffff"], effects: ["DROP_SHADOW"], visible: true, rb: [0, 923.9, 1012.3, 464.9], backdrop: ["#ffffff"] },
    ],
  },
  {
    id: "340:112",
    name: "A3.1 · 0:10.0 · salida",
    x: 0,
    y: 4600,
    w: 1080,
    h: 2000,
    fills: [],
    children: [
      { z: 5, depth: 0, path: "stage", type: "FRAME", name: "stage", x: 0, y: 80, w: 1080, h: 1920, fills: ["#ffffff"], effects: [], visible: true, rb: [0, 80, 1080, 1920], backdrop: [] },
      { z: 14, depth: 1, path: "stage/card · Nestor Rendon", type: "INSTANCE", name: "card · Nestor Rendon", x: 90, y: -88, w: 920, h: 446, fills: ["#ffffff"], effects: ["DROP_SHADOW"], visible: true, rb: [26, -48, 1048, 574], backdrop: ["#ffffff"] },
    ],
  },
];

describe("evaluateBoard - the real audited board", () => {
  // 10.7 s is the delivered length of the opening, per AUDITORIA.md section B.
  const ev = evaluateBoard({ frames: realBoard(), durationSec: 10.7 });
  const failedIds = ev.failed.map((f) => f.id);

  it("takes its anchors from the shot names the board author wrote", () => {
    expect(ev.anchors.map((a) => [a.tSec, a.matchedBy])).toEqual([
      [0, "name"],
      [5.6, "name"],
      [10, "name"],
    ]);
  });

  it("measures the stage, not the board's own annotation chrome", () => {
    // The shot frame is 1080x2000; the delivered picture is the 1080x1920 stage.
    // The shot label "0:00.0 · fr 0" is chrome and must not be judged as copy.
    expect(ev.summary.texts).toBe(3);
    const phone = ev.failed.find((f) => f.id === "board.legibility.phone_size");
    for (const fix of phone?.fixes ?? []) expect(fix.nodeName).not.toMatch(/fr \d|shot/);
  });

  it("reproves, from the board alone, what the audit found in the finished MP4", () => {
    expect(failedIds).toContain("board.legibility.phone_size");     // 26 px = 9.4 pt
    expect(failedIds).toContain("board.legibility.figure_ground");  // white cards on white
    expect(failedIds).toContain("board.spatial.not_occluded");      // the buried cards
    expect(failedIds).toContain("board.text.renderable_glyphs");    // the glyphs that became a blob
    expect(failedIds).toContain("board.pacing.max_hold");           // the dead stretch
  });

  it("reproduces the audit's own figure for the message size", () => {
    const phone = ev.failed.find((f) => f.id === "board.legibility.phone_size")!;
    expect(phone.observed).toMatch(/9\.4 pt/);
  });

  it("finds the white-on-white card contrast at 1:1", () => {
    const fg = ev.failed.find((f) => f.id === "board.legibility.figure_ground")!;
    expect(fg.observed).toMatch(/1:1/);
  });
});

describe("evaluateBoard - structure", () => {
  it("defers the timed items instead of inventing anchors when there is no transcript", () => {
    const ev = evaluateBoard({ frames: badBoard() });
    const deferred = ev.unverifiable.map((u) => u.id);
    expect(deferred).toContain("board.pacing.opening_gap");
    expect(deferred).toContain("board.pacing.max_hold");
    expect(deferred).toContain("board.coverage.rows_anchored");
    // Untimed checks still run.
    expect(ev.failed.map((f) => f.id)).toContain("board.legibility.phone_size");
  });

  it("groups frames into rows by y and orders each row left to right", () => {
    const rows = groupRows(badBoard());
    expect(rows.length).toBe(1);
    expect(rows[0].map((f) => f.id)).toEqual(["1:1", "1:2", "1:3"]);
  });

  it("has unique ids and accounts for every item on every run", () => {
    expect(new Set(BOARD_RUBRIC.map((i) => i.id)).size).toBe(BOARD_RUBRIC.length);
    for (const i of BOARD_RUBRIC) expect(i.origin.length).toBeGreaterThan(10);
    const ev = evaluateBoard({ frames: badBoard(), words: badWords, durationSec: 10.7 });
    const seen = new Set([...ev.passed, ...ev.failed].map((r) => r.id).concat(ev.unverifiable.map((u) => u.id)));
    expect([...seen].sort()).toEqual(BOARD_RUBRIC.map((i) => i.id).sort());
  });
});
