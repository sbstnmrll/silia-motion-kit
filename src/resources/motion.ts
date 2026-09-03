/**
 * motion:// resources — the knowledge half of the motion layer as JSON, no AE round trip.
 * Every payload carries an `attribution` field; numbers are facts from the cited
 * systems, prose is ours, opinions are flagged.
 */
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EASES, EASE_ATTRIBUTION, bezierToInfluence, easeCategory, easeToCss } from "../motion/eases.js";
import { DISTANCE_FORMULA, DURATION_ATTRIBUTION, DURATION_SCALES, distanceBand, distanceDurationTable } from "../motion/durations.js";
import { STAGGER_ATTRIBUTION, STAGGER_FLOOR_MS, STAGGER_TABLE, staggerFor } from "../motion/staggers.js";
import { ARCHETYPES, DEVICES, ENTRANCE_ORDER, INTENTS, REGISTERS, SILIA_ARCHETYPE } from "../motion/taxonomy.js";
import { HOUSE_STYLES } from "../motion/house-style.js";
import { LEGIBILITY_RULES, safeAreas } from "../motion/typography.js";
import { RUBRIC } from "../motion/rubric.js";

const json = (uri: URL, data: unknown) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] });

const TAXONOMY_KINDS = ["registers", "intents", "devices", "archetypes"] as const;
type TaxonomyKind = (typeof TAXONOMY_KINDS)[number];

const TAXONOMY_ATTRIBUTION = [
  "Registers: IBM Carbon (Apache-2.0), Material 3 (CC BY 4.0, Material Design, Google), Fluent 2, Atlassian, Val Head — numeric bands; product_video is a house style sheet",
  "Intents: AniMINT, 'Beyond Screenshots: Evaluating VLMs' Understanding of UI Animations' (arXiv 2604.26148, CC BY 4.0) — the 7 purposes",
  "Devices: UX in Motion Manifesto (Issara Willenskomer) — the 12 principle names only; glosses and AE mappings are ours",
  "Archetypes: LottieFiles motion-design-skill personalities — concept and names only",
];

export function taxonomyPayload(kind: TaxonomyKind) {
  switch (kind) {
    case "registers":
      return { kind, registers: REGISTERS, entranceOrder: ENTRANCE_ORDER, note: "Durations in ms. eases resolve via motion://tokens/easings.", attribution: TAXONOMY_ATTRIBUTION };
    case "intents":
      return { kind, intents: INTENTS, attribution: TAXONOMY_ATTRIBUTION };
    case "devices":
      return { kind, devices: DEVICES, attribution: TAXONOMY_ATTRIBUTION };
    case "archetypes":
      return { kind, archetypes: ARCHETYPES, siliaDefault: SILIA_ARCHETYPE, attribution: TAXONOMY_ATTRIBUTION };
  }
}

export function easingsPayload() {
  return {
    count: Object.keys(EASES).length,
    conversion: "AE influences shown at speed 0: influence_out = 100*x1, influence_in = 100*(1-x2), clamped 0.1–100. With a known average segment speed v: speed_out = (y1/x1)*v, speed_in = ((1-y2)/(1-x2))*v (see motion://ae/ease-conversion).",
    eases: Object.entries(EASES).map(([name, e]) => {
      const inf = bezierToInfluence(e.bezier);
      return {
        name,
        category: easeCategory(name),
        bezier: e.bezier,
        css: easeToCss(name),
        ae: { inInfluence: inf.inInfluence, outInfluence: inf.outInfluence, inSpeed: 0, outSpeed: 0 },
        gsap: e.gsap ?? null,
        role: e.role,
        overshoots: e.overshoots ?? false,
        source: e.source,
        license: e.license,
        note: e.note ?? null,
      };
    }),
    special: { linear: "KeyframeInterpolationType.LINEAR", hold: "KeyframeInterpolationType.HOLD" },
    attribution: EASE_ATTRIBUTION,
  };
}

export function durationsPayload() {
  return {
    scales: DURATION_SCALES,
    registers: { functional_ui: REGISTERS.functional_ui.durations, product_video: REGISTERS.product_video.durations },
    distance: { formula: DISTANCE_FORMULA, bands: { functional_ui: distanceBand("functional_ui"), product_video: distanceBand("product_video") } },
    attribution: DURATION_ATTRIBUTION,
  };
}

