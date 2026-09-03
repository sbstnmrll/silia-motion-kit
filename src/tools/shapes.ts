import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, colorValue, easeSpec } from "./refs.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

export function getShapeTools(ctx: ToolContext): ToolRecord {
  return {
    ae_shape: {
      description:
        "Shape layer contents. list: tree of groups/paths/fills/strokes/operators with matchName paths. add_group (name, optional group_path parent). add_path {rect|ellipse|polystar|custom} into a group. add_fill/add_stroke (color, opacity, width, caps, dashes). add_trim (start,end,offset; draw_on {from,to,duration,start_time,ease} animates end). add_repeater (copies, offset, transform {position,rotation,scale,start_opacity,end_opacity}). add_round_corners (radius). set: set any content property by path under contents. remove: remove a content item by path. Paths are relative to ADBE Root Vectors Group, e.g. 'ADBE Vector Group/ADBE Vectors Group/ADBE Vector Graphic - Fill'.",
      parameters: {
        action: z.enum(["list", "add_group", "add_path", "add_fill", "add_stroke", "add_trim", "add_repeater", "add_round_corners", "set", "remove"]),
        comp: compRef,
        layer: layerRef,
        group_path: z.string().optional().describe("Path of the target group (default: first group, created if none)."),
        name: z.string().optional(),
        path: z.object({ type: z.enum(["rect", "ellipse", "polystar", "custom"]), size: z.array(z.number()).length(2).optional(), position: z.array(z.number()).length(2).optional(), roundness: z.number().min(0).optional(), points: z.number().int().min(3).optional(), star: z.boolean().optional(), inner_radius: z.number().optional(), outer_radius: z.number().optional(), rotation: z.number().optional(), vertices: z.array(z.array(z.number()).length(2)).optional(), in_tangents: z.array(z.array(z.number()).length(2)).optional(), out_tangents: z.array(z.array(z.number()).length(2)).optional(), closed: z.boolean().optional() }).optional(),
        color: colorValue.optional(),
        opacity: z.number().min(0).max(100).optional(),
        width: z.number().min(0).optional(),
        line_cap: z.enum(["butt", "round", "square"]).optional(),
        line_join: z.enum(["miter", "round", "bevel"]).optional(),
        dashes: z.array(z.number().min(0)).optional().describe("[dash, gap, ...]"),
        trim: z.object({ start: z.number().min(0).max(100).optional(), end: z.number().min(0).max(100).optional(), offset: z.number().optional() }).optional(),
        draw_on: z.object({ from: z.number().min(0).max(100).optional(), to: z.number().min(0).max(100).optional(), duration: z.number().positive().optional(), start_time: z.number().min(0).optional(), ease: easeSpec.optional() }).optional(),
        repeater: z.object({ copies: z.number().min(0).optional(), offset: z.number().optional(), position: z.array(z.number()).length(2).optional(), rotation: z.number().optional(), scale: z.array(z.number()).length(2).optional(), start_opacity: z.number().optional(), end_opacity: z.number().optional() }).optional(),
        radius: z.number().min(0).optional(),
        content_path: z.string().optional().describe("set/remove: path under contents."),
        value: z.union([z.number(), z.string(), z.array(z.number())]).optional(),
        at: z.number().min(0).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp); var l = __layer(c, a.layer);
          if (!(l instanceof ShapeLayer)) return __error("Layer is not a shape layer", "BAD_ARG");
          var contents = l.property("ADBE Root Vectors Group");
          function relPath(p) { var full = __propPath(p); var prefix = "ADBE Root Vectors Group/"; return full.indexOf(prefix) === 0 ? full.substr(prefix.length) : full; }
          function tree(g, depth) { var out = []; for (var i = 1; i <= g.numProperties; i++) { var p = g.property(i); var node = { path: relPath(p), matchName: p.matchName, name: p.name }; if (p.propertyType === PropertyType.PROPERTY) { node.value = __value(p.value); node.numKeys = p.numKeys; } else if (depth < 6) { node.children = tree(p, depth + 1); } out.push(node); } return out; }
          function targetGroup() { if (a.group_path) { var g = __prop(contents, a.group_path); if (g.matchName === "ADBE Vector Group") return g.property("ADBE Vectors Group"); return g; } for (var i = 1; i <= contents.numProperties; i++) if (contents.property(i).matchName === "ADBE Vector Group") return contents.property(i).property("ADBE Vectors Group"); var ng = contents.addProperty("ADBE Vector Group"); ng.name = a.name || "Group 1"; return ng.property("ADBE Vectors Group"); }
          if (a.action === "list") return __result({ layer: l.name, contents: tree(contents, 0) });
          var res;
          __mutate("Shape " + a.action, function () {
            if (a.action === "add_group") { var parent = a.group_path ? targetGroup() : contents; var g = parent.addProperty("ADBE Vector Group"); if (a.name) g.name = a.name; res = { added: relPath(g) }; }
            else if (a.action === "add_path") {
              var grp = targetGroup(); var p = a.path || { type: "rect", size: [400, 400] }; var shp;
              if (p.type === "rect") { shp = grp.addProperty("ADBE Vector Shape - Rect"); shp.property("ADBE Vector Rect Size").setValue(p.size || [400, 400]); if (p.position) shp.property("ADBE Vector Rect Position").setValue(p.position); if (p.roundness) shp.property("ADBE Vector Rect Roundness").setValue(p.roundness); }
              else if (p.type === "ellipse") { shp = grp.addProperty("ADBE Vector Shape - Ellipse"); shp.property("ADBE Vector Ellipse Size").setValue(p.size || [400, 400]); if (p.position) shp.property("ADBE Vector Ellipse Position").setValue(p.position); }
              else if (p.type === "polystar") { shp = grp.addProperty("ADBE Vector Shape - Star"); shp.property("ADBE Vector Star Type").setValue(p.star ? 1 : 2); if (p.points) shp.property("ADBE Vector Star Points").setValue(p.points); if (p.outer_radius) shp.property("ADBE Vector Star Outer Radius").setValue(p.outer_radius); if (p.star && p.inner_radius) shp.property("ADBE Vector Star Inner Radius").setValue(p.inner_radius); if (p.position) shp.property("ADBE Vector Star Position").setValue(p.position); if (p.rotation) shp.property("ADBE Vector Star Rotation").setValue(p.rotation); }
              else { shp = grp.addProperty("ADBE Vector Shape - Group"); var s = new Shape(); s.vertices = p.vertices || [[0, 0], [100, 0], [100, 100]]; if (p.in_tangents) s.inTangents = p.in_tangents; if (p.out_tangents) s.outTangents = p.out_tangents; s.closed = p.closed !== false; shp.property("ADBE Vector Shape").setValue(s); }
              if (a.name) shp.name = a.name; res = { added: relPath(shp) };
            }
            else if (a.action === "add_fill") { var fl = targetGroup().addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue(__color(a.color || "#DEFF38", true)); if (a.opacity !== undefined) fl.property("ADBE Vector Fill Opacity").setValue(a.opacity); if (a.name) fl.name = a.name; res = { added: relPath(fl) }; }
            else if (a.action === "add_stroke") { var st = targetGroup().addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(__color(a.color || "#FFFFFF", true)); st.property("ADBE Vector Stroke Width").setValue(a.width !== undefined ? a.width : 2); if (a.opacity !== undefined) st.property("ADBE Vector Stroke Opacity").setValue(a.opacity); if (a.line_cap) st.property("ADBE Vector Stroke Line Cap").setValue({ butt: 1, round: 2, square: 3 }[a.line_cap]); if (a.line_join) st.property("ADBE Vector Stroke Line Join").setValue({ miter: 1, round: 2, bevel: 3 }[a.line_join]); if (a.dashes && a.dashes.length) { var dg = st.property("ADBE Vector Stroke Dashes"); for (var d = 0; d < a.dashes.length; d++) { var dp = dg.addProperty(d % 2 === 0 ? "ADBE Vector Stroke Dash 1" : "ADBE Vector Stroke Gap 1"); dp.setValue(a.dashes[d]); } } if (a.name) st.name = a.name; res = { added: relPath(st) }; }
            else if (a.action === "add_trim") { var tr = targetGroup().addProperty("ADBE Vector Filter - Trim"); var t = a.trim || {}; if (t.start !== undefined) tr.property("ADBE Vector Trim Start").setValue(t.start); if (t.end !== undefined) tr.property("ADBE Vector Trim End").setValue(t.end); if (t.offset !== undefined) tr.property("ADBE Vector Trim Offset").setValue(t.offset); if (a.draw_on) { var dOn = a.draw_on; var t0 = dOn.start_time !== undefined ? dOn.start_time : l.inPoint; var du = dOn.duration || 0.85; __setKeys(tr.property("ADBE Vector Trim End"), [{ time: t0, value: dOn.from !== undefined ? dOn.from : 0, ease: dOn.ease || "power3_in_out" }, { time: t0 + du, value: dOn.to !== undefined ? dOn.to : 100, ease: dOn.ease || "power3_in_out" }]); } if (a.name) tr.name = a.name; res = { added: relPath(tr), endKeys: tr.property("ADBE Vector Trim End").numKeys }; }
            else if (a.action === "add_repeater") { var rp = targetGroup().addProperty("ADBE Vector Filter - Repeater"); var r = a.repeater || {}; if (r.copies !== undefined) rp.property("ADBE Vector Repeater Copies").setValue(r.copies); if (r.offset !== undefined) rp.property("ADBE Vector Repeater Offset").setValue(r.offset); var rt = rp.property("ADBE Vector Repeater Transform"); if (r.position) rt.property("ADBE Vector Repeater Position").setValue(r.position); if (r.rotation !== undefined) rt.property("ADBE Vector Repeater Rotation").setValue(r.rotation); if (r.scale) rt.property("ADBE Vector Repeater Scale").setValue(r.scale); if (r.start_opacity !== undefined) rt.property("ADBE Vector Repeater Opacity 1").setValue(r.start_opacity); if (r.end_opacity !== undefined) rt.property("ADBE Vector Repeater Opacity 2").setValue(r.end_opacity); if (a.name) rp.name = a.name; res = { added: relPath(rp) }; }
            else if (a.action === "add_round_corners") { var rc = targetGroup().addProperty("ADBE Vector Filter - RC"); rc.property("ADBE Vector RoundCorner Radius").setValue(a.radius !== undefined ? a.radius : 12); if (a.name) rc.name = a.name; res = { added: relPath(rc) }; }
            else if (a.action === "set") { if (!a.content_path) __fail("content_path required", "BAD_ARG"); var sp = __prop(contents, a.content_path); if (sp.propertyType !== PropertyType.PROPERTY) __fail("Not a property", "BAD_ARG"); var v = __coerce(sp, a.value); if (a.at !== undefined) sp.setValueAtTime(a.at, v); else sp.setValue(v); res = __propInfo(sp); }
            else if (a.action === "remove") { if (!a.content_path) __fail("content_path required", "BAD_ARG"); var rmp = __prop(contents, a.content_path); var nm = relPath(rmp); rmp.remove(); res = { removed: nm }; }
            else __fail("Unknown action " + a.action, "BAD_ARG");
          });
          res.contents = tree(contents, 0);
          return __result(res);
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
