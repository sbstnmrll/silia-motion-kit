import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findMacInstalls } from "../../src/bridge/poller-transport.js";

describe("findMacInstalls", () => {
  it("finds /Applications-style installs newest first and skips folders without the .app", () => {
    const base = mkdtempSync(join(tmpdir(), "ae-apps-"));
    try {
      mkdirSync(join(base, "Adobe After Effects 2025", "Adobe After Effects 2025.app"), { recursive: true });
      mkdirSync(join(base, "Adobe After Effects 2026", "Adobe After Effects 2026.app"), { recursive: true });
      mkdirSync(join(base, "Adobe After Effects 2024"), { recursive: true }); // leftover folder, no app
      mkdirSync(join(base, "Adobe Premiere Pro 2026", "Adobe Premiere Pro 2026.app"), { recursive: true });

      const found = findMacInstalls(base);
      expect(found.map((i) => i.year)).toEqual([2026, 2025]);
      expect(found[0]).toMatchObject({
        major: 26,
        root: join(base, "Adobe After Effects 2026"),
        afterfxExe: join(base, "Adobe After Effects 2026", "Adobe After Effects 2026.app"),
        aerender: join(base, "Adobe After Effects 2026", "aerender"),
      });
      expect(found[0].afterfxCom).toBeUndefined();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("returns [] when the base folder does not exist", () => {
    expect(findMacInstalls(join(tmpdir(), "does-not-exist-ae-mcp"))).toEqual([]);
  });
});
