import { describe, expect, it } from "vitest";
import { LEGIBILITY_RULES, legibilityCheck, safeAreas } from "../../src/motion/typography.js";

describe("typography", () => {
  it("computes title-safe insets as 10% per edge", () => {
    expect(safeAreas(1080, 1920).title).toMatchObject({ insetX: 108, insetY: 192, box: [108, 192, 864, 1536] });
    expect(safeAreas(1920, 1080).title).toMatchObject({ insetX: 192, insetY: 108, box: [192, 108, 1536, 864] });
    expect(safeAreas(1920, 1080).action).toMatchObject({ insetX: 96, insetY: 54 });
  });

  it("passes a readable caption", () => {
    const r = legibilityCheck({ text: "Hello from the team", fontSizePx: 30, compW: 1920, compH: 1080, onScreenSec: 2, kind: "caption" });
    expect(r.pass).toBe(true);
    expect(r.metrics.cps).toBe(9.5);
  });

  it("flags small body copy, long lines, too many lines and fast reading", () => {
    const text = "This is a long line of body copy that goes past thirty characters\nsecond\nthird\nfourth";
    const r = legibilityCheck({ text, fontSizePx: 24, compW: 1920, compH: 1080, onScreenSec: 1, kind: "body" });
    const rules = r.issues.map((i) => i.rule);
    expect(rules).toContain("min_font_size");
    expect(rules).toContain("max_chars_per_line");
    expect(rules).toContain("max_lines");
    expect(rules).toContain("reading_speed_hard_max");
    expect(rules).toContain("hold_after_rest");
    expect(r.pass).toBe(false);
    for (const i of r.issues) expect(i.fix).toMatch(/\d/);
  });

  it("scales the minimum font size by comp height and applies caption event bounds", () => {
    const vertical = legibilityCheck({ text: "hi", fontSizePx: 40, compW: 1080, compH: 1920, onScreenSec: 0.5, kind: "caption" });
    expect(vertical.metrics.minFontPx).toBe(Math.round(LEGIBILITY_RULES.minFontPx1080.caption * (1920 / 1080)));
    expect(vertical.issues.map((i) => i.rule)).toContain("min_font_size");
    expect(vertical.issues.map((i) => i.rule)).toContain("caption_min_event");
    const long = legibilityCheck({ text: "stay", fontSizePx: 60, compW: 1920, compH: 1080, onScreenSec: 9, kind: "caption" });
    expect(long.issues.map((i) => i.rule)).toEqual(["caption_max_event"]);
  });

  it("checks the bounding box against title-safe and estimates wrapped lines from a count", () => {
    const r = legibilityCheck({ text: "Twelve words of wrapped caption text that the box splits visually", fontSizePx: 60, compW: 1920, compH: 1080, lines: 3, bbox: [100, 900, 800, 150], kind: "caption" });
    const rules = r.issues.map((i) => i.rule);
    expect(rules).toContain("title_safe");
    expect(rules).toContain("max_lines");
    expect(r.metrics.lines).toBe(3);
  });
});
