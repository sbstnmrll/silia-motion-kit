import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, layerRefs, propValue } from "./refs.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

/** Curated effect templates: matchName + param matchName -> value (data, not code). */
const EFFECT_TEMPLATES: Record<string, { matchName: string; params: Record<string, unknown>; note?: string }> = {
  gaussian_blur: { matchName: "ADBE Gaussian Blur 2", params: { "ADBE Gaussian Blur 2-0001": 20, "ADBE Gaussian Blur 2-0003": 1 } },
  directional_blur: { matchName: "ADBE Motion Blur", params: { "ADBE Motion Blur-0001": 0, "ADBE Motion Blur-0002": 20 } },
  glow: { matchName: "ADBE Glo2", params: { "ADBE Glo2-0002": 60, "ADBE Glo2-0003": 25, "ADBE Glo2-0004": 1 } },
  drop_shadow: { matchName: "ADBE Drop Shadow", params: { "ADBE Drop Shadow-0001": [0, 0, 0, 1], "ADBE Drop Shadow-0002": 128, "ADBE Drop Shadow-0003": 135, "ADBE Drop Shadow-0004": 12, "ADBE Drop Shadow-0005": 20 } },
  fill_lime: { matchName: "ADBE Fill", params: { "ADBE Fill-0002": "#DEFF38" } },
  fill_black: { matchName: "ADBE Fill", params: { "ADBE Fill-0002": "#000000" } },
  tint_mono: { matchName: "ADBE Tint", params: { "ADBE Tint-0003": 100 } },
  levels: { matchName: "ADBE Pro Levels2", params: {} },
  hue_saturation: { matchName: "ADBE HUE SATURATION", params: {} },
  transform: { matchName: "ADBE Geometry2", params: {} },
  linear_wipe: { matchName: "ADBE Linear Wipe", params: { "ADBE Linear Wipe-0001": 0, "ADBE Linear Wipe-0002": 90, "ADBE Linear Wipe-0003": 40 } },
  grain: { matchName: "ADBE Noise", params: { "ADBE Noise-0001": 6, "ADBE Noise-0002": 0 } },
  slider: { matchName: "ADBE Slider Control", params: {} },
  color_control: { matchName: "ADBE Color Control", params: {} },
  checkbox: { matchName: "ADBE Checkbox Control", params: {} },
  point_control: { matchName: "ADBE Point Control", params: {} },
  dropdown: { matchName: "ADBE Dropdown Control", params: {} },
  lumetri: { matchName: "ADBE Lumetri", params: {} },
  exposure: { matchName: "ADBE Exposure2", params: {} },
  vignette: { matchName: "ADBE Vignette", params: {} },
};