export function staggersPayload() {
  return {
    table: STAGGER_TABLE,
    floorsMs: STAGGER_FLOOR_MS,
    sequenceCapMs: { functional_ui: REGISTERS.functional_ui.stagger.sequenceCapMs, product_video: REGISTERS.product_video.stagger.sequenceCapMs },
    examples: [staggerFor(3, "functional_ui", 200), staggerFor(5, "product_video", 350), staggerFor(20, "product_video", 400), staggerFor(40, "functional_ui", 150)],
    attribution: STAGGER_ATTRIBUTION,
  };
}

export function distanceDurationPayload() {
  return {
    formula: DISTANCE_FORMULA,
    fps: 30,
    bands: { functional_ui: distanceBand("functional_ui"), product_video: distanceBand("product_video") },
    table: distanceDurationTable([50, 100, 200, 400, 800, 1200], 30).map((r) => ({
      distancePx: r.distancePx,
      functional_ui: { ms: r.functional_ui.ms, frames: r.functional_ui.frames, rawMs: r.functional_ui.rawMs },
      product_video: { ms: r.product_video.ms, frames: r.product_video.frames, rawMs: r.product_video.rawMs },
    })),
    attribution: ["Formula synthesised from Carbon's described non-linearity (Apache-2.0); bands from the registers in motion://taxonomy/registers"],
  };
}

export function easeConversionPayload() {
  return {
    title: "cubic-bezier → After Effects KeyframeEase",
    formulas: {
      outgoing: { influence: "100 * x1", speed: "(y1 / x1) * avgSpeed", guard: "x1 = 0 → speed 0, influence 0.1" },
      incoming: { influence: "100 * (1 - x2)", speed: "((1 - y2) / (1 - x2)) * avgSpeed", guard: "x2 = 1 → speed 0, influence 0.1" },
      avgSpeed: "|value(k+1) - value(k)| / (time(k+1) - time(k)) for the segment; for arrays the Euclidean length of the delta",
    },
    influenceRange: [0.1, 100],
    speedUnits: {
      opacity: "% per second",
      position: "px per second (spatial: along the motion path, one KeyframeEase per side)",
      scale: "% per second, one KeyframeEase per dimension",
      rotation: "degrees per second",
      color: "one KeyframeEase per channel (4)",
      slider: "units per second",
    },
    caveats: [
      "Spatial properties (position, anchor point, 3D position) ease along the path: they take exactly ONE KeyframeEase per side regardless of dimensions; non-spatial multi-dimensional properties take one per dimension (scale 2 or 3, color 4). Getting the arity wrong throws inside AE.",
      "Speed 0 with the influence from the bezier is a safe approximation (the S-curve shape) when the segment speed is unknown; __bezierToEase in helpers.jsx computes the real speed from the neighbouring keys.",
      "Overshooting curves (y outside 0..1, e.g. ease_out_back) cannot be expressed with one KeyframeEase pair: add a keyframe past the target or use the inertia expression.",
      "AE Easy Ease (F9) = influence 33.33 both sides, speed 0 — equal to cubic-bezier(0.333, 0, 0.667, 1).",
      "Applying a bezier across a key pair: key n gets the OUT ease (x1,y1), key n+1 gets the IN ease (x2,y2); ae_ease action=from_cubic_bezier does this.",
    ],
    tools: ["ae_ease preset=<name>", "ae_ease from_cubic_bezier bezier={x1,y1,x2,y2}", "ae_ease list", "silia_tokens resolve_ease token=<name>"],
    attribution: ["Formulas: standard mapping of Bézier handle geometry to AE's influence/speed model (Adobe After Effects scripting guide, KeyframeEase object)"],
  };
}

