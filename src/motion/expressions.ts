/**
 * Expression library with `{{param}}` placeholders. Every expression is ES3 so it runs
 * in both the legacy ExtendScript and the JavaScript expression engines.
 *
 * Attribution: inertia/bounce/spring/typewriter/counter patterns follow the shapes
 * documented by LobzyJay/motion-design-with-claude (MIT) and Dan Ebberts' classic
 * expressions; ekeys_style and ebox_responsive follow the concepts of eKeys and eBox
 * (motiondeveloper, MIT). All text here is re-written; see THIRD_PARTY_NOTICES.md.
 */

export type ParamValue = string | number | boolean;

export interface ExpressionParam {
  default: ParamValue;
  /** Numeric range, when meaningful. */
  range?: [number, number];
  description: string;
}

export interface ExpressionDef {
  description: string;
  /** Property kinds this is meant for. */
  appliesTo: string;
  template: string;
  params: Record<string, ExpressionParam>;
  source?: string;
}

const KEY_PREAMBLE =
  "n = 0;\nif (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\nif (n == 0) { t = 0; } else { t = time - key(n).time; }\n";

export const EXPRESSION_LIBRARY: Record<string, ExpressionDef> = {
  wiggle: {
    description: "Generic wiggle (kept for compatibility).",
    appliesTo: "any numeric property",
    template: "wiggle({{freq}}, {{amp}});",
    params: { freq: { default: 2, range: [0.1, 30], description: "Hz" }, amp: { default: 30, range: [0, 500], description: "amplitude in property units" } },
  },
  wiggle_slow: {
    description: "Slow, small wiggle (legacy alias of wiggle_drift with the old values).",
    appliesTo: "any numeric property",
    template: "wiggle({{freq}}, {{amp}});",
    params: { freq: { default: 0.5, range: [0.1, 2], description: "Hz" }, amp: { default: 10, range: [0, 100], description: "amplitude" } },
  },
  wiggle_drift: {
    description: "Slow organic drift: 0.5 Hz, 8 px. Ambient life on stills and orbs.",
    appliesTo: "position, rotation, scale",
    template: "wiggle({{freq}}, {{amp}});",
    params: { freq: { default: 0.5, range: [0.2, 1], description: "Hz" }, amp: { default: 8, range: [2, 30], description: "px (or units)" } },
  },
  wiggle_jitter: {
    description: "Fast tiny jitter: 24 Hz, 2 px. Handheld / glitch feel.",
    appliesTo: "position, rotation",
    template: "wiggle({{freq}}, {{amp}});",
    params: { freq: { default: 24, range: [10, 60], description: "Hz" }, amp: { default: 2, range: [0.5, 8], description: "px" } },
  },
  loop_cycle: {
    description: "Repeat the keyframed segment forever after the last key.",
    appliesTo: "any keyframed property",
    template: 'loopOut("cycle", {{keyframes}});',
    params: { keyframes: { default: 0, range: [0, 50], description: "how many keyframe segments to loop (0 = all)" } },
  },
  loop_pingpong: {
    description: "Play the keyframed segment forward then backward, forever.",
    appliesTo: "any keyframed property",
    template: 'loopOut("pingpong", {{keyframes}});',
    params: { keyframes: { default: 0, range: [0, 50], description: "segments to loop (0 = all)" } },
  },
  loop_offset: {
    description: "Repeat the segment, offsetting each cycle by the segment's delta (endless counters, rolling).",
    appliesTo: "any keyframed property",
    template: 'loopOut("offset", {{keyframes}});',
    params: { keyframes: { default: 0, range: [0, 50], description: "segments to loop (0 = all)" } },
  },
  loop_continue: {
    description: "Keep moving at the last key's velocity forever.",
    appliesTo: "any keyframed property",
    template: 'loopOut("continue");',
    params: {},
  },
  loop_in_cycle: {
    description: "Loop the first keyframed segment backwards before the first key.",
    appliesTo: "any keyframed property",
    template: 'loopIn("cycle", {{keyframes}});',
    params: { keyframes: { default: 0, range: [0, 50], description: "segments to loop (0 = all)" } },
  },
  inertia: {
    description: "Overshoot after every keyframe: the value keeps going, then settles with a damped sine. amp scales the velocity, freq is oscillations per second, decay how fast it dies.",
    appliesTo: "position, scale, rotation, any keyframed property",
    template:
      KEY_PREAMBLE +
      "if (n > 0 && t < 1) {\n  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n  amp = {{amp}}; freq = {{freq}}; decay = {{decay}};\n  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n} else { value; }",
    params: {
      amp: { default: 0.08, range: [0.04, 0.12], description: "overshoot amount as a fraction of the incoming velocity" },
      freq: { default: 3, range: [2, 4], description: "oscillations per second" },
      decay: { default: 6, range: [4, 8], description: "damping; higher settles faster" },
    },
    source: "Dan Ebberts inertia pattern; parameter ranges from LobzyJay/motion-design-with-claude (MIT)",
  },
  bounce: {
    description: "Bounce after every keyframe: like inertia but the overshoot is always on the far side (|sin|), so the element lands and bounces rather than oscillating.",
    appliesTo: "position, scale, any keyframed property",
    template:
      KEY_PREAMBLE +
      "if (n > 0 && t < 1) {\n  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n  amp = {{amp}}; freq = {{freq}}; decay = {{decay}};\n  value + v * amp * Math.abs(Math.sin(freq * t * 2 * Math.PI)) / Math.exp(decay * t);\n} else { value; }",
    params: {
      amp: { default: 0.08, range: [0.04, 0.12], description: "bounce height as a fraction of incoming velocity" },
      freq: { default: 3, range: [2, 4], description: "bounces per second" },
      decay: { default: 6, range: [4, 8], description: "damping" },
    },
    source: "LobzyJay/motion-design-with-claude (MIT) parameter ranges",
  },
  bounce_physics: {
    description: "Physically modelled bounce (gravity + elasticity) after the last keyframe: the legacy `bounce`.",
    appliesTo: "position (1D/2D/3D)",
    template:
      "e = {{elasticity}}; g = {{gravity}}; nMax = {{max_bounces}};\n" +
      "n = 0;\nif (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\nif (n > 0) {\n  t = time - key(n).time; v = -velocityAtTime(key(n).time - .001) * e; vl = length(v);\n  if (value instanceof Array) { vu = (vl > 0) ? normalize(v) : [0,0,0]; } else { vu = (v < 0) ? -1 : 1; }\n  tCur = 0; segDur = 2 * vl / g; tNext = segDur; nb = 1;\n  while (tNext < t && nb <= nMax) { vl *= e; segDur *= e; tCur = tNext; tNext += segDur; nb++; }\n  if (nb <= nMax) { delta = t - tCur; value + vu * delta * (vl - g * delta / 2); } else { value; }\n} else { value; }",
    params: {
      elasticity: { default: 0.7, range: [0.3, 0.9], description: "energy kept per bounce" },
      gravity: { default: 5000, range: [1000, 20000], description: "px/s²" },
      max_bounces: { default: 9, range: [1, 20], description: "stop after this many bounces" },
    },
    source: "Dan Ebberts bounce pattern (widely published)",
  },
  spring: {
    description: "Spring overshoot after the last key: softer, slower oscillation than inertia (fewer Hz, longer settle).",
    appliesTo: "position, scale, rotation",
    template:
      "amp = {{amp}}; freq = {{freq}}; decay = {{decay}};\n" +
      KEY_PREAMBLE +
      "if (n > 0) { v = velocityAtTime(key(n).time - thisComp.frameDuration / 10); value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t); } else { value; }",
    params: {
      amp: { default: 0.1, range: [0.05, 0.2], description: "overshoot as a fraction of velocity" },
      freq: { default: 2, range: [1, 4], description: "oscillations per second" },
      decay: { default: 3, range: [2, 6], description: "damping" },
    },
  },
  time_offset: {
    description: "Delay this layer's animation by its index: layer 1 plays on time, layer 2 `delay` later, etc. Apply the same expression to every layer for a free stagger.",
    appliesTo: "any keyframed property (copy the keys to each layer)",
    template: "delay = {{delay}}; base = {{base_index}};\nvalueAtTime(time - delay * Math.max(0, index - base));",
    params: {
      delay: { default: 0.06, range: [0.02, 0.2], description: "seconds per layer" },
      base_index: { default: 1, range: [1, 500], description: "layer index that plays with zero delay" },
    },
  },
  ekeys_style: {
    description: "Keyframes defined inline (no timeline keys): animate from `from` to `to` over `duration` starting at `start` with a curve (ease | linear | easeIn | easeOut). Edit the numbers instead of dragging keys. Concept from eKeys (motiondeveloper, MIT).",
    appliesTo: "any property; from/to must match the property's dimensions ([x,y] for 2D)",
    template: "t0 = {{start}}; d = {{duration}};\nfrom = {{from}}; to = {{to}};\n{{curve}}(time, t0, t0 + d, from, to);",
    params: {
      start: { default: 0, range: [0, 3600], description: "seconds (comp time)" },
      duration: { default: 0.5, range: [0.05, 10], description: "seconds" },
      from: { default: 0, description: "start value (number or [x, y] literal)" },
      to: { default: 100, description: "end value (number or [x, y] literal)" },
      curve: { default: "ease", description: "ease | linear | easeIn | easeOut" },
    },
    source: "eKeys concept (motiondeveloper, MIT); implementation is AE's built-in ease()/linear()",
  },
  ebox_responsive: {
    description: "Rectangle Size that follows the text bounds of a named text layer with padding: a responsive text box. Apply to ADBE Vector Rect Size. Pair with ebox_center for the rectangle Position. Concept from eBox (motiondeveloper, MIT).",
    appliesTo: "shape rectangle Size (ADBE Vector Rect Size)",
    template: 'src = thisComp.layer("{{target}}");\nr = src.sourceRectAtTime(time, false);\npad = {{padding}};\n[r.width + pad * 2, r.height + pad * 2];',
    params: {
      target: { default: "TARGET", description: "text layer name" },
      padding: { default: 24, range: [0, 400], description: "px on each side" },
    },
    source: "eBox concept (motiondeveloper, MIT)",
  },
  ebox_center: {
    description: "Rectangle Position that tracks the centre of a named text layer's bounds (in this shape layer's space). Companion of ebox_responsive; the shape layer should sit at the comp origin with default transforms.",
    appliesTo: "shape rectangle Position (ADBE Vector Rect Position)",
    template: 'src = thisComp.layer("{{target}}");\nr = src.sourceRectAtTime(time, false);\nc = src.toComp([r.left + r.width / 2, r.top + r.height / 2]);\nfromComp(c);',
    params: { target: { default: "TARGET", description: "text layer name" } },
    source: "eBox concept (motiondeveloper, MIT)",
  },
  typewriter: {
    description: "Reveal the source text character by character at `cps` characters per second starting `delay` seconds after the layer's in-point.",
    appliesTo: "Source Text (ADBE Text Document)",
    template: "s = String(value);\nn = Math.floor(Math.max(0, time - inPoint - {{delay}}) * {{cps}});\ns.substr(0, Math.min(s.length, n));",
    params: {
      cps: { default: 20, range: [4, 80], description: "characters per second" },
      delay: { default: 0, range: [0, 10], description: "seconds after in-point" },
    },
  },
  counter: {
    description: "Format a slider as a number: fixed decimals, thousands separator, prefix and suffix. Animate the slider, not the text.",
    appliesTo: "Source Text (ADBE Text Document); needs a Slider Control on the same layer",
    template:
      'v = effect("{{slider}}")("Slider");\nneg = v < 0; v = Math.abs(v);\ns = v.toFixed({{decimals}});\nparts = s.split("."); n = parts[0]; grp = "";\n' +
      'while (n.length > 3) { grp = "{{separator}}" + n.substr(n.length - 3) + grp; n = n.substr(0, n.length - 3); }\n' +
      '(neg ? "-" : "") + "{{prefix}}" + n + grp + (parts.length > 1 ? "." + parts[1] : "") + "{{suffix}}";',
    params: {
      slider: { default: "Slider Control", description: "effect name of the slider" },
      decimals: { default: 0, range: [0, 6], description: "fixed decimals" },
      separator: { default: ",", description: "thousands separator ('' for none)" },
      prefix: { default: "", description: "e.g. $" },
      suffix: { default: "", description: "e.g. %" },
    },
  },
  link_position: {
    description: "Follow another layer's position.",
    appliesTo: "position",
    template: 'thisComp.layer("{{target}}").transform.position;',
    params: { target: { default: "TARGET", description: "layer name" } },
  },
  follow_with_delay: {
    description: "Follow another layer's position with a time lag.",
    appliesTo: "position",
    template: 'thisComp.layer("{{target}}").transform.position.valueAtTime(time - {{delay}});',
    params: { target: { default: "TARGET", description: "layer name" }, delay: { default: 0.1, range: [0, 2], description: "seconds" } },
  },
  posterize_12: {
    description: "Hold the value at a lower frame rate (stop-motion feel).",
    appliesTo: "any property",
    template: "posterizeTime({{fps}}); value;",
    params: { fps: { default: 12, range: [1, 30], description: "frames per second" } },
  },
  text_bounds_width: {
    description: "Width of this text layer's bounds (drive underline lengths, boxes).",
    appliesTo: "any 1D property on a text layer",
    template: "thisLayer.sourceRectAtTime(time, false).width;",
    params: {},
  },
  time_seconds_counter: {
    description: "Seconds elapsed as text.",
    appliesTo: "Source Text",
    template: 'Math.floor(time) + "{{suffix}}";',
    params: { suffix: { default: "s", description: "unit suffix" } },
  },
  auto_fade_in_out: {
    description: "Fade in after in-point and out before out-point.",
    appliesTo: "opacity",
    template: "fadeIn = {{fade_in}}; fadeOut = {{fade_out}};\nlinear(time, inPoint, inPoint + fadeIn, 0, 100) * linear(time, outPoint - fadeOut, outPoint, 1, 0);",
    params: { fade_in: { default: 0.5, range: [0, 5], description: "seconds" }, fade_out: { default: 0.5, range: [0, 5], description: "seconds" } },
  },
  slider_driven: {
    description: "Drive the property from a slider control on this layer.",
    appliesTo: "any 1D property",
    template: 'effect("{{slider}}")("Slider");',
    params: { slider: { default: "Slider Control", description: "effect name of the slider" } },
  },
};

