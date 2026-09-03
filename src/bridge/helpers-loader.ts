/**
 * Locates dist/jsx/helpers.jsx (json2 + our helpers, concatenated at build time),
 * hashes it, and writes it once per version into the bridge dir. Each command
 * carries only the bootstrap line, which $.evalFile's the helpers into the engine
 * if this exact version is not loaded yet (pattern from premiere-pro-mcp).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBootstrap } from "./script-builder.js";
import { FILE } from "./protocol.js";

const here = dirname(fileURLToPath(import.meta.url));

/** dist/bridge -> dist/jsx/helpers.jsx (or src/jsx when running from source in tests). */
export function locateHelpersFile(): string {
  const candidates = [
    resolve(here, "../jsx/helpers.jsx"),
    resolve(here, "../../dist/jsx/helpers.jsx"),
    resolve(here, "../../src/jsx/helpers.jsx"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`helpers.jsx not found; run "npm run build" (looked in ${candidates.join(", ")})`);
}

let cached: { source: string; version: string } | null = null;

export function getHelpers(): { source: string; version: string } {
  if (cached) return cached;
  const path = locateHelpersFile();
  let source = readFileSync(path, "utf-8");
  // When running from src/, json2 is not concatenated yet: prepend it.
  if (!/json2\.js/.test(source)) {
    const json2 = resolve(dirname(path), "vendor/json2.js");
    if (existsSync(json2)) source = `${readFileSync(json2, "utf-8")}\n${source}`;
  }
  const version = createHash("md5").update(source).digest("hex").slice(0, 12);
  cached = { source: `${source}\nvar __AE_MCP_HELPERS_V = "${version}";\n`, version };
  return cached;
}

/** Test seam. */
export function resetHelpersCache(): void {
  cached = null;
}

/**
 * Ensure <dir>/helpers_<version>.jsx exists (UTF-8 with BOM so ExtendScript reads
 * accents correctly) and return the bootstrap line.
 */
export function ensureHelpers(dir: string): string {
  const { source, version } = getHelpers();
  const path = join(dir, `${FILE.helpersPrefix}${version}.jsx`);
  if (!existsSync(path)) {
    const staged = `${path}.${process.pid}.staged`;
    writeFileSync(staged, `﻿${source}`, "utf-8");
    try {
      renameSync(staged, path);
    } catch {
      // Another server process won the race; the content is identical.
    }
  }
  return buildBootstrap(path, version);
}
