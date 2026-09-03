/**
 * plan_motion: turn an intent (+ optional device, distance, item count) into concrete
 * numbers — register, duration, ease, stagger — using the taxonomy, duration, stagger
 * and ease tables. Pure data, no After Effects round trip.
 */
import { ARCHETYPES, DEVICES, INTENTS, REGISTERS, SILIA_ARCHETYPE, type Device, type Intent, type Register } from "./taxonomy.js";
import { DURATION_ATTRIBUTION, durationFor, snapToFrames } from "./durations.js";
import { STAGGER_ATTRIBUTION, staggerFor } from "./staggers.js";
import { EASE_ATTRIBUTION, bezierToInfluence, resolveEase } from "./eases.js";
import { SAAS_VIDEO_STYLE } from "./house-style.js";

export interface PlanMotionInput {
  intent: Intent;
  device?: Device;
  distance_px?: number;
  register?: Register;
  item_count?: number;
  item_duration_ms?: number;
  fps?: number;
}

type Band = "micro" | "small" | "standard" | "large" | "hero";
type Role = "enter" | "exit" | "within" | "hero";

const INTENT_PLAN: Record<Intent, { band: Band; role: Role; why: string }> = {
  transition: { band: "large", role: "within", why: "Continuity between states: symmetric in-out ease, large band." },
  demonstration: { band: "standard", role: "within", why: "The motion is the content: readable standard duration, in-out ease." },
  guidance: { band: "standard", role: "enter", why: "Lead the eye: decelerating entrance at standard duration." },
  feedback: { band: "small", role: "enter", why: "Confirm quickly: small band, ease-out so it lands immediately." },
  visualization: { band: "large", role: "within", why: "Quantities need time to be read: large band; counters may use linear." },
  highlight: { band: "small", role: "enter", why: "Emphasis pops in fast and decelerates." },
  aesthetic: { band: "hero", role: "hero", why: "Brand flavour: hero band and the longest deceleration the register allows." },
};

function easeInfo(name: string) {
  const e = resolveEase(name);
  if (!e) return { name, bezier: null as null | [number, number, number, number], inInfluence: 33.33, outInfluence: 33.33 };
  const inf = bezierToInfluence(e.bezier);
  return { name: e.name, bezier: e.bezier, inInfluence: inf.inInfluence, outInfluence: inf.outInfluence, role: e.role, overshoots: e.overshoots ?? false, css: e.name === "linear" ? "linear" : `cubic-bezier(${e.bezier.join(", ")})` };
}

