import type { BridgeResult, Presence } from "./protocol.js";

export interface SendOptions {
  timeoutMs?: number;
  /** Skip the blocked-pattern check (raw scripts authored by the model). */
  unsafe?: boolean;
  /** Keep waiting up to the hard cap while the engine reports busy. */
  longRunning?: boolean;
}

export interface BridgeStatus {
  transport: "cep" | "poller";
  dir: string;
  major: number | null;
  listeners: Presence[];
  allListeners: Presence[];
  pendingCommands: number;
  pendingBusy: number;
  helpersVersion: string;
}

export interface Transport {
  readonly kind: "cep" | "poller";
  /** Run an already-wrapped script (see buildScript) in After Effects. */
  send(script: string, options?: SendOptions): Promise<BridgeResult>;
  status(): Promise<BridgeStatus>;
  /** cep: no-op. poller: spawn AfterFX -r if no fresh listener exists. */
  ensureReady(): Promise<void>;
}