export function getEffectTools(ctx: ToolContext): ToolRecord {
  return {
    ae_effects_catalog: {
      description:
        "Installed effects and presets. effects: search app.effects by regex on display name or matchName (category included). resolve: map a display name or alias to the canonical matchName (includes corrections: Glow=ADBE Glo2, Directional Blur=ADBE Motion Blur, Gaussian Blur=ADBE Gaussian Blur 2). templates: list the curated templates usable with ae_effect action=apply template=... presets: list .ffx animation presets under the AE Presets folder (optional filter).",
      parameters: {
        action: z.enum(["effects", "resolve", "templates", "presets"]),
        regex: z.string().optional(),
        name: z.string().optional().describe("resolve: display name or alias."),
        limit: z.number().int().min(1).max(500).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (a.action === "templates") return { success: true, data: { templates: Object.entries(EFFECT_TEMPLATES).map(([k, v]) => ({ name: k, matchName: v.matchName, params: v.params })) } };
        const script = `
          ${argsVar("a", a)}
          if (a.action === "effects") {
            var re = a.regex ? new RegExp(a.regex, "i") : null; var out = []; var limit = a.limit || 200;
            var all = __effectsList();
            for (var i = 0; i < all.length && out.length < limit; i++) { var e = all[i]; if (!re || re.test(e.displayName) || re.test(e.matchName) || re.test(e.category)) out.push(e); }
            return __result({ total: all.length, count: out.length, effects: out });
          }
          if (a.action === "resolve") { if (!a.name) return __error("name required", "BAD_ARG"); var mn = __effectMatchName(a.name); var disp = null; var all2 = __effectsList(); for (var j = 0; j < all2.length; j++) if (all2[j].matchName === mn) disp = all2[j].displayName; return __result({ input: a.name, matchName: mn, displayName: disp }); }
          if (a.action === "presets") {
            var roots = [new Folder(Folder.appPackage.fsName + "/Presets"), new Folder(Folder.userData.fsName + "/Adobe/After Effects/" + app.version.replace(/x.*$/, "") + "/User Presets"), new Folder(Folder.myDocuments.fsName + "/Adobe/After Effects " + (2000 + parseInt(app.version, 10)) + "/User Presets")];
            var re2 = a.regex ? new RegExp(a.regex, "i") : null; var found = []; var limit2 = a.limit || 200;
            function walk(f, depth) { if (!f.exists || depth > 6 || found.length >= limit2) return; var items = f.getFiles(); for (var k = 0; k < items.length; k++) { var it = items[k]; if (it instanceof Folder) walk(it, depth + 1); else if (/\\.ffx$/i.test(it.name)) { var nm = decodeURI(it.name).replace(/\\.ffx$/i, ""); if (!re2 || re2.test(nm) || re2.test(it.fsName)) found.push({ name: nm, path: it.fsName }); } if (found.length >= limit2) return; } }
            for (var r = 0; r < roots.length; r++) walk(roots[r], 0);
            return __result({ count: found.length, presets: found });
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        return runScript(ctx, script, { timeoutMs: 60_000 });
      }),
    },

    ae_effect: {
      description:
        "Effects on a layer (effect parade). list; apply (matchName, display name, alias, or template name from ae_effects_catalog templates) with optional params {paramMatchNameOrName: value} and position; get_params (all parameters of one effect with values); set_params; remove; reorder (to index); toggle (enabled); duplicate; apply_preset (.ffx path via layer.applyPreset). Effects are addressed by effect index, name, or matchName[instance]. Accepts several layers via layers.",
      parameters: {
        action: z.enum(["list", "apply", "get_params", "set_params", "remove", "reorder", "toggle", "duplicate", "apply_preset"]),
        comp: compRef,
        layer: layerRef.optional(),
        layers: layerRefs.optional(),
        effect: z.union([z.number().int().min(1), z.string()]).optional().describe("Effect index, display name, or matchName (append [n] for the nth instance)."),
        name: z.string().optional().describe("apply: effect display name / alias / matchName."),
        template: z.string().optional().describe("apply: curated template name (see ae_effects_catalog templates)."),
        params: z.record(z.string(), propValue).optional().describe("apply/set_params: {paramMatchNameOrName: value}."),
        at: z.number().min(0).optional().describe("set_params: write keyframes at this time instead of static values."),
        rename: z.string().optional().describe("apply: custom effect instance name."),
        to: z.number().int().min(1).optional().describe("reorder: target index."),
        enabled: z.boolean().optional(),
        preset_path: z.string().optional().describe("apply_preset: absolute .ffx path."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const tpl = a.template ? EFFECT_TEMPLATES[a.template as string] : undefined;
        if (a.template && !tpl) return { success: false, error: `Unknown template ${String(a.template)}. Known: ${Object.keys(EFFECT_TEMPLATES).join(", ")}`, code: "BAD_ARG" };
        const script = `
          ${argsVar("a", { ...a, template: tpl ?? null })}
          var c = __comp(a.comp);
          var refs = a.layers || (a.layer !== undefined ? [a.layer] : null);
          if (!refs) return __error("layer or layers is required", "BAD_ARG");
          var ls = __layers(c, refs);
          function parade(l) { var fx = l.property("ADBE Effect Parade"); if (!fx) __fail("Layer " + l.name + " cannot hold effects", "BAD_ARG"); return fx; }
          function findFx(l, ref) { var fx = parade(l); if (typeof ref === "number") { if (ref < 1 || ref > fx.numProperties) __fail("Effect index out of range", "NOT_FOUND"); return fx.property(ref); } var found = __childProp(fx, String(ref)); if (!found) { try { found = __childProp(fx, __effectMatchName(String(ref))); } catch (e0) {} } if (!found) __fail("Effect not found: " + ref, "NOT_FOUND"); return found; }
          function setParams(fx, params, at) { var applied = []; for (var k in params) { if (!params.hasOwnProperty(k)) continue; var p = __childProp(fx, k); if (!p) { __warn("Param not found on " + fx.name + ": " + k); continue; } var v = __coerce(p, params[k]); if (at !== undefined) p.setValueAtTime(at, v); else p.setValue(v); applied.push({ param: p.matchName, name: p.name, value: __value(p.value) }); } return applied; }
          function listFx(l) { var fx = parade(l); var out = []; for (var i = 1; i <= fx.numProperties; i++) out.push(__effectInfo(fx.property(i), false)); return out; }
          var results = [];
          if (a.action === "list") { for (var i = 0; i < ls.length; i++) results.push({ layer: ls[i].name, effects: listFx(ls[i]) }); return __result({ layers: results }); }
          if (a.action === "get_params") { for (var g = 0; g < ls.length; g++) { var fxg = findFx(ls[g], a.effect); results.push({ layer: ls[g].name, effect: __effectInfo(fxg, true) }); } return __result({ layers: results }); }
          __mutate("Effect " + a.action, function () {
            for (var i = 0; i < ls.length; i++) {
              var l = ls[i];
              if (a.action === "apply") {
                var mn = a.template ? a.template.matchName : __effectMatchName(a.name || "");
                var added = parade(l).addProperty(mn);
                if (a.rename) added.name = a.rename;
                var params = {}; if (a.template) for (var tk in a.template.params) if (a.template.params.hasOwnProperty(tk)) params[tk] = a.template.params[tk]; if (a.params) for (var pk in a.params) if (a.params.hasOwnProperty(pk)) params[pk] = a.params[pk];
                var appliedParams = setParams(added, params, a.at);
                results.push({ layer: l.name, effect: __effectInfo(added, true), appliedParams: appliedParams });
              } else if (a.action === "set_params") { var fx1 = findFx(l, a.effect); var ap = setParams(fx1, a.params || {}, a.at); results.push({ layer: l.name, effect: __effectInfo(fx1, true), appliedParams: ap }); }
              else if (a.action === "remove") { var fx2 = findFx(l, a.effect); var snap = __effectInfo(fx2, false); fx2.remove(); results.push({ layer: l.name, removed: snap, effects: listFx(l) }); }
              else if (a.action === "reorder") { var fx3 = findFx(l, a.effect); if (!a.to) __fail("to required", "BAD_ARG"); fx3.moveTo(Math.max(1, Math.min(parade(l).numProperties, a.to))); results.push({ layer: l.name, effects: listFx(l) }); }
              else if (a.action === "toggle") { var fx4 = findFx(l, a.effect); fx4.enabled = a.enabled !== undefined ? a.enabled : !fx4.enabled; results.push({ layer: l.name, effect: __effectInfo(fx4, false) }); }
              else if (a.action === "duplicate") { var fx5 = findFx(l, a.effect); var d = fx5.duplicate(); results.push({ layer: l.name, effect: __effectInfo(d, false), effects: listFx(l) }); }
              else if (a.action === "apply_preset") { if (!a.preset_path) __fail("preset_path required", "BAD_ARG"); var pf = __file(a.preset_path); if (!pf.exists) __fail("Preset not found: " + pf.fsName, "NOT_FOUND"); var before = parade(l).numProperties; l.applyPreset(pf); results.push({ layer: l.name, added: parade(l).numProperties - before, effects: listFx(l) }); }
              else __fail("Unknown action " + a.action, "BAD_ARG");
            }
          });
          return __result({ layers: results });
        `;
        return runScript(ctx, script);
      }),
    },
  };
}