export function registerMotionResources(server: McpServer): void {
  server.registerResource("motion-durations", "motion://tokens/durations", { description: "Duration scales across Carbon, Material 3, Fluent 2, Atlassian, Val Head and Silia, plus the two register bands and the distance formula.", mimeType: "application/json" }, async (uri) => json(uri, durationsPayload()));
  server.registerResource("motion-easings", "motion://tokens/easings", { description: "Every named ease (silia/gsap, easings.net, carbon, material, fluent, atlassian, polaris): cubic-bezier, CSS, AE influences at speed 0, GSAP name, role, source and license.", mimeType: "application/json" }, async (uri) => json(uri, easingsPayload()));
  server.registerResource("motion-staggers", "motion://tokens/staggers", { description: "Stagger table by item count and register, floors, sequence caps and worked examples.", mimeType: "application/json" }, async (uri) => json(uri, staggersPayload()));
  server.registerResource("motion-distance-duration", "motion://tokens/distance-duration", { description: "Distance → duration table (50/100/200/400/800/1200 px) for both registers at 30 fps, with the formula.", mimeType: "application/json" }, async (uri) => json(uri, distanceDurationPayload()));
  server.registerResource("motion-ease-conversion", "motion://ae/ease-conversion", { description: "How cubic-bezier maps to After Effects KeyframeEase: formulas, clamp 0.1–100, speed units per property, spatial arity caveat.", mimeType: "application/json" }, async (uri) => json(uri, easeConversionPayload()));
  server.registerResource(
    "motion-taxonomy",
    new ResourceTemplate("motion://taxonomy/{kind}", {
      list: async () => ({ resources: TAXONOMY_KINDS.map((k) => ({ uri: `motion://taxonomy/${k}`, name: `motion-taxonomy-${k}`, description: `Motion taxonomy: ${k}.`, mimeType: "application/json" })) }),
      complete: { kind: (value) => TAXONOMY_KINDS.filter((k) => k.startsWith(value)) },
    }),
    { description: "Motion taxonomy by kind: registers (functional_ui | product_video with numeric bands), intents (7 purposes), devices (12 UX-in-Motion principles with AE techniques), archetypes (personalities).", mimeType: "application/json" },
    async (uri, vars) => {
      const kind = String(vars.kind ?? "") as TaxonomyKind;
      if (!TAXONOMY_KINDS.includes(kind)) return json(uri, { error: `Unknown taxonomy kind "${kind}". Known: ${TAXONOMY_KINDS.join(", ")}` });
      return json(uri, taxonomyPayload(kind));
    },
  );
  server.registerResource("motion-house-style-saas-video", "motion://house-style/saas-video", { description: "Silia SaaS / product video house style (opinion: hero reveals, UI entrances, staggers, zoom-cuts, glow rules, text rest).", mimeType: "application/json" }, async (uri) => json(uri, HOUSE_STYLES["saas-video"]));
  server.registerResource(
    "motion-typography-legibility",
    "motion://typography/legibility",
    { description: "Text-in-motion legibility rules (min size, chars/line, lines, CPS, hold, caption event bounds) and title/action safe areas for common comp sizes.", mimeType: "application/json" },
    async (uri) =>
      json(uri, {
        rules: LEGIBILITY_RULES,
        safeAreas: { "1920x1080": safeAreas(1920, 1080), "1080x1920": safeAreas(1080, 1920), "1080x1080": safeAreas(1080, 1080), "3840x2160": safeAreas(3840, 2160) },
        tool: "ae_text action=legibility",
        attribution: "Numbers from legibility.info (rules for text in videos), Netflix Timed Text Style Guide, BBC Subtitle Guidelines; safe areas per SMPTE/EBU practice. Prose is ours.",
      }),
  );
  server.registerResource(
    "motion-rubric-contact-sheet",
    "motion://rubric/contact-sheet",
    { description: "Atomic binary critique rubric: auto-evaluated items (from the keyframe dump) and vision items (judged from the contact sheet + onion skin).", mimeType: "application/json" },
    async (uri) =>
      json(uri, {
        items: RUBRIC,
        groups: ["timing", "easing", "choreography", "legibility", "spatial", "intent"],
        howTo: "Run ae_frame action=critique. Fix only failed items with the numeric corrections given, re-run once, then judge the unverifiable items from the images. Stop after two passes.",
        attribution: "Design after WebVR (arXiv 2603.13391) atomic rubrics and AniMINT (arXiv 2604.26148) findings on VLM animation judgement; both CC BY 4.0.",
      }),
  );
}
