import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, propPath, propValue, easeSpec } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { EXPRESSION_LIBRARY, expressionNames, fillExpression, type ParamValue } from "../motion/expressions.js";
import { easesByCategory, easeNames, EASE_ATTRIBUTION } from "../motion/eases.js";

export function getPropertyTools(ctx: ToolContext): ToolRecord {
  return {
    ae_property_get: {
      description:
        "Read properties by matchName path. value: one property snapshot (value at time, keys, expression). tree: the property tree under a layer or a group path, to depth. search: find properties whose matchName or name matches a regex anywhere under the layer (returns paths). Use this to discover paths before setting anything.",
      parameters: {
        action: z.enum(["value", "tree", "search"]),
        comp: compRef,
        layer: layerRef,
        path: propPath.optional().describe("value: the property. tree: group path to start at (default the layer)."),
        at: z.number().min(0).optional(),
        depth: z.number().int().min(1).max(8).optional().describe("tree: default 2."),
        only_animatable: z.boolean().optional(),
        regex: z.string().optional().describe("search: case-insensitive regex on matchName or display name."),
        limit: z.number().int().min(1).max(500).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer);
          if (a.action === "value") { if (!a.path) return __error("path required", "BAD_ARG"); var p = __prop(l, a.path); var info = __propInfo(p, a.at); if (p.propertyType === PropertyType.PROPERTY && p.numKeys > 0) info.keys = __keyList(p); return __result(info); }
          if (a.action === "tree") { var root = a.path ? __prop(l, a.path) : l; return __result({ layer: l.name, root: a.path || "(layer)", properties: __propTree(root, a.depth || 2, a.only_animatable === true) }); }
          if (a.action === "search") {
            if (!a.regex) return __error("regex required", "BAD_ARG");
            var re = new RegExp(a.regex, "i"); var out = []; var limit = a.limit || 100;
            function walk(g, depth) { if (out.length >= limit || depth > 10) return; for (var i = 1; i <= g.numProperties; i++) { var q = g.property(i); if (re.test(q.matchName) || re.test(q.name)) out.push({ path: __propPath(q), matchName: q.matchName, name: q.name, kind: q.propertyType === PropertyType.PROPERTY ? __valueTypeName(q.propertyValueType) : "group", canVaryOverTime: q.propertyType === PropertyType.PROPERTY ? q.canVaryOverTime : undefined }); if (q.propertyType !== PropertyType.PROPERTY) walk(q, depth + 1); if (out.length >= limit) return; } }
            walk(l, 0);
            return __result({ layer: l.name, count: out.length, matches: out });
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },

    ae_property_set: {
      description:
        'Set one or more property values statically (removes nothing; if the property has keyframes the value is written at time at or the comp time as a keyframe). Values are coerced: "#RRGGBB" for colors, "50%" -> 50, stringified arrays, uniform scale numbers. Returns PropSnapshot[] read-back.',
      parameters: {
        comp: compRef,
        sets: z.array(z.object({ layer: layerRef, path: propPath, value: propValue })).min(1).max(200),
        at: z.number().min(0).optional().describe("If the property is animated, write at this time (default comp time)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          var out = [];
          __mutate("Set properties", function () {
            for (var i = 0; i < a.sets.length; i++) {
              var s = a.sets[i]; var l = __layer(c, s.layer); var p = __prop(l, s.path);
              if (p.propertyType !== PropertyType.PROPERTY) __fail(s.path + " is a group, not a property", "BAD_ARG");
              var v = __coerce(p, s.value);
              if (p.numKeys > 0) p.setValueAtTime(a.at !== undefined ? a.at : c.time, v); else p.setValue(v);
              var info = __propInfo(p, a.at); info.layer = l.name; out.push(info);
            }
          });
          return __result({ set: out });
        `;
        return runScript(ctx, script);
      }),
    },

    ae_keyframes: {
      description:
        "Keyframe CRUD on one property. set: write keys [{time, value, ease?, interpolation?}] (batched via setValuesAtTimes; existing keys at other times are kept). add: alias of set. remove: by times[], indices[], range {from,to}, or all=true. list: KeyList. offset: shift all keys by dt. scale_time: scale key times by factor around pivot. copy: copy keys to another layer/path with optional dt. Returns the resulting KeyList.",
      parameters: {
        action: z.enum(["set", "add", "remove", "list", "offset", "scale_time", "copy"]),
        comp: compRef,
        layer: layerRef,
        path: propPath,
        keys: z.array(z.object({ time: z.number().min(0), value: propValue, ease: easeSpec.optional(), interpolation: z.enum(["linear", "bezier", "hold"]).optional() })).optional(),
        times: z.array(z.number().min(0)).optional(),
        indices: z.array(z.number().int().min(1)).optional(),
        range: z.object({ from: z.number(), to: z.number() }).optional(),
        all: z.boolean().optional(),
        dt: z.number().optional(),
        factor: z.number().positive().optional(),
        pivot: z.number().optional(),
        to_layer: layerRef.optional(),
        to_path: propPath.optional(),
        clear_existing: z.boolean().optional().describe("set: remove existing keys first."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer); var p = __prop(l, a.path);
          if (p.propertyType !== PropertyType.PROPERTY) return __error(a.path + " is a group", "BAD_ARG");
          function done(extra) { var r = { layer: l.name, path: __propPath(p), numKeys: p.numKeys, keys: __keyList(p) }; if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) r[k] = extra[k]; return __result(r); }
          if (a.action === "list") return done();
          if (a.action === "set" || a.action === "add") {
            if (!a.keys || !a.keys.length) return __error("keys required", "BAD_ARG");
            var applied;
            __mutate("Set keyframes", function () { if (a.clear_existing) for (var q = p.numKeys; q >= 1; q--) p.removeKey(q); applied = __setKeys(p, a.keys); });
            return done({ eases: applied });
          }
          if (a.action === "remove") {
            var removed = 0;
            __mutate("Remove keyframes", function () {
              if (a.all) { removed = p.numKeys; for (var q = p.numKeys; q >= 1; q--) p.removeKey(q); return; }
              var idx = [];
              if (a.indices) idx = a.indices.slice(0);
              if (a.times) for (var i = 0; i < a.times.length; i++) { var k = p.nearestKeyIndex(a.times[i]); if (Math.abs(p.keyTime(k) - a.times[i]) <= c.frameDuration / 2) idx.push(k); }
              if (a.range) for (var k2 = 1; k2 <= p.numKeys; k2++) { var kt = p.keyTime(k2); if (kt >= a.range.from && kt <= a.range.to) idx.push(k2); }
              idx.sort(function (x, y) { return y - x; });
              var last = -1;
              for (var j = 0; j < idx.length; j++) { if (idx[j] === last) continue; last = idx[j]; if (idx[j] >= 1 && idx[j] <= p.numKeys) { p.removeKey(idx[j]); removed++; } }
            });
            return done({ removed: removed });
          }
          if (a.action === "offset") {
            if (a.dt === undefined) return __error("dt required", "BAD_ARG");
            __mutate("Offset keyframes", function () {
              var data = []; for (var k = 1; k <= p.numKeys; k++) data.push({ t: p.keyTime(k), v: p.keyValue(k), ii: p.keyInInterpolationType(k), oi: p.keyOutInterpolationType(k), ie: p.keyInTemporalEase(k), oe: p.keyOutTemporalEase(k) });
              for (var q = p.numKeys; q >= 1; q--) p.removeKey(q);
              for (var m = 0; m < data.length; m++) { var nk = p.addKey(Math.max(0, data[m].t + a.dt)); p.setValueAtKey(nk, data[m].v); try { p.setInterpolationTypeAtKey(nk, data[m].ii, data[m].oi); if (data[m].ii === KeyframeInterpolationType.BEZIER || data[m].oi === KeyframeInterpolationType.BEZIER) p.setTemporalEaseAtKey(nk, data[m].ie, data[m].oe); } catch (e0) {} }
            });
            return done();
          }
          if (a.action === "scale_time") {
            if (!a.factor) return __error("factor required", "BAD_ARG");
            var pivot = a.pivot !== undefined ? a.pivot : (p.numKeys ? p.keyTime(1) : 0);
            __mutate("Scale keyframe times", function () {
              var data = []; for (var k = 1; k <= p.numKeys; k++) data.push({ t: p.keyTime(k), v: p.keyValue(k), ii: p.keyInInterpolationType(k), oi: p.keyOutInterpolationType(k), ie: p.keyInTemporalEase(k), oe: p.keyOutTemporalEase(k) });
              for (var q = p.numKeys; q >= 1; q--) p.removeKey(q);
              for (var m = 0; m < data.length; m++) { var nt = pivot + (data[m].t - pivot) * a.factor; var nk = p.addKey(Math.max(0, nt)); p.setValueAtKey(nk, data[m].v); try { p.setInterpolationTypeAtKey(nk, data[m].ii, data[m].oi); if (data[m].ii === KeyframeInterpolationType.BEZIER || data[m].oi === KeyframeInterpolationType.BEZIER) p.setTemporalEaseAtKey(nk, data[m].ie, data[m].oe); } catch (e0) {} }
            });
            return done();
          }
          if (a.action === "copy") {
            var tl = a.to_layer !== undefined ? __layer(c, a.to_layer) : l; var tp = __prop(tl, a.to_path || a.path);
            var dt = a.dt || 0; var copied = 0;
            __mutate("Copy keyframes", function () {
              for (var k = 1; k <= p.numKeys; k++) { var nk = tp.addKey(Math.max(0, p.keyTime(k) + dt)); tp.setValueAtKey(nk, __coerce(tp, p.keyValue(k))); try { tp.setInterpolationTypeAtKey(nk, p.keyInInterpolationType(k), p.keyOutInterpolationType(k)); if (p.keyInInterpolationType(k) === KeyframeInterpolationType.BEZIER) tp.setTemporalEaseAtKey(nk, __easeArrays(tp, p.keyInTemporalEase(k)[0].speed, p.keyInTemporalEase(k)[0].influence), __easeArrays(tp, p.keyOutTemporalEase(k)[0].speed, p.keyOutTemporalEase(k)[0].influence)); } catch (e0) {} copied++; }
            });
            return __result({ copied: copied, target: { layer: tl.name, path: __propPath(tp), numKeys: tp.numKeys, keys: __keyList(tp) } });
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },

    ae_ease: {
      description:
        "Easing and interpolation on existing keyframes. preset: apply a named ease to keys (indices or all); preset accepts any name from motion://tokens/easings — categories silia/gsap (ease, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy, sine_/circ_/expo_/power1..4_ in|out|in_out, gsap_power2_out …), easings.net (ease_out_quart, ease_out_quint, ease_out_expo, ease_in_out_quint, ease_out_back), carbon (carbon_productive_standard|entrance|exit, carbon_expressive_*), material (material_standard, material_standard_decelerate|accelerate, material_emphasized_decelerate|accelerate), fluent (fluent_ease_out|in|in_out), atlassian (atlassian_ease_out_bold, atlassian_ease_in_out_bold, …), plus linear and hold. Named presets are cubic-beziers converted to KeyframeEase (influence AND speed from the neighbouring keys). list: names grouped by source with bezier, role and AE influences (no AE round trip). custom: {inInfluence,outInfluence,inSpeed,outSpeed}. from_cubic_bezier: {x1,y1,x2,y2} applied across each consecutive key pair (out ease on key n, in ease on key n+1). interpolation: set in/out interpolation type. spatial: auto_bezier|continuous|linear tangents for spatial props. roving: set roving on interior keys. Returns the KeyList with eases.",
      parameters: {
        action: z.enum(["preset", "custom", "from_cubic_bezier", "interpolation", "spatial", "roving", "list"]),
        comp: compRef,
        layer: layerRef.optional(),
        path: propPath.optional(),
        keys: z.array(z.number().int().min(1)).optional().describe("1-based key indices; default all."),
        preset: z.string().optional().describe("preset: a name from motion://tokens/easings (ae_ease action=list), or linear | hold."),
        category: z.string().optional().describe("list: only this category (silia/gsap, easings.net, carbon, material, fluent, atlassian, polaris)."),
        custom: z.object({ inInfluence: z.number().min(0.1).max(100).optional(), outInfluence: z.number().min(0.1).max(100).optional(), inSpeed: z.number().optional(), outSpeed: z.number().optional() }).optional(),
        bezier: z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }).optional(),
        in_type: z.enum(["linear", "bezier", "hold"]).optional(),
        out_type: z.enum(["linear", "bezier", "hold"]).optional(),
        spatial: z.enum(["auto_bezier", "continuous", "linear"]).optional(),
        roving: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (a.action === "list") {
          const grouped = easesByCategory();
          const cat = a.category as string | undefined;
          if (cat && !grouped[cat]) return err(`Unknown category "${cat}". Known: ${Object.keys(grouped).join(", ")}`, "BAD_ARG");
          return ok({
            count: cat ? grouped[cat].length : easeNames().length,
            categories: cat ? { [cat]: grouped[cat] } : grouped,
            special: ["linear (LINEAR interpolation)", "hold (HOLD interpolation)"],
            conversion: "influence_out = 100*x1, speed_out = (y1/x1)*avgSpeed; influence_in = 100*(1-x2), speed_in = ((1-y2)/(1-x2))*avgSpeed; influence clamped 0.1–100. Influences shown here are at speed 0; see motion://ae/ease-conversion.",
            attribution: EASE_ATTRIBUTION,
          });
        }
        if (a.layer === undefined || !a.path) return err("layer and path required", "BAD_ARG");
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer); var p = __prop(l, a.path);
          if (p.propertyType !== PropertyType.PROPERTY) return __error("Not a property", "BAD_ARG");
          if (p.numKeys === 0) return __error("Property has no keyframes", "NO_KEYS");
          var ks = a.keys && a.keys.length ? a.keys : (function () { var arr = []; for (var k = 1; k <= p.numKeys; k++) arr.push(k); return arr; })();
          var applied = [];
          __mutate("Ease " + a.action, function () {
            if (a.action === "preset") { for (var i = 0; i < ks.length; i++) applied.push(__applyEase(p, ks[i], a.preset || "ease")); }
            else if (a.action === "custom") { for (var i2 = 0; i2 < ks.length; i2++) applied.push(__applyEase(p, ks[i2], a.custom || {})); }
            else if (a.action === "from_cubic_bezier") {
              if (!a.bezier) __fail("bezier required", "BAD_ARG");
              var b = a.bezier;
              for (var i3 = 0; i3 < ks.length; i3++) {
                var k = ks[i3];
                p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                var e = __bezierToEase(p, k, b);
                var inEase = p.keyInTemporalEase(k), outEase = p.keyOutTemporalEase(k);
                // this key's OUT gets (x1,y1); its IN gets (x2,y2) relative to the previous segment
                var newIn = k > 1 ? __easeArrays(p, e.inSpeed, e.inInfluence) : inEase;
                var newOut = k < p.numKeys ? __easeArrays(p, e.outSpeed, e.outInfluence) : outEase;
                p.setTemporalEaseAtKey(k, newIn, newOut);
                applied.push({ key: k, inInfluence: newIn[0].influence, outInfluence: newOut[0].influence, inSpeed: __round(newIn[0].speed), outSpeed: __round(newOut[0].speed) });
              }
            }
            else if (a.action === "interpolation") { for (var i4 = 0; i4 < ks.length; i4++) { var k4 = ks[i4]; p.setInterpolationTypeAtKey(k4, a.in_type ? __interpValue(a.in_type) : p.keyInInterpolationType(k4), a.out_type ? __interpValue(a.out_type) : p.keyOutInterpolationType(k4)); applied.push({ key: k4 }); } }
            else if (a.action === "spatial") {
              if (!p.isSpatial) __fail("Property is not spatial", "BAD_ARG");
              for (var i5 = 0; i5 < ks.length; i5++) { var k5 = ks[i5]; if (a.spatial === "linear") { var z = __dims(p) === 3 ? [0, 0, 0] : [0, 0]; p.setSpatialTangentsAtKey(k5, z, z); p.setSpatialContinuousAtKey(k5, false); p.setSpatialAutoBezierAtKey(k5, false); } else if (a.spatial === "continuous") { p.setSpatialContinuousAtKey(k5, true); } else { p.setSpatialAutoBezierAtKey(k5, true); } applied.push({ key: k5 }); }
            }
            else if (a.action === "roving") { if (!p.isSpatial) __fail("Roving needs a spatial property", "BAD_ARG"); for (var i6 = 0; i6 < ks.length; i6++) { var k6 = ks[i6]; if (k6 > 1 && k6 < p.numKeys) { p.setRovingAtKey(k6, a.roving !== false); applied.push({ key: k6 }); } else __warn("Key " + k6 + " cannot rove (first/last)"); } }
          });
          return __result({ layer: l.name, path: __propPath(p), applied: applied, keys: __keyList(p) });
        `;
        return runScript(ctx, script);
      }),
    },

    ae_expression: {
      description:
        `Expressions with validation. get; set (expression text, or library=<name> with params={...} filling the {{param}} placeholders; library: ${expressionNames().join(", ")}; every library entry has defaults and suggested ranges per param — see library_info); library_info: describe one or all library expressions (params, defaults, ranges, filled text; no AE round trip); set_batch [{layer,path,expression}]; remove; validate (dry-run: applies, reads expressionError, evaluates at eval_at, restores); validate_all (every expression in the comp or project, returns errors). Returns expression, enabled and expressionError read-back.`,
      parameters: {
        action: z.enum(["get", "set", "set_batch", "remove", "validate", "validate_all", "library_info"]),
        comp: compRef,
        layer: layerRef.optional(),
        path: propPath.optional(),
        expression: z.string().optional(),
        library: z.enum(Object.keys(EXPRESSION_LIBRARY) as [string, ...string[]]).optional().describe("set / library_info: library expression name."),
        params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("set / library_info: values for the library's {{param}} placeholders (missing ones use defaults), e.g. {amp: 0.1, freq: 3, decay: 6} or {target: 'Title', padding: 32}."),
        target_layer: z.string().optional().describe("Shorthand for params.target (layer name used by link_position, follow_with_delay, ebox_*)."),
        enabled: z.boolean().optional(),
        eval_at: z.number().min(0).optional().describe("validate: evaluate at this time to surface runtime errors."),
        batch: z.array(z.object({ layer: layerRef, path: propPath, expression: z.string() })).optional(),
        scope: z.enum(["comp", "project"]).optional().describe("validate_all: default comp."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        let expression = a.expression as string | undefined;
        let libraryWarnings: string[] = [];
        let usedParams: Record<string, ParamValue> | undefined;
        const params: Record<string, ParamValue> = { ...((a.params as Record<string, ParamValue> | undefined) ?? {}) };
        if (typeof a.target_layer === "string" && params.target === undefined) params.target = a.target_layer;
        if (a.action === "library_info") {
          const names = a.library ? [a.library as string] : expressionNames();
          return ok({
            count: names.length,
            expressions: names.map((n) => {
              const def = EXPRESSION_LIBRARY[n];
              const filled = fillExpression(n, a.library ? params : {});
              return { name: n, description: def.description, appliesTo: def.appliesTo, params: def.params, source: def.source, expression: filled.expression, warnings: filled.warnings.length ? filled.warnings : undefined };
            }),
          });
        }
        if (a.library) {
          try {
            const filled = fillExpression(a.library as string, params);
            expression = filled.expression;
            libraryWarnings = filled.warnings;
            usedParams = filled.params;
          } catch (e) {
            return err(e instanceof Error ? e.message : String(e), "BAD_ARG");
          }
        }
        const script = `
          ${argsVar("a", { ...a, expression, params: undefined, libraryParams: usedParams, libraryWarnings })}
          function snap(l, p) { return { layer: l.name, path: __propPath(p), expression: p.expression, enabled: p.expressionEnabled, expressionError: p.expressionError || "", canSetExpression: p.canSetExpression }; }
          if (a.action === "validate_all") {
            var errors = [], count = 0;
            function walk(l, g) { for (var i = 1; i <= g.numProperties; i++) { var q = g.property(i); if (q.propertyType === PropertyType.PROPERTY) { if (q.canSetExpression && q.expression) { count++; if (q.expressionError) errors.push({ comp: l.containingComp.name, layer: l.name, path: __propPath(q), error: q.expressionError, expression: q.expression.slice(0, 200) }); } } else walk(l, q); } }
            var comps = [];
            if (a.scope === "project") { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) comps.push(app.project.item(i)); } else comps.push(__comp(a.comp));
            for (var ci = 0; ci < comps.length; ci++) for (var li = 1; li <= comps[ci].numLayers; li++) walk(comps[ci].layer(li), comps[ci].layer(li));
            return __result({ comps: comps.length, expressions: count, errors: errors });
          }
          var c = __comp(a.comp);
          if (a.action === "set_batch") {
            var out = [];
            __mutate("Set expressions", function () { for (var b = 0; b < a.batch.length; b++) { var bl = __layer(c, a.batch[b].layer); var bp = __prop(bl, a.batch[b].path); if (!bp.canSetExpression) __fail(a.batch[b].path + " cannot hold an expression", "BAD_ARG"); bp.expression = a.batch[b].expression; bp.expressionEnabled = true; out.push(snap(bl, bp)); } });
            return __result({ set: out });
          }
          if (a.layer === undefined || !a.path) return __error("layer and path required", "BAD_ARG");
          var l = __layer(c, a.layer); var p = __prop(l, a.path);
          if (p.propertyType !== PropertyType.PROPERTY) return __error("Not a property", "BAD_ARG");
          if (a.action === "get") return __result(snap(l, p));
          if (!p.canSetExpression) return __error("Property cannot hold an expression", "BAD_ARG");
          if (a.action === "remove") { __mutate("Remove expression", function () { p.expression = ""; }); return __result(snap(l, p)); }
          if (a.action === "set") {
            if (a.expression === undefined) return __error("expression or library required", "BAD_ARG");
            __mutate("Set expression", function () { p.expression = a.expression; p.expressionEnabled = a.enabled !== false; });
            var s = snap(l, p);
            if (a.library) { s.library = a.library; s.libraryParams = a.libraryParams; if (a.libraryWarnings && a.libraryWarnings.length) for (var w = 0; w < a.libraryWarnings.length; w++) __warn(a.libraryWarnings[w]); }
            if (a.eval_at !== undefined) { try { s.valueAt = __value(p.valueAtTime(a.eval_at, false)); s.expressionError = p.expressionError || ""; } catch (e0) { s.evalError = String(e0); } }
            return __result(s);
          }
          if (a.action === "validate") {
            if (a.expression === undefined) return __error("expression required", "BAD_ARG");
            var prev = p.expression, prevEnabled = p.expressionEnabled, report = { expression: a.expression, valid: false, error: "", valueAt: null };
            app.beginUndoGroup("AE MCP: validate expression");
            try {
              p.expression = a.expression; p.expressionEnabled = true;
              report.error = p.expressionError || "";
              try { report.valueAt = __value(p.valueAtTime(a.eval_at !== undefined ? a.eval_at : c.time, false)); report.error = p.expressionError || report.error; } catch (e1) { report.error = report.error || String(e1); }
              report.valid = !report.error;
            } finally {
              p.expression = prev; p.expressionEnabled = prevEnabled;
              app.endUndoGroup();
            }
            report.layer = l.name; report.path = __propPath(p);
            return __result(report);
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
