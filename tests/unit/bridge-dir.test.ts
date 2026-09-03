import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { freshPresences, listVersionDirs, parseTargetMajor, resolveTarget } from "../../src/bridge/bridge-dir.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ae-mcp-test-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function presence(dir: string, engine: string, source: string, appVersion: string, ageMs = 0, state = "running") {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, `presence_${engine}.json`);
  writeFileSync(p, JSON.stringify({ protocolVersion: 1, engine, source, appVersion, state }));
  if (ageMs) {
    const t = new Date(Date.now() - ageMs);
    utimesSync(p, t, t);
  }
}

describe("parseTargetMajor", () => {
  it("maps marketing years and versions to majors", () => {
    expect(parseTargetMajor("2026")).toBe(26);
    expect(parseTargetMajor("26")).toBe(26);
    expect(parseTargetMajor("26.3")).toBe(26);
    expect(parseTargetMajor("v25")).toBe(25);
    expect(parseTargetMajor("auto")).toBeNull();
    expect(parseTargetMajor("")).toBeNull();
    expect(parseTargetMajor(undefined)).toBeNull();
    expect(parseTargetMajor("garbage")).toBeNull();
  });
});

describe("resolveTarget", () => {
  it("auto picks the highest version dir with a fresh running listener", () => {
    presence(join(root, "v25"), "a", "cep-headless", "25.6");
    presence(join(root, "v26"), "b", "cep-headless", "26.3", 60_000); // stale
    const t = resolveTarget(root, "auto");
    expect(t.major).toBe(25);
    expect(t.listeners.map((l) => l.engine)).toEqual(["a"]);
    expect(listVersionDirs(root).map((d) => d.major)).toEqual([26, 25]);
  });
  it("explicit target wins even without a listener and reports other live listeners", () => {
    presence(join(root, "v25"), "a", "cep-headless", "25.6");
    const t = resolveTarget(root, "2026");
    expect(t.major).toBe(26);
    expect(t.listeners).toEqual([]);
    expect(t.allListeners.map((l) => l.engine)).toEqual(["a"]);
  });
  it("ignores stopped and stale presences", () => {
    const dir = join(root, "v26");
    presence(dir, "x", "cep-panel", "26.3", 0, "stopped");
    presence(dir, "y", "poller", "26.3", 20_000);
    expect(freshPresences(dir)).toEqual([]);
  });
  it("falls back to a v0 dir when nothing exists", () => {
    const t = resolveTarget(root, "auto");
    expect(t.major).toBeNull();
    expect(t.dir.endsWith("v0")).toBe(true);
  });
});
