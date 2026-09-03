/**
 * Bridge directory resolution: one subdirectory per After Effects major version
 * (v25, v26, ...) so two running versions never see each other's commands, plus
 * presence scanning so the server can pick a live listener.
 *
 * ensureDir is adapted from premiere-pro-mcp (MIT): refuse a directory owned by
 * another user on POSIX, because the executor runs ANY cmd_*.jsx it finds there.
 */
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FILE, PRESENCE_FRESH_MS, type Presence } from "./protocol.js";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    return;
  }
  if (process.platform === "win32") return;
  const st = statSync(dir);
  const myUid = typeof process.getuid === "function" ? process.getuid() : undefined;
  if (myUid !== undefined && st.uid !== myUid) {
    throw new Error(
      `Bridge dir ${dir} is owned by uid ${st.uid}, not this user (${myUid}). Refusing to use it; set AE_MCP_TEMP_DIR to a path only you control.`,
    );
  }
  if ((st.mode & 0o077) !== 0) chmodSync(dir, 0o700);
}

/** "2026" | "26" | "26.3" | "v26" -> 26. Returns null for "auto"/empty/garbage. */
export function parseTargetMajor(target: string | undefined): number | null {
  if (!target) return null;
  const t = target.trim().toLowerCase();
  if (t === "" || t === "auto") return null;
  const m = /^v?(\d+)(?:\.\d+)*$/.exec(t);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  // Marketing year (2025, 2026, ...) maps to the internal major (25, 26, ...).
  if (n >= 2000) return n - 2000;
  return n;
}

export function versionDir(root: string, major: number): string {
  return join(root, `v${major}`);
}

export function listVersionDirs(root: string): Array<{ major: number; dir: string }> {
  if (!existsSync(root)) return [];
  const out: Array<{ major: number; dir: string }> = [];
  for (const name of readdirSync(root)) {
    const m = /^v(\d+)$/.exec(name);
    if (!m) continue;
    const dir = join(root, name);
    try {
      if (statSync(dir).isDirectory()) out.push({ major: parseInt(m[1], 10), dir });
    } catch {
      // ignore
    }
  }
  return out.sort((a, b) => b.major - a.major);
}

export function readPresences(dir: string, nowMs = Date.now()): Presence[] {
  if (!existsSync(dir)) return [];
  const out: Presence[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(FILE.presencePrefix) || !name.endsWith(".json")) continue;
    const p = join(dir, name);
    try {
      const raw = JSON.parse(readFileSync(p, "utf-8")) as Presence;
      const ageMs = Math.max(0, nowMs - statSync(p).mtimeMs);
      out.push({ ...raw, ageMs, dir });
    } catch {
      // partially written or stale; ignore
    }
  }
  return out;
}

export function freshPresences(dir: string, nowMs = Date.now()): Presence[] {
  return readPresences(dir, nowMs).filter(
    (p) => (p.ageMs ?? Infinity) < PRESENCE_FRESH_MS && p.state === "running",
  );
}

export interface ResolvedTarget {
  dir: string;
  major: number | null;
  listeners: Presence[];
  /** All live listeners across every version dir (for diagnostics). */
  allListeners: Presence[];
}

/**
 * Pick the bridge dir to talk to. An explicit target always wins (even with no
 * listener, so the error message can name the dir). "auto" chooses the highest
 * version dir with a fresh listener, else the highest version dir that exists.
 */
export function resolveTarget(root: string, target: string, nowMs = Date.now()): ResolvedTarget {
  const explicit = parseTargetMajor(target);
  const dirs = listVersionDirs(root);
  const allListeners = dirs.flatMap((d) => freshPresences(d.dir, nowMs));

  if (explicit !== null) {
    const dir = versionDir(root, explicit);
    return { dir, major: explicit, listeners: freshPresences(dir, nowMs), allListeners };
  }

  for (const d of dirs) {
    const listeners = freshPresences(d.dir, nowMs);
    if (listeners.length > 0) return { dir: d.dir, major: d.major, listeners, allListeners };
  }
  if (dirs.length > 0) return { dir: dirs[0].dir, major: dirs[0].major, listeners: [], allListeners };
  return { dir: join(root, "v0"), major: null, listeners: [], allListeners };
}
