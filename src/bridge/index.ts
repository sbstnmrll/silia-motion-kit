import type { AeMcpConfig } from "../config.js";
import { FileTransport } from "./file-transport.js";
import { PollerTransport } from "./poller-transport.js";
import type { Transport } from "./transport.js";
import { resolveTarget } from "./bridge-dir.js";

export * from "./protocol.js";
export * from "./transport.js";
export { FileTransport, cleanupBridgeRoot } from "./file-transport.js";
export { PollerTransport } from "./poller-transport.js";
export { buildScript, escapeForExtendScript, jsLiteral, argsVar } from "./script-builder.js";

/**
 * auto: use the CEP transport when a CEP listener is live (or nothing is live
 * yet, since the CEP extension starts with AE); fall back to the poller only
 * when the only live listener is a poller.
 */
export function createTransport(config: AeMcpConfig): Transport {
  if (config.transport === "cep") return new FileTransport(config, "cep");
  if (config.transport === "poller") return new PollerTransport(config);
  const target = resolveTarget(config.bridgeRoot, config.target);
  const hasCep = target.listeners.some((l) => String(l.source).startsWith("cep"));
  const hasPoller = target.listeners.some((l) => l.source === "poller");
  if (!hasCep && hasPoller) return new PollerTransport(config);
  return new FileTransport(config, "cep");
}
