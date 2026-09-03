import { z } from "zod";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { argsVar } from "../bridge/index.js";
import { findAeInstalls } from "../bridge/poller-transport.js";
import { CAPABILITIES } from "../security/index.js";
import { runScript, ok, safe, type ToolContext, type ToolRecord } from "./types.js";

function which(cmd: string): string | null {
  try {
    const out = execFileSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    const first = out.split(/\r?\n/).find((l) => l.trim());
    return first ? first.trim() : null;
  } catch {
    return null;
  }
}

export function getHealthTools(ctx: ToolContext): ToolRecord {
  return {
    ae_status: {
      description:
        "Health check and orientation. Always call this first. Reports whether the After Effects bridge is live (which AE version, which transport), the open project summary (path, dirty, comps, missing footage), the active comp, the enabled authority profile, and with deep=true also the render/output templates, fonts of interest, aerender/ffmpeg availability and CEP install state.",
      parameters: {
        deep: z.boolean().optional().describe("Also probe render templates, fonts (ES Klarheit Grotesk), saveFrameToPng, aerender and ffmpeg. Slower (~1 s)."),
      },
      handler: safe(async (args: { deep?: boolean }) => {
        const status = await ctx.transport.status();
        const base = {
          server: { version: SERVER_VERSION_PLACEHOLDER(), transport: status.transport, bridgeDir: status.dir, targetMajor: status.major, helpersVersion: status.helpersVersion },
          listeners: status.listeners.map((l) => ({ source: l.source, engine: l.engine, appVersion: l.appVersion, ageMs: l.ageMs })),
          otherListeners: status.allListeners.filter((l) => l.dir !== status.dir).map((l) => ({ source: l.source, appVersion: l.appVersion, dir: l.dir })),
          pending: { commands: status.pendingCommands, busy: status.pendingBusy },
          authority: { capabilities: [...ctx.capabilities.capabilities].sort(), all: CAPABILITIES, rawScriptEnabled: ctx.config.allowRawScript },
        };
        if (status.listeners.length === 0) {
          return ok({ ...base, connected: false, hint: "No live After Effects bridge. Open After Effects (the Silia AE MCP extension auto-starts) or run `ae-mcp --install-cep`." });
        }
        const deep = args.deep === true;
        const script = `
          ${argsVar("a", { deep })}
          var info = { connected: true, aeVersion: app.version, locale: $.locale, isoLanguage: app.isoLanguage };
          try { info.project = __projectInfo(); } catch (e0) { info.project = null; info.projectError = String(e0); }
          try { info.activeComp = (app.project && app.project.activeItem instanceof CompItem) ? __compInfo(app.project.activeItem) : null; } catch (e1) { info.activeComp = null; }
          if (a.deep) {
            info.deep = {};
            try {
              var rq = app.project.renderQueue; var probe = null; var tmp = null;
              if (info.activeComp) probe = app.project.activeItem; else { for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) { probe = app.project.item(i); break; } }
              if (!probe) { tmp = app.project.items.addComp("__aemcp_probe", 16, 16, 1, 1, 30); probe = tmp; }
              var rqi = rq.items.add(probe);
              try { info.deep.renderSettingsTemplates = rqi.templates; info.deep.outputModuleTemplates = rqi.outputModule(1).templates; } finally { rqi.remove(); }
              try { info.deep.saveFrameToPng = typeof probe.saveFrameToPng === "function"; } catch (e2b) { info.deep.saveFrameToPng = false; }
              if (tmp) tmp.remove();
            } catch (e2) { info.deep.templatesError = String(e2); }
            try {
              info.deep.fonts = {};
              if (app.fonts && app.fonts.allFonts) {
                var fams = app.fonts.allFonts; var found = [];
                for (var f = 0; f < fams.length; f++) { for (var s = 0; s < fams[f].length; s++) { var ps = fams[f][s].postScriptName; if (/Klarheit|Monument/i.test(ps)) found.push(ps); } }
                info.deep.fonts.silia = found; info.deep.fonts.families = fams.length;
              } else { info.deep.fonts.note = "app.fonts unavailable (AE < 24)"; }
            } catch (e3) { info.deep.fontsError = String(e3); }
            try { info.deep.missingFootage = __missingFootage(); } catch (e4) {}
            try { info.deep.scriptingFileAccess = app.preferences.getPrefAsLong("Main Pref Section v2", "Pref_SCRIPTING_FILE_NETWORK_SECURITY") === 1; } catch (e5) { info.deep.scriptingFileAccess = null; }
            try { info.deep.effectsInstalled = app.effects.length; } catch (e6) {}
            info.deep.renderQueueItems = app.project.renderQueue.numItems;
          }
          return __result(info);
        `;
        const r = await runScript(ctx, script, { timeoutMs: deep ? 20_000 : 8_000 });
        if (!r.success) return { ...r, ...({ server: base.server } as object) } as typeof r;
        const data = r.data as Record<string, unknown>;
        if (deep) {
          const installs = findAeInstalls();
          const cepDir = join(process.env.APPDATA ?? "", "Adobe", "CEP", "extensions", "AeMcpCEP");
          (data.deep as Record<string, unknown>).host = {
            aeInstalls: installs.map((i) => ({ year: i.year, aerender: existsSync(i.aerender) })),
            ffmpeg: which("ffmpeg"),
            ffprobe: which("ffprobe"),
            cepBundleInstalled: existsSync(join(cepDir, "CSXS", "manifest.xml")),
            dataDir: ctx.config.dataDir,
          };
        }
        return ok({ ...base, ...data });
      }),
    },
  };
}

// Filled at module init by server.ts to avoid a circular import.
let serverVersion = "unknown";
export function setServerVersion(v: string): void {
  serverVersion = v;
}
function SERVER_VERSION_PLACEHOLDER(): string {
  return serverVersion;
}
