/**
 * Motion taxonomy shared by tools, resources, the rubric and the Silia layer.
 *
 * Sources (numbers are facts; prose is ours):
 * - Registers: IBM Carbon motion (Apache-2.0), Material 3 (CC BY 4.0), Fluent 2,
 *   Atlassian, Val Head "How fast should your UI animations be?" (200–500 ms band).
 *   The product_video register is a house style sheet (no authoritative public spec).
 * - Intents: AniMINT, "Beyond Screenshots: Evaluating VLMs' Understanding of UI
 *   Animations" (arXiv 2604.26148, CC BY 4.0) — 7 animation purposes.
 * - Devices: UX in Motion Manifesto (Issara Willenskomer) — the 12 principle NAMES only;
 *   glosses and AE mappings are ours.
 * - Archetypes: LottieFiles motion-design-skill personalities (concept + names only).
 */

export type Register = "functional_ui" | "product_video";

export interface RegisterSpec {
  id: Register;
  description: string;
  /** Milliseconds. */
  durations: {
    micro: [number, number];
    small: [number, number];
    standard: [number, number];
    large: [number, number];
    hero: [number, number] | null;
    /** Any single tween longer than this needs a narrative reason. */
    maxSingleMs: number;
    /** Anything meant to be *seen* (not just felt) should not be shorter than this. */
    minVisibleMs: number;
  };
  /** Per-item stagger, ms, and cap for the whole choreographed sequence. */
  stagger: { perItemMs: [number, number]; sequenceCapMs: number };
  /** Default easing families by role (names resolve in src/motion/eases.ts). */
  eases: { enter: string; exit: string; within: string; hero?: string };
  /** Scale entrances start here, never from 0. */
  scaleFrom: [number, number];
  springBounceMax: number;
  motionBlur: boolean;
}

export const REGISTERS: Record<Register, RegisterSpec> = {
  functional_ui: {
    id: "functional_ui",
    description: "Interface motion the viewer operates: feedback, state changes, transitions. Fast, ease-out dominant, tight staggers.",
    durations: { micro: [50, 100], small: [100, 150], standard: [200, 300], large: [300, 400], hero: null, maxSingleMs: 500, minVisibleMs: 100 },
    stagger: { perItemMs: [20, 40], sequenceCapMs: 500 },
    eases: { enter: "fluent_ease_out", exit: "fluent_ease_in", within: "carbon_productive_standard" },
    scaleFrom: [0.96, 0.98],
    springBounceMax: 0.1,
    motionBlur: false,
  },
  product_video: {
    id: "product_video",
    description: "Marketing / product video the viewer watches: hero reveals, staged UI, kinetic type. Slower, expo/quint eases, wider staggers, motion blur.",
    durations: { micro: [100, 160], small: [200, 320], standard: [300, 500], large: [500, 700], hero: [600, 900], maxSingleMs: 1000, minVisibleMs: 160 },
    stagger: { perItemMs: [60, 120], sequenceCapMs: 2000 },
    eases: { enter: "ease_out_quart", exit: "power2_in", within: "power3_in_out", hero: "ease_out_expo" },
    scaleFrom: [0.96, 0.98],
    springBounceMax: 0.1,
    motionBlur: true,
  },
};

export type Intent = "transition" | "demonstration" | "guidance" | "feedback" | "visualization" | "highlight" | "aesthetic";

export const INTENTS: Record<Intent, string> = {
  transition: "Moves the viewer between states or scenes; continuity is the goal.",
  demonstration: "Shows how something works; the motion IS the content.",
  guidance: "Directs attention to where to look or act next.",
  feedback: "Confirms that something happened (a press, a save, a success).",
  visualization: "Encodes data or quantity in motion (charts, counters, progress).",
  highlight: "Emphasises one element among others (underline, glow, pop).",
  aesthetic: "Adds character or brand flavour without a functional message.",
};

