import { z } from "zod";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { argsVar } from "../bridge/index.js";
import { err, ok, runScript, safe, type ToolContext, type ToolRecord } from "./types.js";

interface CheckpointRecord {
  id: string;
  label: string;
  createdAt: string;
  aep: string;
  originalFile: string | null;
  inventory: Inventory;
}

interface Inventory {
  comps: Array<{ name: string; layers: Array<{ name: string; kind: string; effects: string[]; keyCounts: Record<string, number> }> }>;
  numItems: number;
}

const INVENTORY_SCRIPT = `
  function inv() {
    var p = app.project; var comps = [];
    for (var i = 1; i <= p.numItems; i++) {
      var it = p.item(i); if (!(it instanceof CompItem)) continue;
      var layers = [];
      for (var L = 1; L <= it.numLayers; L++) {
        var l = it.layer(L); var fx = []; var keys = {};
        try { var fp = l.property("ADBE Effect Parade"); if (fp) for (var e = 1; e <= fp.numProperties; e++) fx.push(fp.property(e).matchName + ":" + fp.property(e).name); } catch (e0) {}
        try { var tg = l.property("ADBE Transform Group"); for (var t = 1; t <= tg.numProperties; t++) { var tp = tg.property(t); if (tp.numKeys) keys[tp.matchName] = tp.numKeys; } } catch (e1) {}
        layers.push({ name: l.name, kind: __layerKind(l), effects: fx, keyCounts: keys, inPoint: __round(l.inPoint), outPoint: __round(l.outPoint) });
      }
      comps.push({ name: it.name, w: it.width, h: it.height, duration: __round(it.duration), layers: layers });
    }
    return { comps: comps, numItems: p.numItems, file: p.file ? p.file.fsName : null, dirty: p.dirty };
  }
`;

function dir(dataDir: string): string {
  const d = join(dataDir, "checkpoints");
  mkdirSync(d, { recursive: true });
  return d;
}

function load(dataDir: string): CheckpointRecord[] {
  const d = dir(dataDir);
  return readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(d, f), "utf-8")) as CheckpointRecord;
      } catch {
        return null;
      }
    })
    .filter((x): x is CheckpointRecord => !!x && existsSync(x.aep))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function diffInventory(before: Inventory, after: Inventory) {
  const out: Record<string, unknown> = {};
  const bComps = new Map(before.comps.map((c) => [c.name, c]));
  const aComps = new Map(after.comps.map((c) => [c.name, c]));
  out.addedComps = [...aComps.keys()].filter((n) => !bComps.has(n));
  out.removedComps = [...bComps.keys()].filter((n) => !aComps.has(n));
  const changed: Array<Record<string, unknown>> = [];
  for (const [name, bc] of bComps) {
    const ac = aComps.get(name);
    if (!ac) continue;
    const bl = new Map(bc.layers.map((l) => [l.name, l]));
    const al = new Map(ac.layers.map((l) => [l.name, l]));
    const addedLayers = [...al.keys()].filter((n) => !bl.has(n));
    const removedLayers = [...bl.keys()].filter((n) => !al.has(n));
    const changedLayers: string[] = [];
    for (const [ln, b] of bl) {
      const a = al.get(ln);
      if (a && JSON.stringify(a) !== JSON.stringify(b)) changedLayers.push(ln);
    }
    if (addedLayers.length || removedLayers.length || changedLayers.length) changed.push({ comp: name, addedLayers, removedLayers, changedLayers });
  }
  out.changedComps = changed;
  out.itemsDelta = after.numItems - before.numItems;
  return out;
}

