import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { AeMcpConfig } from "../config.js";
import { findAeInstalls } from "../bridge/poller-transport.js";
import { listVersionDirs, readPresences } from "../bridge/bridge-dir.js";
import { cepBundleDir, cepLogDirs, isMac } from "../host/platform.js";

export interface DoctorReport {
  version: string;
  platform: string;
  node: string;
  config: Pick<AeMcpConfig, "bridgeRoot" | "target" | "transport" | "timeoutMs" | "allowRawScript" | "dataDir">;
  aeInstalls: Array<{ year: number; root: string; aerender: boolean }>;
  cep: { bundleInstalled: boolean; bundlePath: string; playerDebugMode: Record<string, string | null>; lastLog: string | null; signatureFailures: string[] };
  bridge: Array<{ dir: string; listeners: Array<{ source: string; appVersion: string; ageMs: number | null; state: string }>; pending: number }>;
  tools: { ffmpeg: boolean; ffprobe: boolean };
  problems: string[];
}

function regString(key: string, name: string): string | null {
  try {
    const out = execFileSync("reg", ["query", key, "/v", name], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    const m = new RegExp(`${name}\\s+(REG_\\w+)\\s+(.*)`).exec(out);
    return m ? `${m[1]}:${m[2].trim()}` : null;
  } catch {
    return null;
  }
}

/** macOS: `defaults read com.adobe.CSXS.<v> PlayerDebugMode`, typed like regString ("string:1"). */
function defaultsString(domain: string, name: string): string | null {
  try {
    const type = execFileSync("defaults", ["read-type", domain, name], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    const value = execFileSync("defaults", ["read", domain, name], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    const t = /Type is (\w+)/.exec(type)?.[1] ?? "unknown";
    return `${t}:${value.trim()}`;
  } catch {
    return null;
  }
}

function which(cmd: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function collectLocalDoctor(config: AeMcpConfig, version = "unknown"): DoctorReport {
  const problems: string[] = [];
  const installs = findAeInstalls().map((i) => ({ year: i.year, root: i.root, aerender: existsSync(i.aerender) }));
  if (installs.length === 0) problems.push(`No After Effects installation found under ${isMac ? "/Applications" : "C:\\Program Files\\Adobe"}.`);

  const bundlePath = cepBundleDir();
  const bundleInstalled = existsSync(join(bundlePath, "CSXS", "manifest.xml"));
  if (!bundleInstalled) problems.push("CEP bundle not installed. Run: ae-mcp --install-cep");

  const playerDebugMode: Record<string, string | null> = {};
  for (const v of [11, 12, 13, 14]) {
    if (isMac) {
      const val = defaultsString(`com.adobe.CSXS.${v}`, "PlayerDebugMode");
      playerDebugMode[`CSXS.${v}`] = val;
      if (v === 12 && val !== "string:1") problems.push("com.adobe.CSXS.12 PlayerDebugMode must be the string \"1\" (defaults write com.adobe.CSXS.12 PlayerDebugMode -string 1).");
    } else {
      const val = regString(`HKCU\\Software\\Adobe\\CSXS.${v}`, "PlayerDebugMode");
      playerDebugMode[`CSXS.${v}`] = val;
      if (v === 12 && val !== "REG_SZ:1") problems.push("HKCU\\Software\\Adobe\\CSXS.12 PlayerDebugMode must be REG_SZ \"1\" for the CEP bridge to load.");
    }
  }

  let lastLog: string | null = null;
  const signatureFailures: string[] = [];
  try {
    const logs = cepLogDirs()
      .filter((d) => existsSync(d))
      .flatMap((d) => readdirSync(d).filter((f) => /^CEP\d+-AEFT\.log$/.test(f)).map((f) => join(d, f)))
      .map((f) => ({ f, m: statSync(f).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    if (logs.length) {
      lastLog = logs[0].f;
      const text = readFileSync(lastLog, "utf-8");
      for (const line of text.split(/\r?\n/)) if (/Signature verification failed.*com\.silia\.ae\.mcp/.test(line)) signatureFailures.push(line);
    }
  } catch {
    // ignore
  }
  if (signatureFailures.length) problems.push("After Effects rejected the bundle signature; with AE closed run ae-mcp --sign-cep then --install-cep. Note this reads the historical CEP log, so it still reports a failure that is already fixed until the log rolls over.");

  const bridge = listVersionDirs(config.bridgeRoot).map((d) => {
    const listeners = readPresences(d.dir).map((p) => ({ source: String(p.source), appVersion: String(p.appVersion), ageMs: p.ageMs ?? null, state: String(p.state) }));
    let pending = 0;
    try {
      pending = readdirSync(d.dir).filter((f) => f.startsWith("cmd_")).length;
    } catch {
      // ignore
    }
    return { dir: d.dir, listeners, pending };
  });

  const tools = { ffmpeg: which("ffmpeg"), ffprobe: which("ffprobe") };
  if (!tools.ffprobe) problems.push("ffprobe not on PATH; ae_render verify and ae_audio analysis will be unavailable.");

  return {
    version,
    platform: `${process.platform} ${process.arch}`,
    node: process.version,
    config: { bridgeRoot: config.bridgeRoot, target: config.target, transport: config.transport, timeoutMs: config.timeoutMs, allowRawScript: config.allowRawScript, dataDir: config.dataDir },
    aeInstalls: installs,
    cep: { bundleInstalled, bundlePath, playerDebugMode, lastLog, signatureFailures },
    bridge,
    tools,
    problems,
  };
}

export function renderDoctorHuman(r: DoctorReport): string {
  const lines: string[] = [];
  lines.push(`ae-mcp doctor (${r.platform}, node ${r.node})`);
  lines.push(`bridge root: ${r.config.bridgeRoot}  target: ${r.config.target}  transport: ${r.config.transport}`);
  lines.push(`After Effects: ${r.aeInstalls.map((i) => `${i.year}${i.aerender ? "" : " (no aerender)"}`).join(", ") || "none"}`);
  lines.push(`CEP bundle: ${r.cep.bundleInstalled ? "installed" : "MISSING"} at ${r.cep.bundlePath}`);
  lines.push(`PlayerDebugMode: ${Object.entries(r.cep.playerDebugMode).map(([k, v]) => `${k}=${v ?? "unset"}`).join("  ")}`);
  for (const b of r.bridge) {
    const live = b.listeners.filter((l) => (l.ageMs ?? Infinity) < 15000 && l.state === "running");
    lines.push(`${b.dir}: ${live.length} live listener(s) ${live.map((l) => `${l.source}@${l.appVersion}`).join(", ")}${b.pending ? `, ${b.pending} pending cmd` : ""}`);
  }
  lines.push(`ffmpeg: ${r.tools.ffmpeg ? "ok" : "missing"}  ffprobe: ${r.tools.ffprobe ? "ok" : "missing"}`);
  if (r.problems.length) {
    lines.push("");
    lines.push("Problems:");
    for (const p of r.problems) lines.push(`  - ${p}`);
  } else {
    lines.push("");
    lines.push("No problems found.");
  }
  return lines.join("\n");
}
