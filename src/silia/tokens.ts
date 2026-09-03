/**
 * Silia brand + motion tokens for After Effects. This is the first written definition
 * of Silia's motion vocabulary (the design system exposes no named easing/duration
 * tokens); values come from what is in production in editorial/ (HyperFrames
 * overlays, formato-visual.md, isom-motion) and foundation/silia/brand.md.
 *
 * Kept as data so the brand layer stays separable from the core server.
 */

export const SILIA_COLORS = {
  lime: "#DEFF38", // acento primario. Text on lime is ALWAYS black.
  violeta: "#7A5BF5",
  rosa: "#F3B9FA",
  grafito: "#0A0A0B",
  white: "#FFFFFF",
  black: "#000000",
  // semantic
  danger: "#D64040",
  success: "#0F8960",
  warning: "#CE9117",
} as const;

/** Video/motion font (NOT ABC Monument Grotesk, which is the web/product font). */
export const SILIA_FONTS = {
  body: "ESKlarheitGrotesk-Bk",
  medium: "ESKlarheitGrotesk-Md",
  fallback: "ArialMT",
  files: ["editorial/paquete-produccion-video/assets-compartidos/fuentes/ESKlarheitGrotesk-Bk.otf", "editorial/paquete-produccion-video/assets-compartidos/fuentes/ESKlarheitGrotesk-Md.otf"],
} as const;

export const SILIA_FORMATS = {
  h1080p30: { width: 1920, height: 1080, fps: 30, safeMargin: 86 },
  v1080x1920p60: { width: 1080, height: 1920, fps: 60, safeMargin: 72 },
  v1080x1920p30: { width: 1080, height: 1920, fps: 30, safeMargin: 72 },
} as const;

/** Seconds. */
export const SILIA_DURATIONS = { xs: 0.16, sm: 0.2, md: 0.32, lg: 0.5, xl: 0.85 } as const;

/** cubic-bezier definitions (GSAP names) and their KeyframeEase equivalents (speed 0). */
export const SILIA_EASES: Record<string, { bezier: [number, number, number, number]; inInfluence: number; outInfluence: number; note?: string }> = {
  power2_out: { bezier: [0.25, 0.46, 0.45, 0.94], inInfluence: 55, outInfluence: 25 },
  power3_out: { bezier: [0.215, 0.61, 0.355, 1], inInfluence: 64.5, outInfluence: 21.5, note: "default entry ease" },
  power3_in_out: { bezier: [0.645, 0.045, 0.355, 1], inInfluence: 64.5, outInfluence: 64.5, note: "travel / card moves" },
  power2_in_out: { bezier: [0.455, 0.03, 0.515, 0.955], inInfluence: 48.5, outInfluence: 45.5 },
  expo_out: { bezier: [0.19, 1, 0.22, 1], inInfluence: 78, outInfluence: 19 },
  snappy: { bezier: [0.15, 0.85, 0.15, 1], inInfluence: 85, outInfluence: 15, note: "zoom punches" },
  linear: { bezier: [0, 0, 1, 1], inInfluence: 0.1, outInfluence: 0.1 },
};

/** Named motion patterns in production. */
export const SILIA_PATTERNS = {
  confirmed_entry: { description: "Opacity 0→1 plus Y +18px→0 (transforms and opacity only)", duration: SILIA_DURATIONS.md, ease: "power3_out", risePx: 18 },
  confirmed_exit: { description: "Opacity 1→0 plus Y 0→-12px", duration: SILIA_DURATIONS.sm, ease: "power2_in_out", risePx: -12 },
  card_travel: { description: "Card slides +630px in X", duration: 0.85, ease: "power3_in_out", travelPx: 630 },
  zoom_punch: { description: "Scale 1→1.09→1 (zoom-cut)", duration: 0.33, ease: "snappy", peakScale: 109 },
  letter_stagger: { description: "Letters appear left to right", perLetter: 0.032, duration: SILIA_DURATIONS.md, ease: "power3_out" },
  word_reveal: { description: "Word appears 0.16s after onset, 0.2s fade to 95% opacity", latency: 0.16, fade: 0.2, opacity: 95 },
  push_25d: { description: "2.5D push on stills 4.5-6% over the shot, pre-scaled 2x for subpixel motion", amountPct: [4.5, 6], preScale: 2 },
} as const;

