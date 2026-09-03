#!/usr/bin/env node
/**
 * CLI entry: MCP stdio server plus install/diagnose helpers. Flag dispatch adapted
 * from premiere-pro-mcp (MIT).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { loadConfig, debugLog, setDebug } from "./config.js";
import { cleanupBridgeRoot } from "./bridge/index.js";
import { findAeInstalls, locatePollerScript } from "./bridge/poller-transport.js";
import { createServer, SERVER_VERSION } from "./server.js";
import { collectLocalDoctor, renderDoctorHuman } from "./diagnostics/doctor.js";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), "..");
const args = process.argv.slice(2);

function has(flag: string): boolean {
  return args.includes(flag);
}

function valueOf(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function runPowerShell(script: string, extra: string[] = []): void {
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...extra], { stdio: "inherit", cwd: projectRoot });
}

if (has("--help") || has("-h")) {
  console.log(`ae-mcp ${SERVER_VERSION} — MCP server for Adobe After Effects (Silia)

Usage:
  ae-mcp                          Start the MCP server (stdio)
  ae-mcp --install-cep            Install the CEP bridge into %APPDATA%\\Adobe\\CEP\\extensions\\AeMcpCEP (+ PlayerDebugMode)
  ae-mcp --diagnose-cep           Check the CEP install, registry keys and After Effects CEP logs
  ae-mcp --uninstall-cep          Remove the CEP bridge folder (registry untouched)
  ae-mcp --sign-cep               Build artifacts/AeMcpCEP.zxp with ZXPSignCmd (self-signed)
  ae-mcp --install-poller [--ae 2026] [--startup]   Install the headless poller into the running AE (fallback transport)
  ae-mcp --enable-scripting-pref --ae 26.3          Turn on "Allow Scripts to Write Files and Access Network" (AE must be closed)
  ae-mcp --doctor [--json]        Local checks: installs, registry, bridge dirs, listeners
  ae-mcp --print-mcp-config       Print claude mcp add / Claude Desktop snippets
  ae-mcp --version

Environment:
  AE_MCP_TEMP_DIR      Bridge root (default: %TEMP%\\ae-mcp-bridge; per-version v<major> subdirs)
  AE_MCP_TARGET        2026 | 26 | auto (default auto = freshest live listener)
  AE_MCP_TRANSPORT     cep | poller | auto (default auto)
  AE_MCP_TIMEOUT_MS    Default command timeout (30000)
  AE_MCP_ALLOW_RAW     1 to enable ae_execute_extendscript
  AE_MCP_CAPABILITIES  inspect,edit,export,filesystem[,unsafe-script]
  AE_MCP_DATA_DIR      Checkpoints, render jobs, tool library (default ~/.ae-mcp)
  AE_MCP_DEBUG         1 for verbose stderr
`);
  process.exit(0);
}

if (has("--version") || has("-v")) {
  console.log(SERVER_VERSION);
  process.exit(0);
}

if (has("--doctor")) {
  const report = collectLocalDoctor(loadConfig());
  console.log(has("--json") ? JSON.stringify(report, null, 2) : renderDoctorHuman(report));
  process.exit(report.problems.length ? 1 : 0);
}

if (has("--print-mcp-config")) {
  const dist = join(projectRoot, "dist", "index.js");
  const node = process.execPath;
  console.log(`# Claude Code (user scope)\nclaude mcp add ae -s user -e AE_MCP_TARGET=auto -- "${node}" "${dist}"\n`);
  console.log(`# Claude Desktop (%APPDATA%\\Claude\\claude_desktop_config.json)\n${JSON.stringify({ mcpServers: { ae: { command: node, args: [dist], env: { AE_MCP_TARGET: "auto" } } } }, null, 2)}`);
  process.exit(0);
}

const cepActions = ["--install-cep", "--uninstall-cep", "--diagnose-cep", "--sign-cep"].filter(has);
if (cepActions.length > 1) {
  console.error("Use one CEP action at a time.");
  process.exit(1);
}
if (cepActions.length === 1) {
  if (process.platform !== "win32") {
    console.error("CEP install scripts are Windows-only in this version.");
    process.exit(1);
  }
  const action = cepActions[0];
  try {
    if (action === "--install-cep") runPowerShell(join(projectRoot, "scripts", "install-cep.ps1"), has("--unsigned") ? ["-Unsigned"] : []);
    else if (action === "--diagnose-cep") runPowerShell(join(projectRoot, "scripts", "install-cep.ps1"), ["-Diagnose"]);
    else if (action === "--uninstall-cep") runPowerShell(join(projectRoot, "scripts", "uninstall-cep.ps1"));
    else runPowerShell(join(projectRoot, "scripts", "build-signed-cep.ps1"));
  } catch {
    console.error(`${action} failed; see output above.`);
    process.exit(1);
  }
  process.exit(0);
}

if (has("--enable-scripting-pref")) {
  const ver = valueOf("--ae");
  if (!ver) {
    console.error("--enable-scripting-pref requires --ae <version>, e.g. --ae 26.3");
    process.exit(1);
  }
  try {
    runPowerShell(join(projectRoot, "scripts", "enable-scripting-pref.ps1"), ["-Version", ver]);
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

if (has("--install-poller")) {
  const installs = findAeInstalls();
  const wanted = valueOf("--ae");
  const install = wanted ? installs.find((i) => String(i.year) === wanted || String(i.major) === wanted) : installs[0];
  if (!install) {
    console.error(`No After Effects install found${wanted ? ` for ${wanted}` : ""}. Found: ${installs.map((i) => i.year).join(", ") || "none"}`);
    process.exit(1);
  }
  const script = locatePollerScript();
  const cfg = loadConfig();
  if (cfg.bridgeRoot !== join(process.env.TEMP ?? "", "ae-mcp-bridge")) {
    // Pointer file so the poller finds a customised root.
    writeFileSync(join(process.env.TEMP ?? "", "ae-mcp-root.txt"), cfg.bridgeRoot, "utf-8");
  }
  const exe = existsSync(install.afterfxCom) ? install.afterfxCom : install.afterfxExe;
  console.log(`Installing poller into running After Effects ${install.year}: ${exe} -r ${script}`);
  const child = spawn(exe, ["-r", script], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  if (has("--startup")) {
    const prefsRoot = join(process.env.APPDATA ?? "", "Adobe", "After Effects");
    const verDirs = existsSync(prefsRoot) ? readdirSync(prefsRoot).filter((d: string) => d.startsWith(String(install.major))) : [];
    for (const v of verDirs) {
      const startup = join(prefsRoot, v, "Scripts", "Startup");
      mkdirSync(startup, { recursive: true });
      const src = readFileSync(join(dirname(script), "poller-startup.jsx"), "utf-8").replace("__AE_MCP_ENSURE_POLLER_PATH__", script.replace(/\\/g, "/"));
      writeFileSync(join(startup, "ae-mcp-poller.jsx"), src, "utf-8");
      console.log(`Startup bootstrap written: ${join(startup, "ae-mcp-poller.jsx")}`);
    }
  }
  console.log("Done. The poller writes presence_*.json in the bridge dir within ~1 s if the scripting file-access preference is enabled.");
  process.exit(0);
}

async function main(): Promise<void> {
  const config = loadConfig();
  setDebug(config.debug);
  debugLog(`ae-mcp ${SERVER_VERSION} starting; bridge root ${config.bridgeRoot}, target ${config.target}, transport ${config.transport}`);
  cleanupBridgeRoot(config.bridgeRoot);
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  debugLog("connected");
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

main().catch((e) => {
  console.error("[ae-mcp] fatal:", e);
  process.exit(1);
});
