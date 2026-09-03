/**
 * House style for SaaS / product video. These are opinions (flagged `opinion: true`),
 * distilled from what is in production in Silia's editorial pipeline; they are not
 * facts from any external spec.
 */

export interface StyleRule {
  id: string;
  rule: string;
  /** Machine-readable parameters when the rule has numbers. */
  values?: Record<string, number | string | [number, number] | string[]>;
  /** Which tool / helper implements it. */
  aeHow?: string;
}

export interface HouseStyle {
  id: string;
  title: string;
  opinion: true;
  register: "product_video";
  rules: StyleRule[];
  attribution: string[];
}

export const SAAS_VIDEO_STYLE: HouseStyle = {
  id: "saas-video",
  title: "Silia SaaS / product video house style",
  opinion: true,
  register: "product_video",
  rules: [
    { id: "hero_reveal", rule: "Hero reveals take 600–900 ms with ease_out_expo or ease_out_quint (long deceleration, no overshoot).", values: { durationMs: [600, 900], eases: ["ease_out_expo", "ease_out_quint"] }, aeHow: "ae_keyframes set + ae_ease preset=ease_out_expo" },
    { id: "ui_entrance", rule: "UI element entrances take 300–400 ms with ease_out_quart.", values: { durationMs: [300, 400], eases: ["ease_out_quart"] }, aeHow: "silia_ui_composite / ae_keyframes with ease ease_out_quart" },
    { id: "stagger", rule: "Row and card staggers are 60–120 ms per item; the whole cascade stays under 2 s.", values: { perItemMs: [60, 120], sequenceCapMs: 2000 }, aeHow: "ae_keyframes offset per layer or staggered in-points; staggerFor() in motion/staggers" },
    { id: "zoom_cut", rule: "Zoom-cuts take 400–600 ms with a spring whose bounce is ≤ 0.1, and motion blur on.", values: { durationMs: [400, 600], springBounceMax: 0.1, motionBlur: "on" }, aeHow: "silia_push_25d / zoom_punch pattern; layer.motionBlur = true; comp motion blur on" },
    { id: "scale_from", rule: "Scale entrances start from 0.96–0.98, never from 0.", values: { scaleFrom: [0.96, 0.98] }, aeHow: "ae_keyframes scale [96,96] → [100,100]" },
    { id: "dark_glow_first", rule: "On dark backgrounds animate glow/opacity before position: the light arrives, then the element settles.", aeHow: "Glow intensity / opacity keys start 1–2 frames before position keys" },
    { id: "glow_never_zero", rule: "Never fade a glow to 0: the last 10% of the fade pops. Stop at ~8–10% or fade the layer instead.", values: { glowFloorPct: 8 }, aeHow: "Keep ADBE Glo2 intensity ≥ 0.08 or fade layer opacity" },
    { id: "one_focal_motion", rule: "One focal motion per beat; secondary motion is ≤ 30% of the primary's amplitude.", values: { secondaryAmplitudeMaxPct: 30 } },
    { id: "text_rest", rule: "Text comes to rest and holds at least 1 s per 13 characters before anything else moves.", values: { holdSecondsPer13Chars: 1 }, aeHow: "hold = ceil(chars / 13) s after the last text key" },
    { id: "transform_only", rule: "Animate transforms and opacity; effects animate only when a transform cannot do it." },
  ],
  attribution: ["Silia editorial house style (opinion). Numeric ranges are consistent with the product_video register in motion/taxonomy.ts."],
};

export const HOUSE_STYLES: Record<string, HouseStyle> = { "saas-video": SAAS_VIDEO_STYLE };