export function getCheckpointTools(ctx: ToolContext): ToolRecord {
  return {
    ae_checkpoint: {
      description:
        "Transactional safety for the open project. create: save a full copy of the project (with a label) plus a structural inventory, then continue working on the original. list: checkpoints for this project. revert: close the current project WITHOUT saving and reopen the checkpoint copy (pass overwrite_original=true to also save it back over the original file path). diff: compare the current project structure (comps, layers, effects, keyframe counts) against a checkpoint. delete: remove a checkpoint. Use before risky multi-step edits; ae_undo covers small steps.",
      parameters: {
        action: z.enum(["create", "list", "revert", "diff", "delete"]),
        label: z.string().max(60).optional(),
        id: z.string().optional().describe("Checkpoint id (revert/diff/delete). Default: most recent."),
        overwrite_original: z.boolean().optional().describe("revert: also save the checkpoint back to the original file path."),
        force: z.boolean().optional().describe("revert: discard unsaved changes without asking (required if the project is dirty)."),
      },
      handler: safe(async (a: { action: string; label?: string; id?: string; overwrite_original?: boolean; force?: boolean }) => {
        const dataDir = ctx.config.dataDir;
        if (a.action === "list") return ok({ checkpoints: load(dataDir).map((c) => ({ id: c.id, label: c.label, createdAt: c.createdAt, aep: c.aep, originalFile: c.originalFile, bytes: statSync(c.aep).size })) });
        if (a.action === "delete") {
          const list = load(dataDir);
          const cp = a.id ? list.find((c) => c.id === a.id) : list[0];
          if (!cp) return err("checkpoint not found", "NOT_FOUND");
          rmSync(cp.aep, { force: true });
          rmSync(join(dir(dataDir), `${cp.id}.json`), { force: true });
          return ok({ deleted: cp.id });
        }
        if (a.action === "create") {
          const id = `${Date.now().toString(36)}_${(a.label ?? "cp").replace(/[^\w-]+/g, "_").slice(0, 30)}`;
          const aep = join(dir(dataDir), `${id}.aep`);
          const r = await runScript(ctx, `${argsVar("a", { path: aep })} ${INVENTORY_SCRIPT}
            var p = app.project; var orig = p.file; var before = inv();
            var f = __file(a.path); __ensureFolder(f.parent.fsName); p.save(f);
            if (orig) app.open(orig); else __warn("Project had never been saved; it now points at the checkpoint copy. Save it to a real path soon.");
            return __result({ inventory: before, originalFile: orig ? orig.fsName : null, aep: f.fsName });`, { timeoutMs: 120_000, longRunning: true });
          if (!r.success) return r;
          const d = r.data as { inventory: Inventory; originalFile: string | null; aep: string; warnings?: string[] };
          const rec: CheckpointRecord = { id, label: a.label ?? "checkpoint", createdAt: new Date().toISOString(), aep: d.aep, originalFile: d.originalFile, inventory: d.inventory };
          writeFileSync(join(dir(dataDir), `${id}.json`), JSON.stringify(rec, null, 2), "utf-8");
          return ok({ id, label: rec.label, aep: d.aep, originalFile: d.originalFile, comps: d.inventory.comps.length, warnings: d.warnings });
        }
        const list = load(dataDir);
        const cp = a.id ? list.find((c) => c.id === a.id) : list[0];
        if (!cp) return err("No checkpoint found" + (a.id ? ` with id ${a.id}` : ""), "NOT_FOUND");
        if (a.action === "diff") {
          const r = await runScript(ctx, `${INVENTORY_SCRIPT} return __result(inv());`);
          if (!r.success) return r;
          return ok({ checkpoint: { id: cp.id, label: cp.label, createdAt: cp.createdAt }, diff: diffInventory(cp.inventory, r.data as Inventory) });
        }
        if (a.action === "revert") {
          const r = await runScript(ctx, `${argsVar("a", { aep: cp.aep, original: cp.originalFile, overwrite: a.overwrite_original === true, force: a.force === true })} ${INVENTORY_SCRIPT}
            var p = app.project;
            if (p && p.dirty && !a.force) return __error("Project has unsaved changes; pass force=true to discard them and revert", "DIRTY");
            if (p) p.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            var f = __file(a.aep); if (!f.exists) return __error("Checkpoint file missing: " + f.fsName, "NOT_FOUND");
            app.open(f);
            var restoredTo = f.fsName;
            if (a.overwrite && a.original) { var of = __file(a.original); app.project.save(of); restoredTo = of.fsName; }
            else if (a.original) __warn("Project is now open from the checkpoint copy " + f.fsName + "; pass overwrite_original=true to write it back to " + a.original);
            return __result({ revertedTo: restoredTo, inventory: inv() });`, { timeoutMs: 120_000, longRunning: true });
          if (!r.success) return r;
          const d = r.data as { revertedTo: string; inventory: Inventory; warnings?: string[] };
          return ok({ checkpoint: cp.id, label: cp.label, revertedTo: d.revertedTo, comps: d.inventory.comps.length, warnings: d.warnings });
        }
        return err("Unknown action", "BAD_ARG");
      }),
    },
  };
}

void basename;
