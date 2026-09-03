import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, colorValue, easeSpec } from "./refs.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

export function getTextTools(ctx: ToolContext): ToolRecord {
  return {
    ae_text: {
      description:
        "Text layer document. get: TextDocument snapshot (text, font, size, fill, stroke, tracking, leading, justification, box). set: change any of those (font by PostScript name; read-back flags silent font substitution). set_keyframes: hold keyframes of source text [{time, text}] (captions, counters). fonts: list installed fonts (AE 24+) with optional regex filter (postScriptName, family, style).",
      parameters: {
        action: z.enum(["get", "set", "set_keyframes", "fonts"]),
        comp: compRef,
        layer: layerRef.optional(),
        text: z.string().optional(),
        font: z.string().optional().describe("PostScript name, e.g. ESKlarheitGrotesk-Bk / ESKlarheitGrotesk-Md."),
        size: z.number().positive().optional(),
        fill: colorValue.nullable().optional().describe("null disables fill."),
        stroke: colorValue.nullable().optional(),
        stroke_width: z.number().min(0).optional(),
        tracking: z.number().optional(),
        leading: z.number().optional().describe("Line spacing in px; use auto_leading=true to reset."),
        auto_leading: z.boolean().optional(),
        justify: z.enum(["left", "center", "right", "justify_full", "justify_last_left", "justify_last_center", "justify_last_right"]).optional(),
        box_size: z.array(z.number().positive()).length(2).optional(),
        all_caps: z.boolean().optional(),
        faux_bold: z.boolean().optional(),
        faux_italic: z.boolean().optional(),
        baseline_shift: z.number().optional(),
        at: z.number().min(0).optional().describe("set: write as a keyframe at this time (if animated)."),
        keyframes: z.array(z.object({ time: z.number().min(0), text: z.string() })).optional(),
        clear_existing: z.boolean().optional(),
        regex: z.string().optional().describe("fonts: filter."),
        limit: z.number().int().min(1).max(2000).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          if (a.action === "fonts") {
            if (!app.fonts || !app.fonts.allFonts) return __error("app.fonts needs After Effects 24+", "VERSION_UNSUPPORTED");
            var re = a.regex ? new RegExp(a.regex, "i") : null; var out = []; var limit = a.limit || 400; var fams = app.fonts.allFonts;
            for (var f = 0; f < fams.length && out.length < limit; f++) for (var s = 0; s < fams[f].length && out.length < limit; s++) { var fo = fams[f][s]; var rec = { postScriptName: fo.postScriptName, family: fo.familyName, style: fo.styleName }; try { rec.type = fo.technology; } catch (e0) {} if (!re || re.test(rec.postScriptName) || re.test(rec.family) || re.test(rec.style)) out.push(rec); }
            return __result({ families: fams.length, count: out.length, fonts: out });
          }
          var c = __comp(a.comp);
          if (a.layer === undefined) return __error("layer required", "BAD_ARG");
          var l = __layer(c, a.layer);
          if (!(l instanceof TextLayer)) return __error("Layer is not a text layer", "BAD_ARG");
          var docProp = l.property("ADBE Text Properties").property("ADBE Text Document");
          function readBack() { var d = __textDoc(docProp.value); d.numKeys = docProp.numKeys; d.layer = l.name; try { var r = l.sourceRectAtTime(c.time, false); d.bounds = { left: __round(r.left), top: __round(r.top), width: __round(r.width), height: __round(r.height) }; } catch (e1) {} return d; }
          if (a.action === "get") return __result(readBack());
          if (a.action === "set_keyframes") {
            if (!a.keyframes || !a.keyframes.length) return __error("keyframes required", "BAD_ARG");
            __mutate("Text keyframes", function () {
              if (a.clear_existing) for (var q = docProp.numKeys; q >= 1; q--) docProp.removeKey(q);
              for (var i = 0; i < a.keyframes.length; i++) { var d = docProp.value; d.text = a.keyframes[i].text; docProp.setValueAtTime(a.keyframes[i].time, d); var k = docProp.nearestKeyIndex(a.keyframes[i].time); docProp.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); }
            });
            var rb = readBack(); rb.keys = []; for (var k2 = 1; k2 <= docProp.numKeys; k2++) rb.keys.push({ index: k2, time: __round(docProp.keyTime(k2)), text: docProp.keyValue(k2).text });
            return __result(rb);
          }
          if (a.action === "set") {
            var warnFont = null;
            __mutate("Set text", function () {
              var d = a.at !== undefined && docProp.numKeys ? docProp.valueAtTime(a.at, false) : docProp.value;
              if (a.text !== undefined) d.text = a.text;
              if (a.font) d.font = a.font;
              if (a.size) d.fontSize = a.size;
              if (a.fill === null) d.applyFill = false; else if (a.fill) { d.applyFill = true; d.fillColor = __color(a.fill); }
              if (a.stroke === null) d.applyStroke = false; else if (a.stroke) { d.applyStroke = true; d.strokeColor = __color(a.stroke); if (a.stroke_width !== undefined) d.strokeWidth = a.stroke_width; else if (!d.strokeWidth) d.strokeWidth = 1; } else if (a.stroke_width !== undefined) { d.strokeWidth = a.stroke_width; }
              if (a.tracking !== undefined) d.tracking = a.tracking;
              if (a.auto_leading) d.autoLeading = true; else if (a.leading !== undefined) { d.autoLeading = false; d.leading = a.leading; }
              if (a.justify) d.justification = __justValue(a.justify);
              if (a.box_size) { if (!d.boxText) __warn("Layer is point text; box_size ignored (create with kind=box_text)"); else d.boxTextSize = a.box_size; }
              if (a.all_caps !== undefined) d.allCaps = a.all_caps;
              if (a.faux_bold !== undefined) d.fauxBold = a.faux_bold;
              if (a.faux_italic !== undefined) d.fauxItalic = a.faux_italic;
              if (a.baseline_shift !== undefined) d.baselineShift = a.baseline_shift;
              if (docProp.numKeys) docProp.setValueAtTime(a.at !== undefined ? a.at : c.time, d); else docProp.setValue(d);
              if (a.font) { var back = docProp.value.font; if (back !== a.font) warnFont = "Font substituted: asked " + a.font + ", AE reports " + back; }
            });
            if (warnFont) __warn(warnFont);
            return __result(readBack());
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },

    ae_text_animator: {
      description:
        "Text animators and range selectors. list; add an animator with properties {opacity, position:[x,y], scale:[x,y], rotation, tracking, blur:[x,y], fill:'#hex', line_spacing} and a range selector {start,end,offset, based_on chars|chars_no_spaces|words|lines, shape square|ramp_up|ramp_down|triangle|round|smooth, ease_high, ease_low, randomize}; set_selector keyframes {start|end|offset: [{time,value,ease}]}; set_property; remove; preset: letter_stagger | word_stagger | line_rise | typewriter | blur_in with {duration_per_unit, stagger, ease, start_time} (builds animator + offset keyframes).",
      parameters: {
        action: z.enum(["list", "add", "set_selector", "set_property", "remove", "preset"]),
        comp: compRef,
        layer: layerRef,
        animator: z.union([z.number().int().min(1), z.string()]).optional().describe("Animator index or name (set_selector/set_property/remove)."),
        name: z.string().optional(),
        properties: z.object({ opacity: z.number().optional(), position: z.array(z.number()).min(2).max(3).optional(), scale: z.array(z.number()).min(2).max(3).optional(), rotation: z.number().optional(), tracking: z.number().optional(), blur: z.array(z.number()).length(2).optional(), fill: colorValue.optional(), line_spacing: z.array(z.number()).length(2).optional(), skew: z.number().optional() }).optional(),
        selector: z.object({ start: z.number().min(0).max(100).optional(), end: z.number().min(0).max(100).optional(), offset: z.number().min(-100).max(100).optional(), based_on: z.enum(["chars", "chars_no_spaces", "words", "lines"]).optional(), shape: z.enum(["square", "ramp_up", "ramp_down", "triangle", "round", "smooth"]).optional(), ease_high: z.number().min(-100).max(100).optional(), ease_low: z.number().min(-100).max(100).optional(), randomize: z.boolean().optional(), mode: z.enum(["add", "subtract", "intersect", "min", "max", "difference"]).optional() }).optional(),
        keyframes: z.object({ start: z.array(z.object({ time: z.number(), value: z.number(), ease: easeSpec.optional() })).optional(), end: z.array(z.object({ time: z.number(), value: z.number(), ease: easeSpec.optional() })).optional(), offset: z.array(z.object({ time: z.number(), value: z.number(), ease: easeSpec.optional() })).optional() }).optional(),
        preset: z.enum(["letter_stagger", "word_stagger", "line_rise", "typewriter", "blur_in"]).optional(),
        duration_per_unit: z.number().positive().optional().describe("preset: seconds each unit takes to appear (default 0.32)."),
        stagger: z.number().min(0).optional().describe("preset: seconds between units (default 0.032)."),
        ease: easeSpec.optional(),
        start_time: z.number().min(0).optional(),
        rise_px: z.number().optional().describe("letter_stagger/line_rise: vertical travel (default 18)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer);
          if (!(l instanceof TextLayer)) return __error("Layer is not a text layer", "BAD_ARG");
          var animators = l.property("ADBE Text Properties").property("ADBE Text Animators");
          var PROPS = { opacity: "ADBE Text Opacity", position: "ADBE Text Position 3D", scale: "ADBE Text Scale 3D", rotation: "ADBE Text Rotation", tracking: "ADBE Text Tracking Amount", blur: "ADBE Text Blur", fill: "ADBE Text Fill Color", line_spacing: "ADBE Text Line Spacing", skew: "ADBE Text Skew" };
          function findAnim(ref) { if (typeof ref === "number") { if (ref < 1 || ref > animators.numProperties) __fail("Animator index out of range", "NOT_FOUND"); return animators.property(ref); } for (var i = 1; i <= animators.numProperties; i++) if (animators.property(i).name === ref) return animators.property(i); __fail("Animator not found: " + ref, "NOT_FOUND"); }
          function animInfo(an) { var props = an.property("ADBE Text Animator Properties"); var sels = an.property("ADBE Text Selectors"); var o = { index: an.propertyIndex, name: an.name, enabled: an.enabled, properties: [], selectors: [] }; for (var i = 1; i <= props.numProperties; i++) o.properties.push(__propInfo(props.property(i))); for (var s = 1; s <= sels.numProperties; s++) { var sel = sels.property(s); var si = { index: s, name: sel.name, matchName: sel.matchName }; try { si.start = sel.property("ADBE Text Percent Start").value; si.end = sel.property("ADBE Text Percent End").value; si.offset = sel.property("ADBE Text Percent Offset").value; si.startKeys = sel.property("ADBE Text Percent Start").numKeys; si.offsetKeys = sel.property("ADBE Text Percent Offset").numKeys; var adv = sel.property("ADBE Text Range Advanced"); si.basedOn = adv.property("ADBE Text Range Type2").value; si.shape = adv.property("ADBE Text Range Shape").value; } catch (e0) {} o.selectors.push(si); } return o; }
          function setProps(an, props) { var grp = an.property("ADBE Text Animator Properties"); for (var k in props) { if (!props.hasOwnProperty(k) || !PROPS[k]) continue; var mn = PROPS[k]; var p = null; try { if (grp.canAddProperty(mn)) p = grp.addProperty(mn); } catch (eAdd) {} if (!p) p = grp.property(mn); if (!p) __fail("Cannot add animator property " + mn, "BAD_ARG"); var v = props[k]; if (k === "fill") v = __color(v); if ((k === "position" || k === "scale") && v.length === 2) v = [v[0], v[1], k === "scale" ? 100 : 0]; p.setValue(v); } }
          function setSelector(an, sel) { var sels = an.property("ADBE Text Selectors"); var s = sels.numProperties ? sels.property(1) : sels.addProperty("ADBE Text Selector"); if (sel.start !== undefined) s.property("ADBE Text Percent Start").setValue(sel.start); if (sel.end !== undefined) s.property("ADBE Text Percent End").setValue(sel.end); if (sel.offset !== undefined) s.property("ADBE Text Percent Offset").setValue(sel.offset); var adv = s.property("ADBE Text Range Advanced"); if (sel.based_on) adv.property("ADBE Text Range Type2").setValue({ chars: 1, chars_no_spaces: 2, words: 3, lines: 4 }[sel.based_on]); if (sel.shape) adv.property("ADBE Text Range Shape").setValue({ square: 1, ramp_up: 2, ramp_down: 3, triangle: 4, round: 5, smooth: 6 }[sel.shape]); if (sel.ease_high !== undefined) adv.property("ADBE Text Levels Max Ease").setValue(sel.ease_high); if (sel.ease_low !== undefined) adv.property("ADBE Text Levels Min Ease").setValue(sel.ease_low); if (sel.randomize !== undefined) adv.property("ADBE Text Randomize Order").setValue(sel.randomize ? 1 : 0); if (sel.mode) adv.property("ADBE Text Selector Mode").setValue({ add: 1, subtract: 2, intersect: 3, min: 4, max: 5, difference: 6 }[sel.mode]); return s; }
          function setKeys(an, kf) { var s = an.property("ADBE Text Selectors").property(1); var map = { start: "ADBE Text Percent Start", end: "ADBE Text Percent End", offset: "ADBE Text Percent Offset" }; var out = {}; for (var k in map) if (kf[k]) out[k] = __setKeys(s.property(map[k]), kf[k]); return out; }
          if (a.action === "list") { var out = []; for (var i = 1; i <= animators.numProperties; i++) out.push(animInfo(animators.property(i))); return __result({ layer: l.name, animators: out }); }
          var res;
          __mutate("Text animator " + a.action, function () {
            if (a.action === "add") { var an = animators.addProperty("ADBE Text Animator"); if (a.name) an.name = a.name; setProps(an, a.properties || {}); var s = setSelector(an, a.selector || {}); if (a.keyframes) setKeys(an, a.keyframes); res = animInfo(an); }
            else if (a.action === "preset") {
              var dur = a.duration_per_unit || 0.32, stag = a.stagger || 0.032, t0 = a.start_time !== undefined ? a.start_time : l.inPoint, ease = a.ease || "power3_out", rise = a.rise_px !== undefined ? a.rise_px : 18;
              var text = l.property("ADBE Text Properties").property("ADBE Text Document").value.text;
              var units = a.preset === "word_stagger" ? text.split(/\\s+/).length : a.preset === "line_rise" ? text.split(/\\r|\\n/).length : text.replace(/\\s/g, "").length;
              var an2 = animators.addProperty("ADBE Text Animator"); an2.name = a.name || ("AE MCP " + a.preset);
              var props = {};
              if (a.preset === "letter_stagger" || a.preset === "word_stagger" || a.preset === "line_rise") { props.opacity = 0; props.position = [0, rise, 0]; }
              else if (a.preset === "typewriter") { props.opacity = 0; }
              else if (a.preset === "blur_in") { props.opacity = 0; props.blur = [30, 30]; }
              setProps(an2, props);
              var basedOn = a.preset === "word_stagger" ? "words" : a.preset === "line_rise" ? "lines" : "chars";
              var sel2 = setSelector(an2, { start: 0, end: 100, offset: -100, based_on: basedOn, shape: a.preset === "typewriter" ? "square" : "ramp_up", ease_high: a.preset === "typewriter" ? 0 : 0 });
              // Offset travels -100 -> 100; total time = dur + stagger*(units-1).
              var total = dur + stag * Math.max(0, units - 1);
              var offProp = sel2.property("ADBE Text Percent Offset");
              __setKeys(offProp, [{ time: t0, value: -100, ease: a.preset === "typewriter" ? "linear" : ease }, { time: t0 + total, value: 100, ease: a.preset === "typewriter" ? "linear" : ease }]);
              if (a.preset !== "typewriter") { try { sel2.property("ADBE Text Range Advanced").property("ADBE Text Levels Max Ease").setValue(a.preset === "blur_in" ? 60 : 40); } catch (e2) {} }
              res = animInfo(an2); res.units = units; res.totalDuration = __round(total); res.startTime = t0;
            }
            else {
              var target = findAnim(a.animator !== undefined ? a.animator : animators.numProperties);
              if (a.action === "set_selector") { setSelector(target, a.selector || {}); if (a.keyframes) setKeys(target, a.keyframes); res = animInfo(target); }
              else if (a.action === "set_property") { setProps(target, a.properties || {}); res = animInfo(target); }
              else if (a.action === "remove") { var snap = animInfo(target); target.remove(); res = { removed: snap, remaining: animators.numProperties }; }
              else __fail("Unknown action " + a.action, "BAD_ARG");
            }
          });
          return __result(res);
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
