/**
 * Headless fallback: same file protocol, but the executor is an ExtendScript
 * poller installed into the running After Effects via `AfterFX.com -r ensure-poller.jsx`
 * on Windows or AppleScript `DoScriptFile` on macOS (both execute inside the
 * already-running instance). Requires the AE
 * preference "Allow Scripts to Write Files and Access Network" because the poller
 * writes res_ files from ExtendScript.
 */
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { AeMcpConfig } from "../config.js";
import { debugLog } from "../config.js";
import { FileTransport } from "./file-transport.js";
import { ensureDir, parseTargetMajor, resolveTarget, versionDir } from "./bridge-dir.js";
import { PRESENCE_FRESH_MS } from "./protocol.js";

const here = dirname(fileURLToPath(import.meta.url));

export interface AeInstall {
  year: number;
  major: number;
  root: string;
  /** Windows: AfterFX.exe. macOS: the "Adobe After Effects 20xx.app" bundle. */
  afterfxExe: string;
  /** Windows console shim (AfterFX.com). Does not exist on macOS. */
  afterfxCom?: string;
  aerender: string;
}

/**
 * Enumerate After Effects installs, newest first.
 * Windows: C:\Program Files\Adobe\Adobe After Effects 20xx\Support Files.
 * macOS:   /Applications/Adobe After Effects 20xx (aerender sits next to the .app).
 */
export function findAeInstalls(): AeInstall[] {
  if (process.platform === "darwin") return findMacInstalls("/Applications");
  if (process.platform !== "win32") return [];
  const base = "C:\\Program Files\\Adobe";
  if (!existsSync(base)) return [];
  const out: AeInstall[] = [];
  for (const name of readdirSync(base)) {
    const m = /^Adobe After Effects (\d{4})$/.exec(name);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const root = join(base, name, "Support Files");
    const afterfxExe = join(root, "AfterFX.exe");
    if (!existsSync(afterfxExe)) continue;
    out.push({
      year,
      major: year - 2000,
      root,
      afterfxExe,
      afterfxCom: join(root, "AfterFX.com"),
      aerender: join(root, "aerender.exe"),
    });
  }
  return out.sort((a, b) => b.year - a.year);
}

export function findMacInstalls(base: string): AeInstall[] {
  if (!existsSync(base)) return [];
  const out: AeInstall[] = [];
  for (const name of readdirSync(base)) {
    const m = /^Adobe After Effects (\d{4})$/.exec(name);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const root = join(base, name);
    const afterfxExe = join(root, `${name}.app`);
    if (!existsSync(afterfxExe)) continue;
    out.push({ year, major: year - 2000, root, afterfxExe, aerender: join(root, "aerender") });
  }
  return out.sort((a, b) => b.year - a.year);
}

/**
 * Run an ExtendScript file inside the already-running After Effects.
 * Windows: `AfterFX.com -r <file>`. macOS: AppleScript `DoScriptFile`, which is the
 * documented equivalent (there is no -r flag on the Mac binary).
 */
export function runScriptInRunningAe(install: AeInstall, script: string, env: NodeJS.ProcessEnv = process.env): void {
  let child;
  if (process.platform === "darwin") {
    const app = basename(install.afterfxExe, ".app");
    const posix = script.replace(/\\/g, "/").replace(/"/g, '\\"');
    child = spawn("osascript", ["-e", `tell application "${app}" to DoScriptFile "${posix}"`], { detached: true, stdio: "ignore", env });
  } else {
    const exe = install.afterfxCom && existsSync(install.afterfxCom) ? install.afterfxCom : install.afterfxExe;
    child = spawn(exe, ["-r", script], { detached: true, stdio: "ignore", windowsHide: true, env });
  }
  child.unref();
}

export function locatePollerScript(): string {
  const candidates = [resolve(here, "../jsx/ensure-poller.jsx"), resolve(here, "../../src/jsx/ensure-poller.jsx")];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("ensure-poller.jsx not found; run npm run build");
}

export class PollerTransport extends FileTransport {
  private lastSpawnAt = 0;

  constructor(config: AeMcpConfig) {
    super(config, "poller");
  }

  private pickInstall(): AeInstall | undefined {
    const installs = findAeInstalls();
    const major = parseTargetMajor(this.config.target);
    if (major !== null) return installs.find((i) => i.major === major);
    return installs[0];
  }

  /**
   * If no poller presence is fresh in the target dir, ask the running AE to
   * install one. The launcher returns quickly; the poller then heartbeats within
   * ~1 s. We wait up to 8 s for the presence file.
   */
  override async ensureReady(): Promise<void> {
    const target = resolveTarget(this.config.bridgeRoot, this.config.target);
    if (target.listeners.some((l) => l.source === "poller")) return;
    if (Date.now() - this.lastSpawnAt < PRESENCE_FRESH_MS) return;

    const install = this.pickInstall();
    if (!install) {
      debugLog("poller: no After Effects installation found");
      return;
    }
    const dir = versionDir(this.config.bridgeRoot, install.major);
    ensureDir(dir);
    const script = locatePollerScript();
    this.lastSpawnAt = Date.now();
    debugLog(`poller: running ${script} inside After Effects ${install.year}`);
    try {
      runScriptInRunningAe(install, script, { ...process.env, AE_MCP_BRIDGE_DIR: dir });
    } catch (e) {
      debugLog(`poller spawn failed: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250));
      const t = resolveTarget(this.config.bridgeRoot, this.config.target);
      if (t.listeners.some((l) => l.source === "poller")) return;
    }
  }
}
