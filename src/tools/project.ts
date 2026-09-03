import { z } from "zod";
import { argsVar } from "../bridge/index.js";
import { runScript, safe, type ToolContext, type ToolRecord } from "./types.js";
import { withAutoDialogs } from "../host/dialogs.js";

export function getProjectTools(ctx: ToolContext): ToolRecord {
  return {
    ae_project: {
      description:
        "Project lifecycle. info: summary (path, dirty, comps, missing footage). new: new empty project (fails if the current one is dirty unless force). open: open an .aep. save: save (optionally save-as to a new path). save_copy: write a copy to path and keep working on the original (used before renders). close: close with close_mode save|discard. set_settings: bitsPerChannel 8|16|32, timeDisplay timecode|frames, framesCountType.",
      parameters: {
        action: z.enum(["info", "new", "open", "save", "save_copy", "close", "set_settings"]),
        path: z.string().optional().describe("open/save/save_copy: absolute .aep path."),
        force: z.boolean().optional().describe("new/open/close: proceed even if the current project has unsaved changes (they are discarded)."),
        close_mode: z.enum(["save", "discard"]).optional().describe("close: default discard requires force=true when dirty."),
        bitsPerChannel: z.union([z.literal(8), z.literal(16), z.literal(32)]).optional(),
        timeDisplay: z.enum(["timecode", "frames"]).optional(),
        framesCountType: z.enum(["start_0", "start_1", "timecode_conversion"]).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var p = app.project;
          if (a.action === "info") return __result(__projectInfo());
          if (a.action === "new") {
            if (p && p.dirty && !a.force) return __error("Project has unsaved changes; pass force=true to discard them", "DIRTY");
            if (p && p.dirty) p.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.newProject();
            return __result(__projectInfo());
          }
          if (a.action === "open") {
            if (!a.path) return __error("path is required", "BAD_ARG");
            var f = __file(a.path);
            if (!f.exists) return __error("File not found: " + f.fsName, "NOT_FOUND");
            if (p && p.dirty && !a.force) return __error("Project has unsaved changes; pass force=true to discard them", "DIRTY");
            if (p && p.dirty) p.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            app.open(f);
            return __result(__projectInfo());
          }
          if (a.action === "save") {
            if (!p) return __error("No project open", "NO_PROJECT");
            if (a.path) { var sf = __file(a.path); __ensureFolder(sf.parent.fsName); p.save(sf); }
            else { if (!p.file) return __error("Project has never been saved; pass path", "NO_FILE"); p.save(); }
            return __result({ saved: true, file: p.file ? p.file.fsName : null, dirty: p.dirty });
          }
          if (a.action === "save_copy") {
            if (!p) return __error("No project open", "NO_PROJECT");
            if (!a.path) return __error("path is required", "BAD_ARG");
            var original = p.file;
            var wasDirty = p.dirty;
            var cf = __file(a.path); __ensureFolder(cf.parent.fsName);
            p.save(cf);
            // save() re-targets the open project at the copy; go back to the original file.
            if (original) {
              app.open(original);
              if (wasDirty) __warn("Original project was dirty; unsaved changes were written to the copy, and the original reopened from disk.");
            } else {
              __warn("Project had never been saved: it now points at the copy.");
            }
            return __result({ copy: cf.fsName, original: original ? original.fsName : null, bytes: __file(cf.fsName).length });
          }
          if (a.action === "close") {
            if (!p) return __result({ closed: false, reason: "no project" });
            if (a.close_mode === "save") { if (!p.file) return __error("Cannot save: project has no file", "NO_FILE"); p.close(CloseOptions.SAVE_CHANGES); }
            else { if (p.dirty && !a.force) return __error("Project is dirty; pass force=true to discard or close_mode=save", "DIRTY"); p.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
            return __result({ closed: true });
          }
          if (a.action === "set_settings") {
            if (!p) return __error("No project open", "NO_PROJECT");
            return __result(__mutate("Project settings", function () {
              if (a.bitsPerChannel) p.bitsPerChannel = a.bitsPerChannel;
              if (a.timeDisplay) p.timeDisplayType = a.timeDisplay === "frames" ? TimeDisplayType.FRAMES : TimeDisplayType.TIMECODE;
              if (a.framesCountType) p.framesCountType = a.framesCountType === "start_0" ? FramesCountType.FC_START_0 : a.framesCountType === "start_1" ? FramesCountType.FC_START_1 : FramesCountType.FC_TIMECODE_ZERO;
              return __projectInfo();
            }));
          }
          return __error("Unknown action " + a.action, "BAD_ARG");
        `;
        if (a.action === "open") {
          const { result, dialogs } = await withAutoDialogs(runScript(ctx, script, { timeoutMs: 120_000, longRunning: true }), { allowEmptyText: true });
          if (result.success && dialogs.length) (result.data as Record<string, unknown>).dialogs = dialogs.map((x) => ({ text: x.text.slice(0, 200), acted: x.acted }));
          return result;
        }
        return runScript(ctx, script, { timeoutMs: 60_000, longRunning: true });
      }),
    },

    ae_items: {
      description:
        "Project panel items (footage, comps, folders, solids). list: with filter {type, nameRegex, folder, missingOnly}. get: one item by id or name. import: file (or folder path) with import_as footage|comp|comp_cropped|project, optional sequence=true for image sequences, add_to_comp to also place it as a layer. replace: swap an item's source file. relink_missing: search dirs for missing footage by file name. interpret: set conformFrameRate, alphaMode, loop, premulColor. create_folder, move (to folder), rename, delete, find_missing.",
      parameters: {
        action: z.enum(["list", "get", "import", "import_sequence", "replace", "relink_missing", "interpret", "create_folder", "move", "rename", "delete", "find_missing"]),
        item: z.union([z.number().int(), z.string()]).optional().describe("Item id or name (get/replace/interpret/move/rename/delete)."),
        filter: z.object({ type: z.enum(["comp", "footage", "folder", "solid", "placeholder"]).optional(), nameRegex: z.string().optional(), folder: z.string().optional(), missingOnly: z.boolean().optional() }).optional(),
        path: z.string().optional().describe("import/import_sequence/replace: absolute file path (first frame for sequences)."),
        import_as: z.enum(["footage", "comp", "comp_cropped", "project"]).optional(),
        sequence: z.boolean().optional().describe("import: treat as image sequence."),
        force_alphabetical: z.boolean().optional(),
        folder: z.string().optional().describe("import/create_folder/move: destination folder name (created if missing for import)."),
        add_to_comp: z.union([z.string(), z.number().int()]).optional().describe("import: also add the item as a layer to this comp."),
        name: z.string().optional().describe("create_folder/rename: new name."),
        search_dirs: z.array(z.string()).optional().describe("relink_missing: directories to search recursively."),
        interpret: z.object({ conformFrameRate: z.number().optional(), alphaMode: z.enum(["ignore", "straight", "premultiplied"]).optional(), premulColor: z.union([z.string(), z.array(z.number())]).optional(), loop: z.number().int().optional(), invertAlpha: z.boolean().optional() }).optional(),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const script = `
          ${argsVar("a", a)}
          var p = __project();
          function findItem(ref) {
            if (ref === undefined || ref === null) __fail("item is required", "BAD_ARG");
            var it = typeof ref === "number" ? __itemById(ref) : (/^#\\d+$/.test(String(ref)) ? __itemById(parseInt(String(ref).substr(1), 10)) : __itemByName(String(ref)));
            if (!it) __fail("Item not found: " + ref, "ITEM_NOT_FOUND");
            return it;
          }
          function findFolder(name, create) {
            if (!name) return p.rootFolder;
            var f = __itemByName(name, "folder");
            if (f) return f;
            if (create) return p.items.addFolder(name);
            __fail("Folder not found: " + name, "ITEM_NOT_FOUND");
          }
          if (a.action === "list") {
            var f = a.filter || {}; var re = f.nameRegex ? new RegExp(f.nameRegex, "i") : null; var out = [];
            var folderItem = f.folder ? findFolder(f.folder, false) : null;
            for (var i = 1; i <= p.numItems; i++) {
              var it = p.item(i);
              if (f.type && __itemType(it) !== f.type) continue;
              if (re && !re.test(it.name)) continue;
              if (folderItem && it.parentFolder !== folderItem) continue;
              if (f.missingOnly) { var miss = false; try { miss = it instanceof FootageItem && it.footageMissing; } catch (e0) {} if (!miss) continue; }
              out.push(__itemInfo(it));
            }
            return __result({ count: out.length, items: out.slice(0, 500) });
          }
          if (a.action === "get") return __result(__itemInfo(findItem(a.item)));
          if (a.action === "find_missing") return __result({ missing: __missingFootage() });
          if (a.action === "import" || a.action === "import_sequence") {
            if (!a.path) return __error("path is required", "BAD_ARG");
            var file = __file(a.path);
            if (!file.exists) { var fold = __folder(a.path); if (!fold.exists) return __error("Path not found: " + file.fsName, "NOT_FOUND"); }
            return __result(__mutate("Import", function () {
              var io = new ImportOptions(file);
              if (a.sequence || a.action === "import_sequence") { io.sequence = true; if (a.force_alphabetical) io.forceAlphabetical = true; }
              var asMap = { footage: ImportAsType.FOOTAGE, comp: ImportAsType.COMP, comp_cropped: ImportAsType.COMP_CROPPED_LAYERS, project: ImportAsType.PROJECT };
              if (a.import_as) { var want = asMap[a.import_as]; if (io.canImportAs(want)) io.importAs = want; else __warn("Cannot import as " + a.import_as + "; using default"); }
              var item = p.importFile(io);
              if (a.folder) item.parentFolder = findFolder(a.folder, true);
              var res = { item: __itemInfo(item) };
              if (a.add_to_comp !== undefined) { var c = __comp(a.add_to_comp); var l = c.layers.add(item); res.layer = __layerInfo(l); res.comp = { id: c.id, name: c.name }; }
              return res;
            }));
          }
          if (a.action === "replace") {
            var target = findItem(a.item); if (!(target instanceof FootageItem)) return __error("Only footage items can be replaced", "BAD_ARG");
            var nf = __file(a.path); if (!nf.exists) return __error("File not found: " + nf.fsName, "NOT_FOUND");
            return __result(__mutate("Replace footage", function () { target.replace(nf); return __itemInfo(target); }));
          }
          if (a.action === "relink_missing") {
            var dirs = a.search_dirs || []; if (!dirs.length) return __error("search_dirs is required", "BAD_ARG");
            var index = {};
            function walk(folder, depth) { if (depth > 8) return; var entries = folder.getFiles(); for (var k = 0; k < entries.length; k++) { var en = entries[k]; if (en instanceof Folder) walk(en, depth + 1); else { var nm = decodeURI(en.name).toLowerCase(); if (!index[nm]) index[nm] = en; } } }
            for (var d = 0; d < dirs.length; d++) { var df = __folder(dirs[d]); if (df.exists) walk(df, 0); else __warn("Search dir missing: " + dirs[d]); }
            var relinked = [], still = [];
            __mutate("Relink missing", function () {
              var missing = __missingFootage();
              for (var m = 0; m < missing.length; m++) {
                var mi = __itemById(missing[m].id); var base = missing[m].file ? decodeURI(new File(missing[m].file).name).toLowerCase() : (missing[m].name || "").toLowerCase();
                var found = index[base];
                if (found) { try { mi.replace(found); relinked.push({ id: mi.id, name: mi.name, file: found.fsName }); } catch (e1) { still.push({ id: mi.id, name: mi.name, error: String(e1) }); } }
                else still.push({ id: mi.id, name: mi.name, lookedFor: base });
              }
            });
            return __result({ relinked: relinked, stillMissing: still });
          }
          if (a.action === "interpret") {
            var fi = findItem(a.item); if (!(fi instanceof FootageItem) || !(fi.mainSource instanceof FileSource)) return __error("Item is not file footage", "BAD_ARG");
            var o = a.interpret || {};
            return __result(__mutate("Interpret footage", function () {
              var ms = fi.mainSource;
              if (o.conformFrameRate !== undefined) ms.conformFrameRate = o.conformFrameRate;
              if (o.alphaMode) ms.alphaMode = o.alphaMode === "ignore" ? AlphaMode.IGNORE : o.alphaMode === "straight" ? AlphaMode.STRAIGHT : AlphaMode.PREMULTIPLIED;
              if (o.premulColor) ms.premulColor = __color(o.premulColor);
              if (o.loop !== undefined) ms.loop = o.loop;
              if (o.invertAlpha !== undefined) ms.invertAlpha = o.invertAlpha;
              return __itemInfo(fi);
            }));
          }
          if (a.action === "create_folder") { if (!a.name) return __error("name is required", "BAD_ARG"); return __result(__mutate("Create folder", function () { var nf2 = p.items.addFolder(a.name); if (a.folder) nf2.parentFolder = findFolder(a.folder, true); return __itemInfo(nf2); })); }
          if (a.action === "move") { var mv = findItem(a.item); return __result(__mutate("Move item", function () { mv.parentFolder = findFolder(a.folder, true); return __itemInfo(mv); })); }
          if (a.action === "rename") { var rn = findItem(a.item); if (!a.name) return __error("name is required", "BAD_ARG"); return __result(__mutate("Rename item", function () { rn.name = a.name; return __itemInfo(rn); })); }
          if (a.action === "delete") { var del = findItem(a.item); var snap = __itemInfo(del); __mutate("Delete item", function () { del.remove(); }); return __result({ deleted: snap, remainingItems: p.numItems }); }
          return __error("Unknown action " + a.action, "BAD_ARG");
        `;
        return runScript(ctx, script, { timeoutMs: 120_000, longRunning: true });
      }),
    },
  };
}
