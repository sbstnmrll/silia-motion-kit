import { z } from "zod";
import { existsSync, statSync } from "node:fs";
import { argsVar } from "../bridge/index.js";
import { compRef, layerRef, propPath } from "./refs.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { withAutoDialogs } from "../host/dialogs.js";

export function getMogrtTools(ctx: ToolContext): ToolRecord {
  return {
    ae_mogrt: {
      description:
        "Essential Graphics / Motion Graphics Templates. controllers: list the comp's EGP controllers. add: expose a layer property as a controller (name). rename; set_template_name; remove (by index); validate: checks controller count, unsupported property types, fonts installed, and comp format before export; export: write a .mogrt to path (validate first). open_panel: open the comp in the Essential Graphics panel. Returns controllers and the .mogrt path/size.",
      parameters: {
        action: z.enum(["controllers", "add", "rename", "set_template_name", "remove", "validate", "export", "open_panel"]),
        comp: compRef,
        layer: layerRef.optional(),
        path: propPath.optional().describe("add: property path to expose."),
        name: z.string().optional().describe("add/rename: controller name; set_template_name: template name."),
        index: z.number().int().min(1).optional().describe("rename/remove: controller index."),
        mogrt_path: z.string().optional().describe("export: absolute .mogrt path (folder created)."),
        overwrite: z.boolean().optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        if (a.action === "export" && !a.mogrt_path) return err("mogrt_path required", "BAD_ARG");
        if (a.action === "export" && existsSync(a.mogrt_path as string) && !a.overwrite) return err(`${a.mogrt_path} exists; pass overwrite=true`, "EXISTS");
        const script = `
          ${argsVar("a", a)}
          __need(16.1, "Essential Graphics controller API");
          var c = __comp(a.comp);
          function controllers() { var out = []; var n = 0; try { n = c.motionGraphicsTemplateControllerCount; } catch (e0) {} for (var i = 1; i <= n; i++) { var rec = { index: i }; try { rec.name = c.getMotionGraphicsTemplateControllerName(i); } catch (e1) {} out.push(rec); } return out; }
          function summary() { var s = { comp: c.name, templateName: null, controllers: controllers() }; try { s.templateName = c.motionGraphicsTemplateName; } catch (e2) {} return s; }
          if (a.action === "controllers") return __result(summary());
          if (a.action === "open_panel") { c.openInEssentialGraphics(); return __result(summary()); }
          if (a.action === "set_template_name") { if (!a.name) return __error("name required", "BAD_ARG"); return __result(__mutate("Set template name", function () { c.motionGraphicsTemplateName = a.name; return summary(); })); }
          if (a.action === "add") {
            if (a.layer === undefined || !a.path) return __error("layer and path required", "BAD_ARG");
            var l = __layer(c, a.layer); var p = __prop(l, a.path);
            if (p.propertyType !== PropertyType.PROPERTY) return __error("Only leaf properties can be exposed", "BAD_ARG");
            if (!p.canAddToMotionGraphicsTemplate(c)) return __error("Property " + a.path + " cannot be added to the Essential Graphics panel (unsupported type or already added)", "UNSUPPORTED");
            return __result(__mutate("Add EGP controller", function () {
              var okAdd = a.name ? p.addToMotionGraphicsTemplateAs(c, a.name) : p.addToMotionGraphicsTemplate(c);
              var s = summary(); s.added = okAdd; s.property = { layer: l.name, path: __propPath(p), type: __valueTypeName(p.propertyValueType) }; return s;
            }));
          }
          if (a.action === "rename") { if (!a.index || !a.name) return __error("index and name required", "BAD_ARG"); return __result(__mutate("Rename controller", function () { c.setMotionGraphicsControllerName(a.index, a.name); return summary(); })); }
          if (a.action === "remove") { return __error("Removing controllers is not exposed by the scripting API; remove it in the Essential Graphics panel (Window > Essential Graphics).", "UNSUPPORTED"); }
          if (a.action === "validate" || a.action === "export") {
            var issues = [], warnings = [];
            var ctrls = controllers();
            if (!ctrls.length) issues.push("No controllers exposed; a MOGRT without controls is still valid but not editable in Premiere.");
            var tn = null; try { tn = c.motionGraphicsTemplateName; } catch (e3) {}
            if (!tn) warnings.push("Template name is empty; Premiere will show the comp name.");
            // fonts
            var fonts = {};
            for (var L = 1; L <= c.numLayers; L++) { var ly = c.layer(L); if (ly instanceof TextLayer) { try { var d = ly.property("ADBE Text Properties").property("ADBE Text Document").value; fonts[d.font] = true; } catch (e4) {} } }
            var fontList = __keys(fonts);
            if (app.fonts && app.fonts.allFonts) {
              var installed = {}; var fams = app.fonts.allFonts;
              for (var f = 0; f < fams.length; f++) for (var s2 = 0; s2 < fams[f].length; s2++) installed[fams[f][s2].postScriptName] = true;
              for (var fi = 0; fi < fontList.length; fi++) if (!installed[fontList[fi]]) warnings.push("Font not installed on this machine: " + fontList[fi] + " (Premiere on another machine will substitute unless the font is embedded/allowed)");
            }
            // nested comps and footage
            var footage = [], nested = 0;
            for (var L2 = 1; L2 <= c.numLayers; L2++) { var ly2 = c.layer(L2); if (__isAV(ly2) && ly2.source) { if (ly2.source instanceof CompItem) nested++; else if (ly2.source instanceof FootageItem && ly2.source.file) footage.push(ly2.source.name); } }
            if (footage.length) warnings.push("Footage is embedded in the MOGRT (" + footage.length + " file(s)): " + footage.slice(0, 5).join(", "));
            var res = { comp: c.name, templateName: tn, controllers: ctrls, fonts: fontList, nestedComps: nested, footage: footage.length, width: c.width, height: c.height, frameRate: __round(c.frameRate, 3), duration: __round(c.duration), issues: issues, warnings: warnings, valid: issues.length === 0 };
            if (a.action === "validate") return __result(res);
            // exportAsMotionGraphicsTemplate opens a modal "project needs to be saved" dialog on a
            // dirty project, which wedges the bridge. Save first (or refuse when never saved).
            if (!app.project.file) return __error("The project has never been saved; MOGRT export needs a saved project. Run ae_project action=save path=... first.", "NO_FILE");
            if (app.project.dirty) app.project.save();
            var mf = __file(a.mogrt_path); __ensureFolder(mf.parent.fsName);
            if (mf.exists) mf.remove();
            var exported = c.exportAsMotionGraphicsTemplate(true, mf.parent.fsName);
            // AE names the file after the template/comp name; move it to the requested path.
            var produced = __file(mf.parent.fsName + "/" + (tn || c.name) + ".mogrt");
            if (!produced.exists) { var alt = mf.parent.getFiles(function (x) { return x instanceof File && /\\.mogrt$/i.test(x.name); }); if (alt && alt.length) { alt.sort(function (p1, p2) { return p2.modified - p1.modified; }); produced = alt[0]; } }
            if (produced.exists && produced.fsName !== mf.fsName) { produced.rename(mf.name); produced = __file(mf.fsName); }
            res.exported = exported; res.mogrtPath = produced.exists ? produced.fsName : null; res.bytes = produced.exists ? produced.length : 0;
            if (!produced.exists) return __error("exportAsMotionGraphicsTemplate returned " + exported + " but no .mogrt was written in " + mf.parent.fsName + ". If a dialog appeared in After Effects, dismiss it and retry.", "EXPORT_FAILED");
            return __result(res);
          }
          return __error("Unknown action", "BAD_ARG");
        `;
        if (a.action !== "export") return runScript(ctx, script, { timeoutMs: 30_000 });
        // The exporter raises a modal "fonts were not synced from Adobe" warning for every
        // non-Adobe font (ES Klarheit). Answer that one automatically; report anything else.
        const { result: r, dialogs } = await withAutoDialogs(runScript(ctx, script, { timeoutMs: 180_000, longRunning: true }));
        if (r.success) {
          const d = r.data as Record<string, unknown> & { mogrtPath?: string };
          if (d.mogrtPath && existsSync(d.mogrtPath)) d.bytes = statSync(d.mogrtPath).size;
          if (dialogs.length) d.dialogs = dialogs;
        } else if (dialogs.length) {
          r.error += ` Dialogs seen: ${dialogs.map((d) => `"${d.text.slice(0, 120)}" -> ${d.acted ?? "left open"}`).join("; ")}`;
        }
        return r;
      }),
    },
  };
}

void ok;