export function planMotion(input: PlanMotionInput) {
  const intent = input.intent;
  if (!INTENTS[intent]) throw new Error(`Unknown intent "${intent}". Known: ${Object.keys(INTENTS).join(", ")}`);
  if (input.device && !DEVICES[input.device]) throw new Error(`Unknown device "${input.device}". Known: ${Object.keys(DEVICES).join(", ")}`);
  const fps = input.fps && input.fps > 0 ? input.fps : 30;
  const register: Register = input.register ?? (intent === "feedback" ? "functional_ui" : ARCHETYPES[SILIA_ARCHETYPE].register);
  const spec = REGISTERS[register];
  const plan = INTENT_PLAN[intent];

  // Duration: distance-aware when a distance is given, otherwise the band midpoint.
  let bandName: Band = plan.band;
  let band = spec.durations[bandName];
  if (!band) {
    bandName = "large";
    band = spec.durations.large;
  }
  let durationMs: number;
  let durationFrames: number;
  let durationRule: string;
  if (input.distance_px !== undefined && input.distance_px !== null) {
    const d = durationFor(input.distance_px, register, fps);
    durationMs = d.ms;
    durationFrames = d.frames ?? snapToFrames(d.ms, fps).frames;
    durationRule = `distance ${input.distance_px} px → ${d.rawMs} ms raw, clamped to ${d.band[0]}–${d.band[1]} ms, snapped to ${fps} fps`;
  } else {
    const mid = (band[0] + band[1]) / 2;
    const s = snapToFrames(mid, fps);
    durationMs = s.ms;
    durationFrames = s.frames;
    durationRule = `${register} ${bandName} band ${band[0]}–${band[1]} ms → midpoint snapped to ${fps} fps`;
  }
  const maxSingle = spec.durations.maxSingleMs;

  // Eases by role.
  const roleName: Role = plan.role;
  const enterName = spec.eases.enter;
  const easeName = roleName === "hero" ? (spec.eases.hero ?? spec.eases.enter) : spec.eases[roleName];
  const ease = easeInfo(easeName);
  const exitEase = easeInfo(spec.eases.exit);
  const enterEase = easeInfo(enterName);

  // Stagger.
  const n = input.item_count ?? 1;
  const itemDur = input.item_duration_ms ?? durationMs;
  const stagger = staggerFor(n, register, itemDur);

  const rules: string[] = [];
  rules.push(`${register}: ${spec.description}`);
  rules.push(plan.why);
  rules.push(`Nothing meant to be seen shorter than ${spec.durations.minVisibleMs} ms; no single tween over ${maxSingle} ms without a narrative reason.`);
  rules.push(`Scale entrances start at ${spec.scaleFrom[0]}–${spec.scaleFrom[1]}, never 0; spring bounce ≤ ${spec.springBounceMax}; motion blur ${spec.motionBlur ? "on" : "off"}.`);
  if (n > 1) rules.push(`Stagger ${stagger.perItemMs} ms per item (${stagger.rule}); whole sequence ${stagger.sequenceMs} ms (cap ${stagger.capMs}).`);
  if (input.device) rules.push(`${input.device}: ${DEVICES[input.device].gloss} AE: ${DEVICES[input.device].aeTechnique}`);
  if (ease.overshoots) rules.push(`${ease.name} overshoots: AE needs an extra keyframe or the inertia expression (ae_expression library=inertia).`);
  if (intent === "visualization") rules.push("Counters and progress that encode quantity may run linear so the rate reads honestly; ease only the container.");
  if (register === "product_video") {
    const wanted = new Set<string>(["one_focal_motion", "scale_from", "text_rest"]);
    if (roleName === "hero") wanted.add("hero_reveal");
    if (roleName === "enter") wanted.add("ui_entrance");
    if (n > 1) wanted.add("stagger");
    if (input.device === "dolly_and_zoom") wanted.add("zoom_cut");
    for (const r of SAAS_VIDEO_STYLE.rules) if (wanted.has(r.id)) rules.push(`House style (opinion): ${r.rule}`);
  }

  return {
    intent,
    intentDescription: INTENTS[intent],
    device: input.device ?? null,
    register,
    archetype: SILIA_ARCHETYPE,
    fps,
    durationMs,
    durationFrames,
    durationSeconds: Math.round((durationMs / 1000) * 1000) / 1000,
    durationRule,
    band: { name: bandName, ms: band },
    ease,
    enterEase,
    exitEase,
    staggerMs: n > 1 ? stagger.perItemMs : 0,
    sequenceMs: stagger.sequenceMs,
    itemCount: n,
    rules,
    aeCalls: [
      `ae_keyframes set path=<prop> keys=[{time: t0, value: from}, {time: t0 + ${durationMs / 1000}, value: to, ease: "${ease.name}"}]`,
      `ae_ease preset=${ease.name} (or from_cubic_bezier ${JSON.stringify(ease.bezier)})`,
      n > 1 ? `ae_keyframes offset dt=${stagger.perItemMs / 1000} per subsequent layer` : null,
    ].filter(Boolean),
    sources: [...new Set([...EASE_ATTRIBUTION, ...DURATION_ATTRIBUTION, ...STAGGER_ATTRIBUTION, "Registers, intents, devices: src/motion/taxonomy.ts (AniMINT intents CC BY 4.0; UX in Motion Manifesto principle names)", ...(register === "product_video" ? SAAS_VIDEO_STYLE.attribution : [])])],
  };
}