/** Five orb color ramps (measured from brand art; never invent a sixth). */
export const SILIA_ORB_SUITES: Record<string, { stops: Array<[number, string]>; industry: string }> = {
  azul: { industry: "Seguros", stops: [[0.08, "#ffffff"], [0.25, "#2b90e3"], [0.55, "#5fe3f0"], [0.67, "#2b90e3"], [0.76, "#8ed8ea"]] },
  verde: { industry: "Finanzas", stops: [[0.08, "#ffffff"], [0.25, "#2f9e6b"], [0.55, "#73f359"], [0.67, "#2f9e6b"], [0.76, "#92d232"]] },
  naranja: { industry: "Logística", stops: [[0.08, "#ffffff"], [0.25, "#e0622f"], [0.55, "#ffb057"], [0.67, "#e0622f"], [0.76, "#f5cf7a"]] },
  morado: { industry: "PPOs", stops: [[0.08, "#ffffff"], [0.25, "#7145c9"], [0.55, "#c98af0"], [0.67, "#7145c9"], [0.76, "#e0a6e8"]] },
  amarillo: { industry: "(sin asignar)", stops: [[0.08, "#ffffff"], [0.25, "#c9992f"], [0.55, "#f5e06b"], [0.67, "#c9992f"], [0.76, "#d9e07a"]] },
};

export const SILIA_TYPE_SCALE = {
  /** px at 1080p; scale by height/1080 for other formats. */
  title_l: { size: 96, leading: 100, tracking: -20 },
  title_m: { size: 64, leading: 70, tracking: -10 },
  title_s: { size: 44, leading: 50, tracking: 0 },
  body_l: { size: 32, leading: 40, tracking: 0 },
  body_m: { size: 28, leading: 40, tracking: 0 },
  label: { size: 19, leading: 24, tracking: 20 },
  caption: { size: 28, leading: 40, tracking: 0 },
} as const;

export const SILIA_RULES = [
  "Animate only transform and opacity (never size/position via effects when a transform does it).",
  "Text on Lime (#DEFF38) is always black.",
  "Video typography is ES Klarheit Grotesk (Bk/Md); ABC Monument Grotesk is web-only.",
  "Default shot rhythm 2.5–4 s; deliberate holds 4 s+ on silence beats.",
  "Never invent a sixth orb ramp; use the five measured suites.",
  "Only spoken words may be on screen in captions (accumulate per turn).",
  "Glow/halo elements need a canvas ~1.45x the element so the halo is not clipped.",
  "Outro needs 0.43 s of head black; horizontal outro is 1920x1080@30, vertical 1080x1920.",
] as const;

export function siliaTokens() {
  return { colors: SILIA_COLORS, fonts: SILIA_FONTS, formats: SILIA_FORMATS, durations: SILIA_DURATIONS, eases: SILIA_EASES, patterns: SILIA_PATTERNS, orbSuites: SILIA_ORB_SUITES, typeScale: SILIA_TYPE_SCALE, rules: SILIA_RULES };
}

/** Resolve an ease token to a KeyframeEase-style spec (influences; speed 0 = symmetric). */
export function resolveEase(token: string): { inInfluence: number; outInfluence: number; inSpeed: number; outSpeed: number; bezier: [number, number, number, number] } {
  const key = token.replace(/^silia\./, "").replace(/[.\-\s]/g, "_").toLowerCase();
  const e = SILIA_EASES[key];
  if (!e) throw new Error(`Unknown Silia ease "${token}". Known: ${Object.keys(SILIA_EASES).join(", ")}`);
  return { inInfluence: e.inInfluence, outInfluence: e.outInfluence, inSpeed: 0, outSpeed: 0, bezier: e.bezier };
}
