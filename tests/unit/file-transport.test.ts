import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileTransport } from "../../src/bridge/file-transport.js";
import type { AeMcpConfig } from "../../src/config.js";

let root: string;
let dir: string;
let stop = false;
let timer: NodeJS.Timeout | undefined;
const pending = new Set<NodeJS.Timeout>();
function safeWrite(p: string, c: string) { try { writeFileSync(p, c); } catch { /* dir gone after teardown */ } }

function config(overrides: Partial<AeMcpConfig> = {}): AeMcpConfig {
  return { bridgeRoot: root, target: "26", transport: "cep", timeoutMs: 800, allowRawScript: false, debug: false, dataDir: join(root, "data"), ...overrides };
}

function presence(engine = "eng1") {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `presence_${engine}.json`), JSON.stringify({ protocolVersion: 1, engine, source: "cep-headless", appVersion: "26.3", state: "running" }));
}

/** Fake executor: claims cmd files by rename, optionally writes busy, then res. */
function fakeExecutor(behaviour: (script: string) => { response?: string; busyMs?: number; delayMs?: number }) {
  stop = false;
  const tick = () => {
    if (stop) return;
    try {
      for (const f of readdirSync(dir)) {
        if (!f.startsWith("cmd_") || !f.endsWith(".jsx") || f.includes(".claimed.")) continue;
        const cmd = join(dir, f);
        const claimed = `${cmd}.fake.claimed.jsx`;
        try {
          renameSync(cmd, claimed);
        } catch {
          continue;
        }
        const id = f.replace(/^cmd_/, "").replace(/\.jsx$/, "");
        const script = readFileSync(claimed, "utf-8");
        try { rmSync(claimed); } catch { /* ignore */ }
        const b = behaviour(script);
        const write = () => {
          if (b.response !== undefined && !stop) {
            try {
              writeFileSync(join(dir, `res_${id}.json.staged`), b.response);
              renameSync(join(dir, `res_${id}.json.staged`), join(dir, `res_${id}.json`));
            } catch { /* teardown */ }
          }
        };
        if (b.busyMs) {
          const busy = join(dir, `busy_${id}.json`);
          const bt = setInterval(() => safeWrite(busy, JSON.stringify({ id, elapsedMs: 1 })), 100);
          pending.add(bt);
          const done = setTimeout(() => { clearInterval(bt); pending.delete(bt); write(); }, b.busyMs);
          pending.add(done);
        } else pending.add(setTimeout(write, b.delayMs ?? 20));
      }
    } catch {
      // ignore
    }
    timer = setTimeout(tick, 30);
  };
  tick();
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ae-mcp-ft-"));
  dir = join(root, "v26");
});
afterEach(() => {
  stop = true;
  if (timer) clearTimeout(timer);
  for (const t of pending) { clearTimeout(t); clearInterval(t); }
  pending.clear();
  rmSync(root, { recursive: true, force: true });
});

describe("FileTransport", () => {
  it("returns NO_LISTENER when no presence file is fresh", async () => {
    const t = new FileTransport(config());
    const r = await t.send("(function(){ return __result(1); })();");
    expect(r.success).toBe(false);
    expect(r.success === false && r.code).toBe("NO_LISTENER");
  });

  it("writes the bootstrap + script with a BOM and resolves the executor's response", async () => {
    presence();
    let seen = "";
    fakeExecutor((script) => {
      seen = script;
      return { response: JSON.stringify({ success: true, data: { v: 42 } }) };
    });
    const t = new FileTransport(config());
    const r = await t.send("(function(){ return __result({ v: 42 }); })();");
    expect(r).toEqual({ success: true, data: { v: 42 } });
    expect(seen.charCodeAt(0)).toBe(0xfeff);
    expect(seen).toContain("__AE_MCP_HELPERS_V");
    expect(seen).toContain("$.evalFile(new File(");
    expect(existsSync(join(dir, readdirSync(dir).find((f) => f.startsWith("helpers_"))!))).toBe(true);
    // cmd/res files are cleaned up
    expect(readdirSync(dir).filter((f) => /^(cmd_|res_|busy_)/.test(f))).toEqual([]);
  });

  it("reports ENGINE_BUSY when a fresh busy file outlives the timeout", async () => {
    presence();
    fakeExecutor(() => ({ busyMs: 3000, response: JSON.stringify({ success: true, data: null }) }));
    const t = new FileTransport(config({ timeoutMs: 500 }));
    const r = await t.send("(function(){ return __result(null); })();");
    expect(r.success).toBe(false);
    expect(r.success === false && r.code).toBe("ENGINE_BUSY");
  });

  it("keeps waiting for long-running commands while busy is fresh", async () => {
    presence();
    fakeExecutor(() => ({ busyMs: 1200, response: JSON.stringify({ success: true, data: "late" }) }));
    const t = new FileTransport(config({ timeoutMs: 400 }));
    const r = await t.send("(function(){ return __result('late'); })();", { longRunning: true });
    expect(r).toEqual({ success: true, data: "late" });
  });

  it("times out with TIMEOUT when the executor never answers", async () => {
    presence();
    fakeExecutor(() => ({}));
    const t = new FileTransport(config({ timeoutMs: 300 }));
    const r = await t.send("(function(){ return 1; })();");
    expect(r.success === false && r.code).toBe("TIMEOUT");
  });

  it("blocks dangerous patterns before touching the bridge", async () => {
    presence();
    const t = new FileTransport(config());
    const r = await t.send("eval('1')");
    expect(r.success === false && r.code).toBe("BLOCKED_SCRIPT");
    expect(readdirSync(dir).filter((f) => f.startsWith("cmd_"))).toEqual([]);
  });

  it("serialises concurrent sends (single flight)", async () => {
    presence();
    let inFlight = 0;
    let maxInFlight = 0;
    fakeExecutor(() => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      setTimeout(() => inFlight--, 60);
      return { delayMs: 80, response: JSON.stringify({ success: true, data: 1 }) };
    });
    const t = new FileTransport(config());
    const rs = await Promise.all([1, 2, 3].map(() => t.send("(function(){ return __result(1); })();")));
    expect(rs.every((r) => r.success)).toBe(true);
    expect(maxInFlight).toBe(1);
  });

  it("removes orphaned protocol files older than 10 minutes", async () => {
    presence();
    mkdirSync(dir, { recursive: true });
    const orphan = join(dir, "res_old.json");
    writeFileSync(orphan, "{}");
    const old = new Date(Date.now() - 11 * 60_000);
    utimesSync(orphan, old, old);
    fakeExecutor(() => ({ response: JSON.stringify({ success: true, data: 1 }) }));
    const t = new FileTransport(config());
    await t.send("(function(){ return __result(1); })();");
    expect(existsSync(orphan)).toBe(false);
  });
});