export function expressionNames(): string[] {
  return Object.keys(EXPRESSION_LIBRARY);
}

function escapeForExpression(v: ParamValue): string {
  if (typeof v === "string") return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return String(v);
}

/**
 * Fill a library expression's `{{param}}` placeholders. Unknown params are
 * rejected; missing ones take their defaults. Returns the text and the params used.
 */
export function fillExpression(name: string, params: Record<string, ParamValue> = {}): { expression: string; params: Record<string, ParamValue>; warnings: string[] } {
  const def = EXPRESSION_LIBRARY[name];
  if (!def) throw new Error(`Unknown library expression "${name}". Known: ${expressionNames().join(", ")}`);
  const warnings: string[] = [];
  const used: Record<string, ParamValue> = {};
  for (const [k, spec] of Object.entries(def.params)) used[k] = spec.default;
  for (const [k, v] of Object.entries(params)) {
    if (!(k in def.params)) {
      warnings.push(`Param "${k}" is not used by ${name} (accepted: ${Object.keys(def.params).join(", ") || "none"})`);
      continue;
    }
    const spec = def.params[k];
    if (spec.range && typeof v === "number" && (v < spec.range[0] || v > spec.range[1])) warnings.push(`${k}=${v} is outside the suggested range ${spec.range[0]}–${spec.range[1]}`);
    used[k] = v;
  }
  const expression = def.template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => (key in used ? escapeForExpression(used[key]) : `{{${key}}}`));
  return { expression, params: used, warnings };
}

/** Library summary for descriptions and resources. */
export function expressionCatalog() {
  return Object.entries(EXPRESSION_LIBRARY).map(([name, def]) => ({ name, description: def.description, appliesTo: def.appliesTo, params: def.params, source: def.source }));
}

export const EXPRESSION_ATTRIBUTION = [
  "LobzyJay/motion-design-with-claude — MIT (inertia/bounce parameter ranges, expression patterns)",
  "eKeys and eBox by motiondeveloper (Tim Haywood) — MIT (concepts for ekeys_style, ebox_responsive, ebox_center)",
  "Dan Ebberts — inertia and bounce expression patterns (widely published)",
];
