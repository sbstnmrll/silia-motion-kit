import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, layerRefs, colorValue } from "./refs.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

const PRESETS: Record<string, { w: number; h: number; fps: number }> = {
  h1080p30: { w: 1920, h: 1080, fps: 30 },
  h1080p25: { w: 1920, h: 1080, fps: 25 },
  h1080p24: { w: 1920, h: 1080, fps: 24 },
  h1080p60: { w: 1920, h: 1080, fps: 60 },
  v1080x1920p30: { w: 1080, h: 1920, fps: 30 },
  v1080x1920p60: { w: 1080, h: 1920, fps: 60 },
  square1080p30: { w: 1080, h: 1080, fps: 30 },
  uhd2160p30: { w: 3840, h: 2160, fps: 30 },
};

export function getCompTools(ctx: ToolContext): ToolRecord {
  return {
    ae_comp: {
      description:
        "Compositions. list: all comps. get: one comp with its layers. create: new comp (preset h1080p30|v1080x1920p60|v1080x1920p30|... or explicit width/height/frame_rate; duration seconds; bg color). update: rename, duration, frame_rate, size, bg, work area, motion blur settings, renderer, resolution. duplicate, delete, set_active (open in viewer), open. All mutations return the CompRef read-back.",
      parameters: {
        action: z.enum(["list", "get", "create", "update", "duplicate", "delete", "set_active", "open"]),
        comp: compRef,
        name: z.string().optional().describe("create: comp name; update/duplicate: new name."),
        preset: z.enum(Object.keys(PRESETS) as [string, ...string[]]).optional(),
        width: z.number().int().min(4).max(30000).optional(),
        height: z.number().int().min(4).max(30000).optional(),
        pixel_aspect: z.number().positive().optional(),
        frame_rate: z.number().positive().optional(),
        duration: z.number().positive().optional().describe("Seconds."),
        bg_color: colorValue.optional(),
        folder: z.string().optional().describe("create: put the comp in this folder (created if missing)."),
        work_area: z.object({ start: z.number().min(0), duration: z.number().positive() }).optional(),
        display_start_time: z.number().optional(),
        motion_blur: z.object({ enabled: z.boolean().optional(), shutterAngle: z.number().min(0).max(720).optional(), shutterPhase: z.number().min(-360).max(360).optional(), samplesPerFrame: z.number().int().min(2).max(64).optional() }).optional(),
        renderer: z.enum(["classic", "advanced3d", "cinema4d"]).optional(),
        resolution_factor: z.array(z.number().int().min(1).max(8)).length(2).optional().describe("[x,y] downsample, e.g. [2,2] = Half."),
        hide_shy: z.boolean().optional(),
        include_layers: z.boolean().optional().describe("get: include layer list (default true)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const preset = a.preset ? PRESETS[a.preset as string] : undefined;
        const script = `
          ${argsVar("a", { ...a, preset: preset ?? null })}
          var p = __project();
          if (a.action === "list") {
            var out = [];
            for (var i = 1; i <= p.numItems; i++) if (p.item(i) instanceof CompItem) out.push(__compInfo(p.item(i)));
            return __result({ count: out.length, comps: out });
          }
          if (a.action === "create") {
            var w = a.width || (a.preset && a.preset.w) || 1920, h = a.height || (a.preset && a.preset.h) || 1080;
            var fps = a.frame_rate || (a.preset && a.preset.fps) || 30, dur = a.duration || 10, par = a.pixel_aspect || 1;
            if (!a.name) return __error("name is required", "BAD_ARG");
            return __result(__mutate("Create comp", function () {
              var c = p.items.addComp(a.name, w, h, par, dur, fps);
              if (a.bg_color) c.bgColor = __color(a.bg_color);
              if (a.folder) { var f = __itemByName(a.folder, "folder") || p.items.addFolder(a.folder); c.parentFolder = f; }
              c.openInViewer();
              return __compInfo(c);
            }));
          }
          var c = __comp(a.comp);
          if (a.action === "get") {
            var info = __compInfo(c);
            if (a.include_layers !== false) { info.layers = []; for (var L = 1; L <= c.numLayers; L++) info.layers.push(__layerInfo(c.layer(L))); }
            return __result(info);
          }
          if (a.action === "update") {
            return __result(__mutate("Update comp", function () {
              if (a.name) c.name = a.name;
              if (a.width || a.height) { c.width = a.width || c.width; c.height = a.height || c.height; }
              if (a.pixel_aspect) c.pixelAspect = a.pixel_aspect;
              if (a.frame_rate) c.frameRate = a.frame_rate;
              if (a.duration) c.duration = a.duration;
              if (a.bg_color) c.bgColor = __color(a.bg_color);
              if (a.work_area) { c.workAreaStart = a.work_area.start; c.workAreaDuration = Math.min(a.work_area.duration, c.duration - a.work_area.start); }
              if (a.display_start_time !== undefined) c.displayStartTime = a.display_start_time;
              if (a.motion_blur) { var mb = a.motion_blur; if (mb.enabled !== undefined) c.motionBlur = mb.enabled; if (mb.shutterAngle !== undefined) c.shutterAngle = mb.shutterAngle; if (mb.shutterPhase !== undefined) c.shutterPhase = mb.shutterPhase; if (mb.samplesPerFrame !== undefined) c.motionBlurSamplesPerFrame = mb.samplesPerFrame; }
              if (a.renderer) { var rmap = { classic: "ADBE Advanced 3d", advanced3d: "ADBE Ernst", cinema4d: "ADBE Picasso" }; var want = rmap[a.renderer]; var ok = false; try { for (var r = 0; r < c.renderers.length; r++) if (c.renderers[r] === want) ok = true; } catch (e0) { ok = true; } if (ok) c.renderer = want; else __warn("Renderer " + want + " not available: " + c.renderers.join(", ")); }
              if (a.resolution_factor) c.resolutionFactor = a.resolution_factor;
              if (a.hide_shy !== undefined) c.hideShyLayers = a.hide_shy;
              return __compInfo(c);
            }));
          }
          if (a.action === "duplicate") return __result(__mutate("Duplicate comp", function () { var d = c.duplicate(); if (a.name) d.name = a.name; return __compInfo(d); }));
          if (a.action === "delete") { var snap = __compInfo(c); __mutate("Delete comp", function () { c.remove(); }); return __result({ deleted: snap }); }
          if (a.action === "set_active" || a.action === "open") { c.openInViewer(); return __result(__compInfo(c)); }
          return __error("Unknown action " + a.action, "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },

    ae_markers: {
      description:
        "Comp or layer markers. list; add one {time, comment, duration, label, chapter, url}; add_bulk many; update by index or time; remove by index or time; clear all. Target a layer by passing layer, otherwise the comp marker track.",
      parameters: {
        action: z.enum(["list", "add", "add_bulk", "update", "remove", "clear"]),
        comp: compRef,
        layer: layerRef.optional(),
        marker: z.object({ time: z.number().min(0), comment: z.string().optional(), duration: z.number().min(0).optional(), label: z.number().int().min(0).max(16).optional(), chapter: z.string().optional(), url: z.string().optional(), protectedRegion: z.boolean().optional() }).optional(),
        markers: z.array(z.object({ time: z.number().min(0), comment: z.string().optional(), duration: z.number().min(0).optional(), label: z.number().int().min(0).max(16).optional(), chapter: z.string().optional(), url: z.string().optional() })).optional(),
        index: z.number().int().min(1).optional().describe("update/remove: 1-based marker index."),
        time: z.number().min(0).optional().describe("update/remove: nearest marker to this time (within half a frame)."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          var mp = a.layer !== undefined ? __layer(c, a.layer).property("ADBE Marker") : c.markerProperty;
          if (!mp) return __error("No marker property available", "NO_MARKERS");
          function mk(m) { var v = new MarkerValue(m.comment || ""); if (m.duration) v.duration = m.duration; if (m.chapter) v.chapter = m.chapter; if (m.url) v.url = m.url; if (m.label !== undefined) v.label = m.label; if (m.protectedRegion !== undefined) v.protectedRegion = m.protectedRegion; return v; }
          function list() { var out = []; for (var k = 1; k <= mp.numKeys; k++) { var v = mp.keyValue(k); out.push({ index: k, time: __round(mp.keyTime(k)), comment: v.comment, duration: v.duration, label: v.label, chapter: v.chapter, url: v.url }); } return out; }
          function resolveIndex() { if (a.index) return a.index; if (a.time !== undefined) { var k = mp.nearestKeyIndex(a.time); if (Math.abs(mp.keyTime(k) - a.time) <= c.frameDuration / 2) return k; __fail("No marker within half a frame of t=" + a.time, "NOT_FOUND"); } __fail("index or time required", "BAD_ARG"); }
          if (a.action === "list") return __result({ target: a.layer !== undefined ? "layer" : "comp", markers: list() });
          if (a.action === "add") { if (!a.marker) return __error("marker is required", "BAD_ARG"); __mutate("Add marker", function () { mp.setValueAtTime(a.marker.time, mk(a.marker)); }); return __result({ markers: list() }); }
          if (a.action === "add_bulk") { var ms = a.markers || []; __mutate("Add markers", function () { for (var i = 0; i < ms.length; i++) mp.setValueAtTime(ms[i].time, mk(ms[i])); }); return __result({ added: ms.length, markers: list() }); }
          if (a.action === "update") { var k = resolveIndex(); if (!a.marker) return __error("marker is required", "BAD_ARG"); __mutate("Update marker", function () { var t = mp.keyTime(k); var cur = mp.keyValue(k); var m = a.marker; var v = new MarkerValue(m.comment !== undefined ? m.comment : cur.comment); v.duration = m.duration !== undefined ? m.duration : cur.duration; v.chapter = m.chapter !== undefined ? m.chapter : cur.chapter; v.url = m.url !== undefined ? m.url : cur.url; v.label = m.label !== undefined ? m.label : cur.label; mp.removeKey(k); mp.setValueAtTime(m.time !== undefined ? m.time : t, v); }); return __result({ markers: list() }); }
          if (a.action === "remove") { var k2 = resolveIndex(); __mutate("Remove marker", function () { mp.removeKey(k2); }); return __result({ markers: list() }); }
          if (a.action === "clear") { __mutate("Clear markers", function () { for (var q = mp.numKeys; q >= 1; q--) mp.removeKey(q); }); return __result({ markers: [] }); }
          return __error("Unknown action " + a.action, "BAD_ARG");
        `;
        return runScript(ctx, script);
      }),
    },

    ae_precompose: {
      description: "Precompose layers into a new nested comp. move_all_attributes=true moves keyframes/effects into the precomp; false leaves them on the new layer. After Effects only allows false for a SINGLE layer (several layers always move their attributes), so the flag is forced to true when more than one layer is given.",
      parameters: {
        comp: compRef,
        layers: layerRefs,
        name: z.string().min(1).describe("Name of the new precomp."),
        move_all_attributes: z.boolean().optional().describe("Single layer only (default true). Ignored (forced true) for several layers, as AE requires."),
        open_in_viewer: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var c = __comp(a.comp);
          var ls = __layers(c, a.layers);
          var idx = __map(ls, function (l) { return l.index; });
          var moveAll = idx.length > 1 ? true : (a.move_all_attributes !== undefined ? a.move_all_attributes : true);
          return __result(__mutate("Precompose", function () {
            var nc = c.layers.precompose(idx, a.name, moveAll);
            var newLayer = null;
            for (var i = 1; i <= c.numLayers; i++) if (c.layer(i).source === nc) { newLayer = c.layer(i); break; }
            if (a.open_in_viewer) nc.openInViewer();
            return { precomp: __compInfo(nc), layer: newLayer ? __layerInfo(newLayer) : null, movedAttributes: moveAll };
          }));
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
