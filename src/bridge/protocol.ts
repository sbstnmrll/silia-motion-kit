/**
 * File protocol shared by the MCP server and every executor (CEP panel, CEP
 * headless extension, or the AfterFX -r poller). Everything is a file in the
 * per-AE-version bridge directory:
 *
 *   cmd_<id>.jsx                       request, written by the server (staged then renamed)
 *   cmd_<id>.jsx.<ENGINE>.claimed.jsx  claimed by the executor that won the rename
 *   busy_<id>.json                     heartbeat while the script is in flight
 *   res_<id>.json                      response envelope
 *   presence_<ENGINE>.json             executor liveness, refreshed every 5 s
 *   helpers_<hash>.jsx                 versioned helper library loaded once per engine
 *   panel.log                          executor log
 */

export const PROTOCOL_VERSION = 1;
export const PRESENCE_FRESH_MS = 15_000;
export const BUSY_FRESH_MS = 6_000;

export type BridgeErrorCode =
  | "TIMEOUT"
  | "ENGINE_BUSY"
  | "NO_LISTENER"
  | "SCRIPT_ERROR"
  | "EMPTY_RESULT"
  | "PARSE"
  | "BLOCKED_SCRIPT"
  | "NOT_IMPLEMENTED";

export interface BridgeSuccess {
  success: true;
  data: unknown;
}

export interface BridgeFailure {
  success: false;
  error: string;
  code?: BridgeErrorCode | string;
  line?: number;
  file?: string;
}

export type BridgeResult = BridgeSuccess | BridgeFailure;

export interface Presence {
  protocolVersion: number;
  engine: string;
  source: "cep-panel" | "cep-headless" | "poller" | string;
  appVersion: string;
  state: "running" | "stopped" | string;
  inFlight?: number;
  commands?: number;
  updatedAt?: string;
  /** Filled by the server when scanning: file mtime age. */
  ageMs?: number;
  dir?: string;
}

export const FILE = {
  cmd: (id: string) => `cmd_${id}.jsx`,
  res: (id: string) => `res_${id}.json`,
  busy: (id: string) => `busy_${id}.json`,
  presencePrefix: "presence_",
  helpersPrefix: "helpers_",
  log: "panel.log",
} as const;

export function isBridgeResult(value: unknown): value is BridgeResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

export function fail(error: string, code?: BridgeErrorCode | string): BridgeFailure {
  return code ? { success: false, error, code } : { success: false, error };
}