export type Device =
  | "easing"
  | "offset_and_delay"
  | "parenting"
  | "transformation"
  | "value_change"
  | "masking"
  | "overlay"
  | "cloning"
  | "obscuration"
  | "parallax"
  | "dimensionality"
  | "dolly_and_zoom";

export interface DeviceSpec {
  gloss: string;
  aeTechnique: string;
}

export const DEVICES: Record<Device, DeviceSpec> = {
  easing: { gloss: "Acceleration profile that makes motion read as physical.", aeTechnique: "KeyframeEase via ae_ease (preset / from_cubic_bezier); never linear except loops." },
  offset_and_delay: { gloss: "Related elements start at staggered times to create hierarchy.", aeTechnique: "Stagger layer in-points or keyframe times (ae_keyframes offset); text animators with range selector offset." },
  parenting: { gloss: "One element's motion drives others.", aeTechnique: "Layer parenting (ae_layer_update set_parent) or expressions linking properties." },
  transformation: { gloss: "An element changes shape or role while staying continuous.", aeTechnique: "Shape path keyframes, scale/rotation on the same layer, precomp swap under a matte." },
  value_change: { gloss: "A number or quantity animates rather than jumping.", aeTechnique: "Slider control + source-text expression, or ae_text set_keyframes with hold interpolation." },
  masking: { gloss: "Revealing or hiding through a shape.", aeTechnique: "Track matte (ae_layer_update set_matte), masks (ae_masks), luma matte from footage." },
  overlay: { gloss: "Layered planes communicate stacking order.", aeTechnique: "Z-order (ae_layer_update reorder) plus opacity/blur to separate planes." },
  cloning: { gloss: "New elements spawn from an existing one.", aeTechnique: "Duplicate + offset (ae_layer_update duplicate), shape repeater (ae_shape add_repeater)." },
  obscuration: { gloss: "Blur or dimming tells the viewer what is not the focus.", aeTechnique: "Gaussian blur / dim adjustment layer that dissolves off (silia_grade pattern)." },
  parallax: { gloss: "Layers move at different rates to imply depth.", aeTechnique: "3D layers with camera, or 2D position scaled per depth." },
  dimensionality: { gloss: "Elements appear to have volume or a back side.", aeTechnique: "3D layers, card flips via Y rotation, extruded shapes." },
  dolly_and_zoom: { gloss: "The camera moves toward or away from content.", aeTechnique: "Camera Z or scale on a precomp (silia_push_25d, zoom_punch pattern)." },
};

export type Archetype = "playful" | "premium" | "corporate" | "energetic";

export interface ArchetypeSpec {
  description: string;
  register: Register;
  easeBias: string;
  durationBias: "shorter" | "neutral" | "longer";
  overshoot: boolean;
}

export const ARCHETYPES: Record<Archetype, ArchetypeSpec> = {
  playful: { description: "Bouncy, overshooting, squash-and-stretch friendly.", register: "product_video", easeBias: "back_out", durationBias: "neutral", overshoot: true },
  premium: { description: "Slow-in-fast-out, long decelerations, restraint; one focal motion at a time.", register: "product_video", easeBias: "ease_out_expo", durationBias: "longer", overshoot: false },
  corporate: { description: "Predictable, symmetric, standard curves, few surprises.", register: "functional_ui", easeBias: "carbon_productive_standard", durationBias: "neutral", overshoot: false },
  energetic: { description: "Fast cuts, snappy eases, punchy scale.", register: "product_video", easeBias: "snappy", durationBias: "shorter", overshoot: false },
};

/** Silia's default personality. */
export const SILIA_ARCHETYPE: Archetype = "premium";

/** Carbon's entrance order for screens: static shell → static body → dynamic data → primary action → animated content. */
export const ENTRANCE_ORDER = ["shell", "body", "data", "action", "dataviz"] as const;

export function registerFor(archetype: Archetype = SILIA_ARCHETYPE): RegisterSpec {
  return REGISTERS[ARCHETYPES[archetype].register];
}
