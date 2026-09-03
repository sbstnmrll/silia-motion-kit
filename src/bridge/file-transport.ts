/**
 * File-based transport to the CEP executor. Adapted from premiere-pro-mcp (MIT):
 * staged write + rename, fs.watch with a timer fallback, busy-heartbeat aware
 * timeouts, and cleanup. Additions: per-version dirs, presence-based NO_LISTENER,
 * error codes, single-flight queue, orphan cleanup, random id suffix so two
 * server processes can share a directory.
 */
import { existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import type { AeMcpConfig } from "../config.js";
import { debugLog } from "../config.js";
import { ensureDir, resolveTarget } from "./bridge-dir.js";
import { ensureHelpers, getHelpers } from "./helpers-loader.js";
import { validateScript } from "./script-builder.js";
import { BUSY_FRESH_MS, FILE, fail, isBridgeResult, type BridgeResult } from "./protocol.js";
import type { BridgeStatus, SendOptions, Transport } from "./transport.js";

const POLL_FALLBACK_MS = 250;
const ORPHAN_MAX_AGE_MS = 10 * 60_000;

let commandCounter = 0;

function safeUnlink(p: string): void {
  try {
    if (existsSync(p)) unlinkSync(p);
  } catch {
    // ignore
  }
}

export class FileTransport implements Transport {
  readonly kind: "cep" | "poller";
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    protected readonly config: AeMcpConfig,
    kind: "cep" | "poller" = "cep",
  ) {
    this.kind = kind;
  }

  /** Resolve the directory for this call (target may become live between calls). */
  protected resolveDir(): ReturnType<typeof resolveTarget> {
    return resolveTarget(this.config.bridgeRoot, this.config.target);
  }

  async ensureReady(): Promise<void> {
    // The CEP executor starts with After Effects; nothing to do here.
  }

  async status(): Promise<BridgeStatus> {
    const t = this.resolveDir();
    let pendingCommands = 0;
    let pendingBusy = 0;
    if (existsSync(t.dir)) {
      for (const f of readdirSync(t.dir)) {
        if (f.startsWith("cmd_")) pendingCommands++;
        else if (f.startsWith("busy_")) pendingBusy++;
      }
    }
    return {
      transport: this.kind,
      dir: t.dir,
      major: t.major,
      listeners: t.listeners,
      allListeners: t.allListeners,
      pendingCommands,
      pendingBusy,
      helpersVersion: getHelpers().version,
    };
  }

  /** Commands are serialized per server process: one engine, one script at a time. */
  send(script: string, options: SendOptions = {}): Promise<BridgeResult> {
    const run = this.queue.then(() => this.sendNow(script, options));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async sendNow(script: string, options: SendOptions): Promise<BridgeResult> {
    try {
      validateScript(script, options.unsafe === true);
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e), "BLOCKED_SCRIPT");
    }

    await this.ensureReady();
    const target = this.resolveDir();
    ensureDir(target.dir);

    if (target.listeners.length === 0) {
      const seen = target.allListeners.map((l) => `${l.source}@v${l.appVersion} (${l.dir})`);
      return fail(
        `No After Effects bridge is listening in ${target.dir}. ` +
          (seen.length
            ? `Live listeners elsewhere: ${seen.join(", ")}. Set AE_MCP_TARGET accordingly.`
            : `Open After Effects${target.major ? ` ${2000 + target.major}` : ""} (the Silia AE MCP extension auto-starts), or run ae-mcp --install-cep.`),
        "NO_LISTENER",
      );
    }

    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
    const id = `${Date.now()}_${++commandCounter}_${randomBytes(2).toString("hex")}`;
    const cmdFile = join(target.dir, FILE.cmd(id));
    const staged = `${cmdFile}.staged`;
    const resFile = join(target.dir, FILE.res(id));
    const busyFile = join(target.dir, FILE.busy(id));

    try {
      const bootstrap = ensureHelpers(target.dir);
      // BOM so ExtendScript decodes UTF-8 (Spanish text in layers).
      writeFileSync(staged, `﻿${bootstrap}\n${script}`, "utf-8");
      renameSync(staged, cmdFile);
      debugLog(`sent ${basename(cmdFile)} (${script.length} chars)`);
      return await this.waitForResponse(resFile, busyFile, timeoutMs, options.longRunning === true);
    } finally {
      safeUnlink(staged);
      safeUnlink(cmdFile);
      safeUnlink(resFile);
      safeUnlink(busyFile);
      this.cleanupOrphans(target.dir);
    }
  }

  private waitForResponse(resFile: string, busyFile: string, timeoutMs: number, longRunning: boolean): Promise<BridgeResult> {
    const start = Date.now();
    const hardCapMs = Math.max(timeoutMs * 4, 120_000);
    let sawBusy = false;
    let lastParseError: string | undefined;

    const busyIsFresh = (): boolean => {
      try {
        if (!existsSync(busyFile)) return false;
        sawBusy = true;
        return Date.now() - statSync(busyFile).mtimeMs < BUSY_FRESH_MS;
      } catch {
        return false;
      }
    };

    return new Promise((resolve) => {
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      let watcher: FSWatcher | undefined;
      let fallbackDelay = 60;

      const finish = (result: BridgeResult) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        watcher?.close();
        resolve(result);
      };

      const scheduleFallback = () => {
        if (settled) return;
        timer = setTimeout(check, fallbackDelay);
        fallbackDelay = POLL_FALLBACK_MS;
      };

      const check = () => {
        if (settled) return;
        if (existsSync(resFile)) {
          try {
            const raw = readFileSync(resFile, "utf-8").replace(/^﻿/, "");
            const parsed = JSON.parse(raw) as unknown;
            if (isBridgeResult(parsed)) {
              finish(parsed);
              return;
            }
            lastParseError = "Response is missing the boolean success field";
          } catch (e) {
            // Observed mid-write by an older executor; keep polling, never resend.
            lastParseError = `Failed to parse response: ${e instanceof Error ? e.message : String(e)}`;
          }
        }

        const elapsed = Date.now() - start;
        if (elapsed >= timeoutMs) {
          const stillBusy = busyIsFresh();
          if (stillBusy && longRunning && elapsed <= hardCapMs) {
            scheduleFallback();
            return;
          }
          if (lastParseError) {
            finish(fail(lastParseError, "PARSE"));
            return;
          }
          if (stillBusy || sawBusy) {
            finish(
              fail(
                `After Effects accepted the script but did not finish within ${elapsed} ms. ` +
                  `A dialog inside After Effects is probably blocking the scripting engine: check the AE window and dismiss it. ` +
                  `For genuinely long operations pass a larger timeout_ms (the result of this call is discarded).`,
                "ENGINE_BUSY",
              ),
            );
            return;
          }
          finish(
            fail(
              `Command timed out after ${timeoutMs} ms with no response. The bridge was listening when the command was sent; ` +
                `if this repeats, close and reopen the Silia AE MCP panel in After Effects.`,
              "TIMEOUT",
            ),
          );
          return;
        }
        scheduleFallback();
      };

      try {
        const responseName = basename(resFile);
        watcher = watch(dirname(resFile), { persistent: false }, (_event, filename) => {
          if (!filename || filename.toString() === responseName) check();
        });
        watcher.on("error", () => {
          watcher?.close();
          watcher = undefined;
        });
      } catch {
        watcher = undefined;
      }
      check();
    });
  }

  /** Remove stale cmd_/res_/busy_ files older than 10 minutes (other processes' leftovers). */
  private cleanupOrphans(dir: string): void {
    try {
      const now = Date.now();
      for (const f of readdirSync(dir)) {
        if (!/^(cmd_|res_|busy_)/.test(f)) continue;
        const p = join(dir, f);
        try {
          if (now - statSync(p).mtimeMs > ORPHAN_MAX_AGE_MS) unlinkSync(p);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }
}

/** Startup sweep: remove every stale protocol file in every version dir. */
export function cleanupBridgeRoot(root: string): void {
  if (!existsSync(root)) return;
  try {
    for (const v of readdirSync(root)) {
      const dir = join(root, v);
      if (!/^v\d+$/.test(v) || !statSync(dir).isDirectory()) continue;
      const now = Date.now();
      for (const f of readdirSync(dir)) {
        if (!/^(cmd_|res_|busy_)/.test(f)) continue;
        const p = join(dir, f);
        try {
          // Only sweep files nobody could still be waiting on.
          if (now - statSync(p).mtimeMs > 60_000) unlinkSync(p);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}
