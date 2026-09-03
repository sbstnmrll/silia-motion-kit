import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, layerRefs, colorValue, easeSpec } from "./refs.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

export function getLayerTools(ctx: ToolContext): ToolRecord {
  return {
    ae_layer_create: {
      description:
        "Create a layer of any kind in a comp: text (point text), box_text (paragraph box), shape (with primitives rect|ellipse|polygon|star), solid, adjustment, null, camera, light, footage (from item id/name), comp (nested comp). Common options: name, in/out points, start_time, position, parent. Text options: text, font (PostScript name e.g. ESKlarheitGrotesk-Md), size, fill, stroke, tracking, leading, justify. Returns the LayerRef read-back including transform.",
      parameters: {
        comp: compRef,
        kind: z.enum(["text", "box_text", "shape", "solid", "adjustment", "null", "camera", "light", "footage", "comp"]),
        name: z.string().optional(),
        position: z.array(z.number()).min(2).max(3).optional().describe("[x,y] or [x,y,z] in comp pixels."),
        in_point: z.number().min(0).optional(),
        out_point: z.number().min(0).optional(),
        start_time: z.number().optional(),
        duration: z.number().positive().optional().describe("Sets out_point = in_point + duration."),
        parent: layerRef.optional(),
        three_d: z.boolean().optional(),
        text: z.string().optional(),
        font: z.string().optional().describe("PostScript font name, e.g. ESKlarheitGrotesk-Md."),
        size: z.number().positive().optional(),
        fill: colorValue.optional(),
        stroke: colorValue.optional(),
        stroke_width: z.number().min(0).optional(),
        tracking: z.number().optional(),
        leading: z.number().optional(),
        justify: z.enum(["left", "center", "right"]).optional(),
        box_size: z.array(z.number().positive()).length(2).optional().describe("box_text: [w,h]."),
        color: colorValue.optional().describe("solid: color."),
        width: z.number().int().positive().optional().describe("solid/adjustment: default comp width."),
        height: z.number().int().positive().optional(),
        primitives: z.array(z.object({ type: z.enum(["rect", "ellipse", "polygon", "star"]), size: z.array(z.number()).length(2).optional(), position: z.array(z.number()).length(2).optional(), roundness: z.number().min(0).optional(), points: z.number().int().min(3).optional(), inner_radius: z.number().optional(), outer_radius: z.number().optional(), fill: colorValue.optional(), stroke: colorValue.optional(), stroke_width: z.number().min(0).optional(), name: z.string().optional() })).optional().describe("shape: one group per primitive."),
        item: z.union([z.number().int(), z.string()]).optional().describe("footage/comp: project item id or name."),
        camera_type: z.enum(["one_node", "two_node"]).optional(),
        zoom: z.number().positive().optional(),
        light_type: z.enum(["parallel", "spot", "point", "ambient"]).optional(),
        intensity: z.number().optional(),
        point_of_interest: z.array(z.number()).length(3).optional(),
        casts_shadows: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          function applyText(layer) {
            var docProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
            var d = docProp.value;
            if (a.text !== undefined) d.text = a.text;
            if (a.font) d.font = a.font;
            if (a.size) d.fontSize = a.size;
            if (a.fill) { d.applyFill = true; d.fillColor = __color(a.fill); }
            if (a.stroke) { d.applyStroke = true; d.strokeColor = __color(a.stroke); d.strokeWidth = a.stroke_width || 1; } else if (a.stroke_width === 0) d.applyStroke = false;
            if (a.tracking !== undefined) d.tracking = a.tracking;
            if (a.leading !== undefined) { d.leading = a.leading; }
            if (a.justify) d.justification = __justValue(a.justify);
            docProp.setValue(d);
            if (a.font) { var back = docProp.value.font; if (back !== a.font) __warn("Font substituted: asked " + a.font + ", AE reports " + back); }
          }
          return __result(__mutate("Create layer", function () {
            var l = null, center = [c.width / 2, c.height / 2];
            var w = a.width || c.width, h = a.height || c.height;
            switch (a.kind) {
              case "text": l = c.layers.addText(a.text || "Text"); applyText(l); break;
              case "box_text": var bs = a.box_size || [Math.round(c.width * 0.8), Math.round(c.height * 0.2)]; l = c.layers.addBoxText(bs, a.text || "Text"); applyText(l); break;
              case "solid": l = c.layers.addSolid(__color(a.color || "#000000"), a.name || "Solid", w, h, c.pixelAspect, c.duration); break;
              case "adjustment": l = c.layers.addSolid([1, 1, 1], a.name || "Adjustment", w, h, c.pixelAspect, c.duration); l.adjustmentLayer = true; break;
              case "null": l = c.layers.addNull(c.duration); break;
              case "camera": l = c.layers.addCamera(a.name || "Camera", [center[0], center[1]]); if (a.camera_type === "one_node") l.autoOrient = AutoOrientType.NO_AUTO_ORIENT; if (a.zoom) l.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(a.zoom); break;
              case "light":
                l = c.layers.addLight(a.name || "Light", [center[0], center[1]]);
                var lt = { parallel: LightType.PARALLEL, spot: LightType.SPOT, point: LightType.POINT, ambient: LightType.AMBIENT };
                if (a.light_type) l.lightType = lt[a.light_type];
                if (a.intensity !== undefined) l.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(a.intensity);
                if (a.color) l.property("ADBE Light Options Group").property("ADBE Light Color").setValue(__color(a.color));
                if (a.casts_shadows !== undefined) try { l.property("ADBE Light Options Group").property("ADBE Casts Shadows").setValue(a.casts_shadows ? 1 : 0); } catch (e0) {}
                if (a.point_of_interest) try { l.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(a.point_of_interest); } catch (e1) {}
                break;
              case "footage": case "comp":
                if (a.item === undefined) __fail("item is required for kind " + a.kind, "BAD_ARG");
                var it = typeof a.item === "number" ? __itemById(a.item) : __itemByName(String(a.item));
                if (!it) __fail("Item not found: " + a.item, "ITEM_NOT_FOUND");
                if (a.kind === "comp" && !(it instanceof CompItem)) __fail("Item is not a comp", "BAD_ARG");
                // layers.add(item, undefined) throws "parameter 2 undefined": only pass duration when given.
                l = (a.duration !== undefined && a.duration !== null) ? c.layers.add(it, a.duration) : c.layers.add(it);
                break;
              case "shape":
                l = c.layers.addShape();
                var contents = l.property("ADBE Root Vectors Group");
                var prims = a.primitives || [{ type: "rect", size: [400, 400] }];
                for (var i = 0; i < prims.length; i++) {
                  var pr = prims[i];
                  var g = contents.addProperty("ADBE Vector Group"); if (pr.name) g.name = pr.name;
                  var gc = g.property("ADBE Vectors Group");
                  var shp;
                  if (pr.type === "rect") { shp = gc.addProperty("ADBE Vector Shape - Rect"); shp.property("ADBE Vector Rect Size").setValue(pr.size || [400, 400]); if (pr.position) shp.property("ADBE Vector Rect Position").setValue(pr.position); if (pr.roundness) shp.property("ADBE Vector Rect Roundness").setValue(pr.roundness); }
                  else if (pr.type === "ellipse") { shp = gc.addProperty("ADBE Vector Shape - Ellipse"); shp.property("ADBE Vector Ellipse Size").setValue(pr.size || [400, 400]); if (pr.position) shp.property("ADBE Vector Ellipse Position").setValue(pr.position); }
                  else { shp = gc.addProperty("ADBE Vector Shape - Star"); shp.property("ADBE Vector Star Type").setValue(pr.type === "polygon" ? 2 : 1); if (pr.points) shp.property("ADBE Vector Star Points").setValue(pr.points); if (pr.outer_radius) shp.property("ADBE Vector Star Outer Radius").setValue(pr.outer_radius); if (pr.type === "star" && pr.inner_radius) shp.property("ADBE Vector Star Inner Radius").setValue(pr.inner_radius); if (pr.position) shp.property("ADBE Vector Star Position").setValue(pr.position); }
                  if (pr.fill !== null) { var fl = gc.addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue(__color(pr.fill || a.fill || "#DEFF38", true)); }
                  if (pr.stroke || a.stroke) { var st = gc.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(__color(pr.stroke || a.stroke, true)); st.property("ADBE Vector Stroke Width").setValue(pr.stroke_width !== undefined ? pr.stroke_width : (a.stroke_width || 2)); }
                }
                break;
              default: __fail("Unknown kind " + a.kind, "BAD_ARG");
            }
            if (a.name && a.kind !== "solid" && a.kind !== "adjustment" && a.kind !== "camera" && a.kind !== "light") l.name = a.name;
            if (a.three_d && __isAV(l)) l.threeDLayer = true;
            if (a.position) { var pos = a.position.slice(0); if (__isAV(l) && l.threeDLayer && pos.length === 2) pos.push(0); l.property("ADBE Transform Group").property("ADBE Position").setValue(pos); }
            if (a.start_time !== undefined) l.startTime = a.start_time;
            if (a.in_point !== undefined) l.inPoint = a.in_point;
            if (a.duration !== undefined && a.kind !== "footage" && a.kind !== "comp") l.outPoint = (a.in_point !== undefined ? a.in_point : l.inPoint) + a.duration;
            if (a.out_point !== undefined) l.outPoint = a.out_point;
            if (a.parent !== undefined) l.parent = __layer(c, a.parent);
            return __layerInfo(l);
          }));
        `;
        return runScript(ctx, script);
      }),
    },

    ae_layer_query: {
      description:
        "Read layers. list: LayerRef[] for a comp with optional filter {nameRegex, kind, selected, enabled, hasAudio}. get: full detail for one layer: transform at time, effects (with params if include_effect_params), masks, text document, and the property tree to depth.",
      parameters: {
        action: z.enum(["list", "get"]),
        comp: compRef,
        layer: layerRef.optional(),
        filter: z.object({ nameRegex: z.string().optional(), kind: z.string().optional(), selected: z.boolean().optional(), enabled: z.boolean().optional(), hasAudio: z.boolean().optional() }).optional(),
        at: z.number().min(0).optional().describe("get: sample values at this time (default comp time)."),
        depth: z.number().int().min(0).max(6).optional().describe("get: property tree depth (default 0 = none)."),
        include_effect_params: z.boolean().optional(),
        only_animatable: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          if (a.action === "list") {
            var f = a.filter || {}; var re = f.nameRegex ? new RegExp(f.nameRegex, "i") : null; var out = [];
            for (var i = 1; i <= c.numLayers; i++) {
              var l = c.layer(i);
              if (re && !re.test(l.name)) continue;
              if (f.kind && __layerKind(l) !== f.kind) continue;
              if (f.selected !== undefined && l.selected !== f.selected) continue;
              if (f.enabled !== undefined && l.enabled !== f.enabled) continue;
              if (f.hasAudio !== undefined && (!__isAV(l) || l.hasAudio !== f.hasAudio)) continue;
              out.push(__layerInfo(l));
            }
            return __result({ comp: { id: c.id, name: c.name, numLayers: c.numLayers }, count: out.length, layers: out });
          }
          if (a.layer === undefined) return __error("layer is required for get", "BAD_ARG");
          var L = __layer(c, a.layer);
          var info = __layerInfo(L);
          var t = a.at !== undefined ? a.at : c.time;
          info.sampledAt = __round(t);
          try { var tg = L.property("ADBE Transform Group"); info.transformAt = { anchor: __value(tg.property("ADBE Anchor Point").valueAtTime(t, false)), position: __value(tg.property("ADBE Position").valueAtTime(t, false)), scale: __value(tg.property("ADBE Scale").valueAtTime(t, false)), rotation: __value(tg.property("ADBE Rotate Z").valueAtTime(t, false)), opacity: tg.property("ADBE Opacity") ? __value(tg.property("ADBE Opacity").valueAtTime(t, false)) : null }; } catch (e0) {}
          try { var fx = L.property("ADBE Effect Parade"); info.effects = []; if (fx) for (var e = 1; e <= fx.numProperties; e++) info.effects.push(__effectInfo(fx.property(e), a.include_effect_params === true)); } catch (e1) {}
          try { var mk = L.property("ADBE Mask Parade"); info.masks = []; if (mk) for (var m = 1; m <= mk.numProperties; m++) { var mask = mk.property(m); info.masks.push({ index: m, name: mask.name, mode: mask.maskMode, inverted: mask.inverted, feather: __value(mask.property("ADBE Mask Feather").value), opacity: mask.property("ADBE Mask Opacity").value, expansion: mask.property("ADBE Mask Offset").value, numVertices: mask.property("ADBE Mask Shape").value.vertices.length }); } } catch (e2) {}
          if (L instanceof TextLayer) { try { info.textDocument = __textDoc(L.property("ADBE Text Properties").property("ADBE Text Document").valueAtTime(t, false)); info.sourceTextKeys = L.property("ADBE Text Properties").property("ADBE Text Document").numKeys; } catch (e3) {} try { var r = L.sourceRectAtTime(t, false); info.sourceRect = { left: __round(r.left), top: __round(r.top), width: __round(r.width), height: __round(r.height) }; } catch (e4) {} }
          if (a.depth && a.depth > 0) info.properties = __propTree(L, a.depth, a.only_animatable === true);
          return __result(info);
        `;
        return runScript(ctx, script);
      }),
    },

    ae_layer_update: {
      description:
        "Layer settings other than transform. rename; set_timing {in,out,start_time,stretch}; set_parent (parent layer or null, jump_to_parent keeps position); set_blend (mode name); set_matte {matte_layer, matte_type alpha|alpha_inverted|luma|luma_inverted|none} (AE 23+ API, legacy fallback); set_3d; set_flags {enabled,solo,shy,locked,motion_blur,collapse,audio_enabled,guide,frame_blending}; reorder {to: index|top|bottom|before|after (+ reference layer)}; duplicate; delete; set_quality best|draft|wireframe; set_time_remap {enabled}; set_label (0..16); set_comment. Accepts one layer or several (layers).",
      parameters: {
        action: z.enum(["rename", "set_timing", "set_parent", "set_blend", "set_matte", "set_3d", "set_flags", "reorder", "duplicate", "delete", "set_quality", "set_time_remap", "set_label", "set_comment"]),
        comp: compRef,
        layer: layerRef.optional(),
        layers: layerRefs.optional(),
        name: z.string().optional(),
        in_point: z.number().min(0).optional(),
        out_point: z.number().min(0).optional(),
        start_time: z.number().optional(),
        stretch: z.number().optional().describe("Percent (100 = normal)."),
        parent: layerRef.nullable().optional(),
        jump_to_parent: z.boolean().optional(),
        blend: z.string().optional().describe("normal, add, multiply, screen, overlay, soft_light, hard_light, ..."),
        matte_layer: layerRef.optional(),
        matte_type: z.enum(["none", "alpha", "alpha_inverted", "luma", "luma_inverted"]).optional(),
        enabled: z.boolean().optional(),
        flags: z.object({ enabled: z.boolean().optional(), solo: z.boolean().optional(), shy: z.boolean().optional(), locked: z.boolean().optional(), motion_blur: z.boolean().optional(), collapse: z.boolean().optional(), audio_enabled: z.boolean().optional(), guide: z.boolean().optional(), frame_blending: z.boolean().optional(), effects_active: z.boolean().optional(), preserve_transparency: z.boolean().optional() }).optional(),
        to: z.union([z.number().int().min(1), z.enum(["top", "bottom", "before", "after"])]).optional(),
        reference: layerRef.optional().describe("reorder before/after: the reference layer."),
        quality: z.enum(["best", "draft", "wireframe"]).optional(),
        label: z.number().int().min(0).max(16).optional(),
        comment: z.string().optional(),
        count: z.number().int().min(1).max(50).optional().describe("duplicate: how many copies."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          var refs = a.layers || (a.layer !== undefined ? [a.layer] : null);
          if (!refs) return __error("layer or layers is required", "BAD_ARG");
          var ls = __layers(c, refs);
          var results = [];
          __mutate("Layer " + a.action, function () {
            for (var i = 0; i < ls.length; i++) {
              var l = ls[i];
              switch (a.action) {
                case "rename": if (!a.name) __fail("name required", "BAD_ARG"); l.name = ls.length > 1 ? a.name + " " + (i + 1) : a.name; break;
                case "set_timing":
                  if (a.start_time !== undefined) l.startTime = a.start_time;
                  if (a.stretch !== undefined) l.stretch = a.stretch;
                  if (a.in_point !== undefined) l.inPoint = a.in_point;
                  if (a.out_point !== undefined) l.outPoint = a.out_point;
                  break;
                case "set_parent":
                  if (a.parent === null) l.parent = null;
                  else { var par = __layer(c, a.parent); if (a.jump_to_parent === false) l.setParentWithJump(par); else l.parent = par; }
                  break;
                case "set_blend": if (!__isAV(l)) __fail("Not an AV layer", "BAD_ARG"); l.blendingMode = __blendValue(a.blend); break;
                case "set_matte":
                  if (!__isAV(l)) __fail("Not an AV layer", "BAD_ARG");
                  var mt = __matteValue(a.matte_type || "alpha");
                  if (a.matte_type === "none") { if (__ver() >= 23 && l.removeTrackMatte) l.removeTrackMatte(); else l.trackMatteType = TrackMatteType.NO_TRACK_MATTE; }
                  else if (__ver() >= 23 && typeof l.setTrackMatte === "function") { if (a.matte_layer === undefined) __fail("matte_layer required (AE 23+)", "BAD_ARG"); l.setTrackMatte(__layer(c, a.matte_layer), mt); }
                  else { if (a.matte_layer !== undefined) __warn("Legacy matte API uses the layer directly above; matte_layer ignored"); l.trackMatteType = mt; }
                  break;
                case "set_3d": if (!__isAV(l)) __fail("Not an AV layer", "BAD_ARG"); l.threeDLayer = a.enabled !== false; break;
                case "set_flags":
                  var f = a.flags || {}; if (a.enabled !== undefined) f.enabled = a.enabled;
                  if (f.enabled !== undefined) l.enabled = f.enabled; if (f.solo !== undefined) l.solo = f.solo; if (f.shy !== undefined) l.shy = f.shy; if (f.locked !== undefined) l.locked = f.locked;
                  if (__isAV(l)) { if (f.motion_blur !== undefined) l.motionBlur = f.motion_blur; if (f.collapse !== undefined) l.collapseTransformation = f.collapse; if (f.audio_enabled !== undefined && l.hasAudio) l.audioEnabled = f.audio_enabled; if (f.guide !== undefined) l.guideLayer = f.guide; if (f.frame_blending !== undefined) l.frameBlendingType = f.frame_blending ? FrameBlendingType.FRAME_MIX : FrameBlendingType.NO_FRAME_BLEND; if (f.effects_active !== undefined) l.effectsActive = f.effects_active; if (f.preserve_transparency !== undefined) l.preserveTransparency = f.preserve_transparency; }
                  break;
                case "reorder":
                  if (a.to === "top") l.moveToBeginning(); else if (a.to === "bottom") l.moveToEnd();
                  else if (a.to === "before" || a.to === "after") { if (a.reference === undefined) __fail("reference required", "BAD_ARG"); var ref = __layer(c, a.reference); if (a.to === "before") l.moveBefore(ref); else l.moveAfter(ref); }
                  else if (typeof a.to === "number") { var target = Math.max(1, Math.min(c.numLayers, a.to)); if (target < l.index) l.moveBefore(c.layer(target)); else if (target > l.index) l.moveAfter(c.layer(target)); }
                  else __fail("to required", "BAD_ARG");
                  break;
                case "duplicate": var n = a.count || 1; var made = []; for (var d = 0; d < n; d++) { var dup = l.duplicate(); if (a.name) dup.name = n > 1 ? a.name + " " + (d + 1) : a.name; made.push(__layerInfo(dup)); } results.push({ source: l.name, duplicates: made }); continue;
                case "delete": results.push({ deleted: __layerInfo(l) }); l.remove(); continue;
                case "set_quality": if (!__isAV(l)) __fail("Not an AV layer", "BAD_ARG"); l.quality = a.quality === "best" ? LayerQuality.BEST : a.quality === "draft" ? LayerQuality.DRAFT : LayerQuality.WIREFRAME; break;
                case "set_time_remap": if (!__isAV(l)) __fail("Not an AV layer", "BAD_ARG"); l.timeRemapEnabled = a.enabled !== false; break;
                case "set_label": l.label = a.label; break;
                case "set_comment": l.comment = a.comment || ""; break;
                default: __fail("Unknown action " + a.action, "BAD_ARG");
              }
              results.push(__layerInfo(l));
            }
          });
          return __result({ comp: { id: c.id, name: c.name, numLayers: c.numLayers }, layers: results });
        `;
        return runScript(ctx, script);
      }),
    },

    ae_layer_transform: {
      description:
        "Transform ergonomics. set: static anchor/position/scale/rotation/opacity/orientation (arrays sized to the property; scale as percent, uniform number allowed). keyframe: same fields but written as keyframes at time t (with optional ease). fit: scale layer to contain|cover|width|height of the comp (uses sourceRectAtTime for text/shape). center: position at comp center (and optionally anchor at layer center). reset: transform defaults. Returns the transform after the change plus key counts.",
      parameters: {
        action: z.enum(["set", "keyframe", "fit", "center", "reset"]),
        comp: compRef,
        layer: layerRef.optional(),
        layers: layerRefs.optional(),
        anchor: z.array(z.number()).min(2).max(3).optional(),
        position: z.array(z.number()).min(2).max(3).optional(),
        scale: z.union([z.number(), z.array(z.number()).min(2).max(3)]).optional().describe("Percent. Number = uniform."),
        rotation: z.number().optional(),
        orientation: z.array(z.number()).length(3).optional(),
        opacity: z.number().min(0).max(100).optional(),
        at: z.number().min(0).optional().describe("keyframe: time in seconds (default comp time)."),
        ease: easeSpec.optional(),
        mode: z.enum(["contain", "cover", "width", "height"]).optional().describe("fit mode (default contain)."),
        padding: z.number().min(0).optional().describe("fit: pixels of margin."),
        anchor_to_center: z.boolean().optional().describe("center: also move the anchor to the layer's visual center."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          var refs = a.layers || (a.layer !== undefined ? [a.layer] : null);
          if (!refs) return __error("layer or layers is required", "BAD_ARG");
          var ls = __layers(c, refs);
          var t = a.at !== undefined ? a.at : c.time;
          function tg(l) { return l.property("ADBE Transform Group"); }
          function dimsFor(l, arr) { if (__isAV(l) && l.threeDLayer && arr.length === 2) return [arr[0], arr[1], 0]; if (!(__isAV(l) && l.threeDLayer) && arr.length === 3) return [arr[0], arr[1]]; return arr; }
          function scaleFor(l, s) { if (typeof s === "number") s = [s, s, s]; return dimsFor(l, s.length === 2 && __isAV(l) && l.threeDLayer ? [s[0], s[1], s[0]] : s); }
          function put(prop, v) { if (a.action === "keyframe") { var applied = __setKeys(prop, [{ time: t, value: v, ease: a.ease }]); return applied; } prop.setValue(v); return null; }
          function snapshot(l) { var g = tg(l); var o = { name: l.name, index: l.index, anchor: __value(g.property("ADBE Anchor Point").valueAtTime(t, false)), position: __value(g.property("ADBE Position").valueAtTime(t, false)), scale: __value(g.property("ADBE Scale").valueAtTime(t, false)), rotation: __value(g.property("ADBE Rotate Z").valueAtTime(t, false)), opacity: g.property("ADBE Opacity") ? __value(g.property("ADBE Opacity").valueAtTime(t, false)) : null, keys: { position: g.property("ADBE Position").numKeys, scale: g.property("ADBE Scale").numKeys, rotation: g.property("ADBE Rotate Z").numKeys, opacity: g.property("ADBE Opacity") ? g.property("ADBE Opacity").numKeys : 0, anchor: g.property("ADBE Anchor Point").numKeys } }; if (__isAV(l) && l.threeDLayer) o.orientation = __value(g.property("ADBE Orientation").valueAtTime(t, false)); return o; }
          var out = [];
          __mutate("Transform " + a.action, function () {
            for (var i = 0; i < ls.length; i++) {
              var l = ls[i], g = tg(l);
              if (a.action === "set" || a.action === "keyframe") {
                if (a.anchor) put(g.property("ADBE Anchor Point"), dimsFor(l, a.anchor));
                if (a.position) put(g.property("ADBE Position"), dimsFor(l, a.position));
                if (a.scale !== undefined) put(g.property("ADBE Scale"), scaleFor(l, a.scale));
                if (a.rotation !== undefined) put(g.property("ADBE Rotate Z"), a.rotation);
                if (a.orientation && __isAV(l) && l.threeDLayer) put(g.property("ADBE Orientation"), a.orientation);
                if (a.opacity !== undefined && g.property("ADBE Opacity")) put(g.property("ADBE Opacity"), a.opacity);
              } else if (a.action === "reset") {
                g.property("ADBE Anchor Point").setValue(__isAV(l) && l.source ? dimsFor(l, [l.source.width / 2, l.source.height / 2]) : dimsFor(l, [0, 0]));
                g.property("ADBE Position").setValue(dimsFor(l, [c.width / 2, c.height / 2]));
                g.property("ADBE Scale").setValue(scaleFor(l, 100));
                g.property("ADBE Rotate Z").setValue(0);
                if (g.property("ADBE Opacity")) g.property("ADBE Opacity").setValue(100);
              } else {
                var r = null;
                try { r = l.sourceRectAtTime(t, false); } catch (e0) {}
                if (!r || (r.width === 0 && r.height === 0)) { if (__isAV(l) && l.source) r = { left: 0, top: 0, width: l.source.width, height: l.source.height }; else __fail("Cannot measure layer bounds", "NO_BOUNDS"); }
                var pad = a.padding || 0;
                if (a.action === "fit") {
                  var sx = (c.width - 2 * pad) / r.width, sy = (c.height - 2 * pad) / r.height, s;
                  var mode = a.mode || "contain";
                  s = mode === "contain" ? Math.min(sx, sy) : mode === "cover" ? Math.max(sx, sy) : mode === "width" ? sx : sy;
                  var pct = s * 100;
                  g.property("ADBE Scale").setValue(scaleFor(l, pct));
                }
                // center anchor on the visual bounds then place at comp center
                var ax = r.left + r.width / 2, ay = r.top + r.height / 2;
                if (a.action === "fit" || a.anchor_to_center) g.property("ADBE Anchor Point").setValue(dimsFor(l, [ax, ay]));
                g.property("ADBE Position").setValue(dimsFor(l, [c.width / 2, c.height / 2]));
              }
              out.push(snapshot(l));
            }
          });
          return __result({ at: __round(t), layers: out });
        `;
        return runScript(ctx, script);
      }),
    },

    ae_masks: {
      description:
        "Layer masks. list; add a mask from shape {rect:[x,y,w,h]} | {ellipse:[cx,cy,rx,ry]} | {path:{vertices,inTangents,outTangents,closed}} with mode add|subtract|intersect|lighten|darken|difference|none, feather [x,y], opacity, expansion, inverted; update by mask index; remove.",
      parameters: {
        action: z.enum(["list", "add", "update", "remove"]),
        comp: compRef,
        layer: layerRef,
        index: z.number().int().min(1).optional().describe("update/remove: 1-based mask index."),
        name: z.string().optional(),
        shape: z.object({ rect: z.array(z.number()).length(4).optional(), ellipse: z.array(z.number()).length(4).optional(), path: z.object({ vertices: z.array(z.array(z.number()).length(2)), inTangents: z.array(z.array(z.number()).length(2)).optional(), outTangents: z.array(z.array(z.number()).length(2)).optional(), closed: z.boolean().optional() }).optional() }).optional(),
        mode: z.enum(["add", "subtract", "intersect", "lighten", "darken", "difference", "none"]).optional(),
        feather: z.array(z.number().min(0)).length(2).optional(),
        opacity: z.number().min(0).max(100).optional(),
        expansion: z.number().optional(),
        inverted: z.boolean().optional(),
        at: z.number().min(0).optional().describe("Write shape/feather/opacity as keyframes at this time instead of static values."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer);
          var masks = l.property("ADBE Mask Parade");
          if (!masks) return __error("Layer has no mask group", "NO_MASKS");
          function modeValue(m) { var t = { add: MaskMode.ADD, subtract: MaskMode.SUBTRACT, intersect: MaskMode.INTERSECT, lighten: MaskMode.LIGHTEN, darken: MaskMode.DARKEN, difference: MaskMode.DIFFERENCE, none: MaskMode.NONE }; return t[m]; }
          function shapeFrom(s) {
            var sh = new Shape();
            if (s.rect) { var x = s.rect[0], y = s.rect[1], w = s.rect[2], h = s.rect[3]; sh.vertices = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; sh.closed = true; }
            else if (s.ellipse) { var cx = s.ellipse[0], cy = s.ellipse[1], rx = s.ellipse[2], ry = s.ellipse[3], k = 0.5523; sh.vertices = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]; sh.inTangents = [[-rx * k, 0], [0, -ry * k], [rx * k, 0], [0, ry * k]]; sh.outTangents = [[rx * k, 0], [0, ry * k], [-rx * k, 0], [0, -ry * k]]; sh.closed = true; }
            else if (s.path) { sh.vertices = s.path.vertices; if (s.path.inTangents) sh.inTangents = s.path.inTangents; if (s.path.outTangents) sh.outTangents = s.path.outTangents; sh.closed = s.path.closed !== false; }
            else __fail("shape needs rect, ellipse or path", "BAD_ARG");
            return sh;
          }
          function info(m, i) { return { index: i, name: m.name, mode: m.maskMode, inverted: m.inverted, feather: __value(m.property("ADBE Mask Feather").value), opacity: m.property("ADBE Mask Opacity").value, expansion: m.property("ADBE Mask Offset").value, numVertices: m.property("ADBE Mask Shape").value.vertices.length, shapeKeys: m.property("ADBE Mask Shape").numKeys }; }
          function list() { var out = []; for (var i = 1; i <= masks.numProperties; i++) out.push(info(masks.property(i), i)); return out; }
          function apply(m) {
            function set(prop, v) { if (a.at !== undefined) prop.setValueAtTime(a.at, v); else prop.setValue(v); }
            if (a.shape) set(m.property("ADBE Mask Shape"), shapeFrom(a.shape));
            if (a.mode) m.maskMode = modeValue(a.mode);
            if (a.feather) set(m.property("ADBE Mask Feather"), a.feather);
            if (a.opacity !== undefined) set(m.property("ADBE Mask Opacity"), a.opacity);
            if (a.expansion !== undefined) set(m.property("ADBE Mask Offset"), a.expansion);
            if (a.inverted !== undefined) m.inverted = a.inverted;
            if (a.name) m.name = a.name;
          }
          if (a.action === "list") return __result({ layer: l.name, masks: list() });
          if (a.action === "add") { if (!a.shape) return __error("shape is required", "BAD_ARG"); return __result(__mutate("Add mask", function () { var m = masks.addProperty("ADBE Mask Atom"); apply(m); return { added: info(m, m.propertyIndex), masks: list() }; })); }
          if (!a.index || a.index > masks.numProperties) return __error("index out of range", "BAD_ARG");
          if (a.action === "update") return __result(__mutate("Update mask", function () { var m = masks.property(a.index); apply(m); return { updated: info(m, a.index), masks: list() }; }));
          if (a.action === "remove") { __mutate("Remove mask", function () { masks.property(a.index).remove(); }); return __result({ masks: list() }); }
          return __error("Unknown action " + a.action, "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
