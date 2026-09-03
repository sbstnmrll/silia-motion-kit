/**
 * All AE_MCP_* environment parsing lives here so tools and transports never read
 * process.env directly.
 */
import { join } from "node:path";
import { tmpdir } from "node:os";

export type TransportKind = "cep" | "poller" | "auto";

export interface AeMcpConfig {
  /** Root of the bridge directory; per-version subdirs live below it. */
  bridgeRoot: string;
  /** "auto" picks the freshest live listener; otherwise "2026", "26", "26.3". */
  target: string;
  transport: TransportKind;
  timeoutMs: number;
  allowRawScript: boolean;
  debug: boolean;
  /** Where render jobs, checkpoints, the tool library and scratch files live. */
  dataDir: string;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

function flag(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value ?? "");
}

export function getDefaultBridgeRoot(): string {
  return join(tmpdir(), "ae-mcp-bridge");
}

export function getDefaultDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.USERPROFILE || env.HOME || tmpdir();
  return join(home, ".ae-mcp");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AeMcpConfig {
  const transportRaw = (env.AE_MCP_TRANSPORT ?? "auto").toLowerCase();
  if (transportRaw !== "cep" && transportRaw !== "poller" && transportRaw !== "auto") {
    throw new Error(`AE_MCP_TRANSPORT must be cep, poller or auto (got "${env.AE_MCP_TRANSPORT}")`);
  }
  const timeout = env.AE_MCP_TIMEOUT_MS ? parseInt(env.AE_MCP_TIMEOUT_MS, 10) : DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error(`AE_MCP_TIMEOUT_MS must be a positive integer (got "${env.AE_MCP_TIMEOUT_MS}")`);
  }
  return {
    bridgeRoot: env.AE_MCP_TEMP_DIR?.trim() || getDefaultBridgeRoot(),
    target: (env.AE_MCP_TARGET ?? "auto").trim() || "auto",
    transport: transportRaw,
    timeoutMs: timeout,
    allowRawScript: flag(env.AE_MCP_ALLOW_RAW),
    debug: flag(env.AE_MCP_DEBUG),
    dataDir: env.AE_MCP_DATA_DIR?.trim() || getDefaultDataDir(env),
  };
}

let debugEnabled = flag(process.env.AE_MCP_DEBUG);

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

/** stderr only: stdout is the MCP stdio channel. */
export function debugLog(message: string): void {
  if (debugEnabled) console.error(`[ae-mcp] ${message}`);
}
