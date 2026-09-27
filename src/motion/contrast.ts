/**
 * Relative luminance and contrast ratio (WCAG 2.x), plus the colour parsing the
 * Figma board dump needs.
 *
 * Why this exists: nothing in this server measured contrast. The most expensive
 * finding of the only real delivery audit we have was a contrast failure that no
 * gate could see — white cards with a 10% border on a white ground, which read as
 * "una masa gris de bajo contraste" at phone size while every numeric check passed
 * (projects/no-sabias-agente/AUDITORIA.md, finding 3).
 *
 * Sources:
 * - WCAG 2.2, Contrast (Minimum) 1.4.3 and Non-text Contrast 1.4.11: the 4.5:1,
 *   3:1 thresholds and the (L1 + 0.05) / (L2 + 0.05) formula.
 * - WCAG relative luminance definition (sRGB linearisation, 0.2126/0.7152/0.0722).
 * The figure/ground threshold for pure mass (1.5:1) is a house rule, not WCAG:
 * a shape is not text, it only has to separate from its ground. Marked as such.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0..1 */
  a: number;
}

/**
 * Parses the colour strings the board dump emits: "#rrggbb", or "#rrggbb@NN"
 * where NN is the fill opacity in percent. Returns null for anything that is not
 * a solid colour (gradients, images, "mixed"), which the caller must treat as
 * "cannot decide", never as "passes".
 */
export function parseFill(s: string | undefined | null): Rgb | null {
  if (typeof s !== "string") return null;
  const m = /^#([0-9a-f]{6})(?:@(\d{1,3}))?$/i.exec(s.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const a = m[2] === undefined ? 1 : Math.min(100, parseInt(m[2], 10)) / 100;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}

/** The topmost solid fill of a Figma fills array (last entry paints on top). */
export function effectiveFill(fills: unknown): Rgb | null {
  if (!Array.isArray(fills)) return null;
  for (let i = fills.length - 1; i >= 0; i--) {
    const c = parseFill(fills[i] as string);
    if (c && c.a > 0) return c;
  }
  return null;
}

/** Source-over composite of `fg` onto an opaque `bg`. */
export function composite(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG contrast ratio, 1.0 (identical) to 21.0 (black on white). Order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Required text contrast. WCAG calls text "large" at 18.66 px bold or 24 px
 * regular; here the size is already in apparent points at delivery size, so the
 * cut is 24 pt / 18.66 pt bold, expressed in the apparent-pt space the board
 * rubric works in.
 */
export function requiredTextContrast(apparentPt: number, bold = false): number {
  const large = bold ? apparentPt >= 14 : apparentPt >= 18;
  return large ? 3 : 4.5;
}

/** House rule: a mass (card, chip, container) must separate from its ground. Not WCAG. */
export const FIGURE_GROUND_MIN = 1.5;
