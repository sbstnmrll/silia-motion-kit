/**
 * Exercises the sharp pipelines of ae_frame (contact sheet, onion skin, sampling) on
 * synthetic frames: a square easing out across a dark background. No After Effects.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildContactSheet, buildOnionSkin, frameLabel, sampleRange, type Captured, type CompMeta } from "../../src/tools/vision.js";

const W = 320;
const H = 180;
const FPS = 30;
const meta: CompMeta = { time: 0, duration: 2, fps: FPS, width: W, height: H, name: "Synthetic", markers: [], keyTimes: [] };

let dir: string;
let frames: Captured[];

async function square(x: number, path: string): Promise<void> {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0A0A0B"/><rect x="${x}" y="70" width="40" height="40" fill="#DEFF38"/></svg>`;
  writeFileSync(path, await sharp(Buffer.from(svg)).png().toBuffer());
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "ae-mcp-vision-"));
  // ease-out: displacement shrinks each step (100, 60, 30, 10)
  const xs = [20, 120, 180, 210, 220];
  frames = [];
  for (let i = 0; i < xs.length; i++) {
    const path = join(dir, `f${i}.png`);
    await square(xs[i], path);
    frames.push({ time: i / FPS, path, width: W, height: H });
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("ae_frame image pipelines", () => {
  it("labels carry timecode, absolute frame and seconds", () => {
    expect(frameLabel(0.5, 30)).toBe("00:00:15 · f15 · 0.50s");
    expect(frameLabel(61.2, 25)).toBe("01:01:05 · f1530 · 61.20s");
  });

  it("samples short ranges at 0.1 s by default and long ranges at range/12", () => {
    const clamp = (t: number) => t;
    const short = sampleRange({ start: 0, end: 1 }, undefined, undefined, 30, clamp);
    expect(short.every).toBe(0.1);
    expect(short.times.length).toBe(11);
    const capped = sampleRange({ start: 0, end: 2 }, undefined, 8, 30, clamp);
    expect(capped.times.length).toBe(8);
    const long = sampleRange({ start: 0, end: 12 }, undefined, undefined, 30, clamp);
    expect(long.every).toBe(1);
    expect(long.times.length).toBe(13); // inclusive of the range end so the final pose is sampled
  });

  it("builds a contact sheet with frame-numbered labels", async () => {
    const sheet = await buildContactSheet(frames, meta, { background: "#0A0A0B", maxWidth: 640 });
    expect(sheet.mimeType).toBe("image/jpeg");
    expect(sheet.grid).toEqual([3, 2]);
    expect(sheet.frames[2].label).toBe("00:00:02 · f2 · 0.07s");
    const m = await sharp(Buffer.from(sheet.base64, "base64")).metadata();
    expect(m.width).toBe(sheet.cell[0] * 3);
  });

  it("builds an onion skin whose spacing shrinks for an ease-out", async () => {
    const onion = await buildOnionSkin(frames, meta, { background: "#0A0A0B", maxWidth: 320 });
    expect(onion.mimeType).toBe("image/jpeg");
    const m = await sharp(Buffer.from(onion.base64, "base64")).metadata();
    expect(m.width).toBe(320);
    expect(m.height).toBe(onion.height);
    expect(onion.frames[0].changedBbox).toBeNull();
    expect(onion.frames[0].motionBbox).toEqual([20, 70, 40, 40]);
    expect(onion.frames[1].changedBbox).toEqual([20, 70, 140, 40]);
    expect(onion.frames[2].motionBbox?.slice(0, 2)).toEqual([180, 70]);
    expect(onion.frames[4].tint).toBeNull();
    // change-region centroids sit at the midpoints 90/170/215/235 -> displacements 80/45/20
    expect(onion.spacing).toEqual([80, 45, 20]);
    // the ghost trail must leave tinted pixels where the square used to be: faint for the oldest
    // pose (x=20..60), stronger for a recent one (x=180..220, not covered by the final square at 220..260)
    const { data, info } = await sharp(Buffer.from(onion.base64, "base64")).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
    expect(Math.max(...px(40, 90))).toBeGreaterThan(30);
    expect(Math.max(...px(190, 90))).toBeGreaterThan(90);
    expect(Math.max(...px(190, 90))).toBeGreaterThan(Math.max(...px(40, 90)));
    expect(Math.max(...px(300, 20))).toBeLessThan(40);
  });
});
