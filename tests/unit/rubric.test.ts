import { describe, expect, it } from "vitest";
import { evaluateRubric, finalizeDump, RUBRIC, type DumpKey, type DumpLayer, type DumpProp, type KeyframeDump } from "../../src/motion/rubric.js";

const FPS = 30;
const f = (frames: number) => frames / FPS;

function key(frames: number, value: number | number[], outInterp: DumpKey["outInterp"], inInf: number, outInf: number, inInterp?: DumpKey["inInterp"]): DumpKey {
  return { t: f(frames), frame: frames, value, inInterp: inInterp ?? outInterp, outInterp, inInfluence: inInf, outInfluence: outInf, inSpeed: 0, outSpeed: 0 };
}

function prop(matchName: string, name: string, dims: number, keys: DumpKey[], isSpatial = false): DumpProp {
  return { path: `ADBE Transform Group/${matchName}`, matchName, name, dims, isSpatial, keys, firstKeyT: keys[0].t, lastKeyT: keys[keys.length - 1].t, durationMs: Math.round((keys[keys.length - 1].t - keys[0].t) * 1000) };
}

function layer(index: number, name: string, props: DumpProp[], inPoint = 0, outPoint = 5): DumpLayer {
  return { index, name, kind: "shape", inPoint, outPoint, props, glows: [] };
}

function dump(layers: DumpLayer[]): KeyframeDump {
  return finalizeDump({ comp: "Test", fps: FPS, duration: 5, width: 1920, height: 1080, layers });
}

describe("rubric", () => {
  it("has atomic items with unique ids and both auto and vision groups", () => {
    const ids = RUBRIC.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RUBRIC.some((r) => r.auto)).toBe(true);
    expect(RUBRIC.some((r) => !r.auto)).toBe(true);
    for (const r of RUBRIC) expect(r.check).not.toMatch(/\band\b.*\band\b/i);
  });

  it("fails uniform 300 ms + linear position + ease-in entrance with numeric fixes", () => {
    // 300 ms is 9 frames at 30 fps; all layers start at frame 0 (no stagger) with identical duration.
    const mk = (i: number) =>
      layer(i, `L${i}`, [
        // ease-in shape: first key departs with big influence, second arrives with small.
        prop("ADBE Opacity", "Opacity", 1, [key(0, 0, "bezier", 33, 80), key(9, 100, "bezier", 10, 33)]),
        prop("ADBE Position", "Position", 2, [key(0, [900, 600], "linear", 16.67, 16.67), key(9, [960, 540], "linear", 16.67, 16.67)], true),
      ]);
    const d = dump([mk(1), mk(2), mk(3), mk(4)]);
    const r = evaluateRubric(d, "product_video");
    const failedIds = r.failed.map((x) => x.id);
    expect(failedIds).toContain("timing.no_dead_uniformity");
    expect(failedIds).toContain("easing.no_linear_motion");
    expect(failedIds).toContain("easing.entrance_decelerates");
    expect(r.failed.length).toBeGreaterThanOrEqual(3);
    for (const x of r.failed) expect(x.fix).toMatch(/\d/);
    const uni = r.failed.find((x) => x.id === "timing.no_dead_uniformity");
    expect(uni?.fix).toContain("0.30 s uniform on 4 layers -> vary 0.26/0.32/0.40");
    // simultaneous starts are deferred to the vision pass, not failed
    expect(r.unverifiable.some((u) => u.id === "choreography.stagger_in_band")).toBe(true);
    expect(failedIds).not.toContain("choreography.stagger_in_band");
  });

  it("passes a correct staggered ease-out sequence with zero auto failures", () => {
    // Three layers, 100 ms (3 f) stagger, durations 8/10/12 frames, ease-out shape, exits shorter and accelerating.
    const mk = (i: number, startF: number, durF: number) =>
      layer(i, `Card ${i}`, [
        prop("ADBE Opacity", "Opacity", 1, [
          key(startF, 0, "bezier", 33, 0.1),
          key(startF + durF, 100, "bezier", 64.5, 33),
          key(90, 100, "bezier", 33, 64.5),
          key(90 + Math.round(durF * 0.6), 0, "bezier", 0.1, 33),
        ]),
        prop("ADBE Position", "Position", 2, [key(startF, [960, 580], "bezier", 33, 0.1), key(startF + durF, [960, 540], "bezier", 64.5, 33)], true),
        prop("ADBE Scale", "Scale", 2, [key(startF, [96, 96], "bezier", 33, 0.1), key(startF + durF, [100, 100], "bezier", 64.5, 33)]),
      ]);
    const d = dump([mk(1, 0, 8), mk(2, 3, 10), mk(3, 6, 12)]);
    const r = evaluateRubric(d, "product_video");
    expect(r.failed).toEqual([]);
    expect(r.passed.map((p) => p.id)).toContain("choreography.stagger_in_band");
    expect(r.passed.map((p) => p.id)).toContain("timing.exit_shorter");
    // every non-auto item is handed to the vision pass
    for (const item of RUBRIC.filter((x) => !x.auto)) expect(r.unverifiable.some((u) => u.id === item.id)).toBe(true);
    expect(d.staggerDeltas.map((s) => s.deltaMs)).toEqual([null, 100, 100]);
  });

  it("treats hold-only opacity as an appear with no easing required", () => {
    const d = dump([layer(1, "Caption", [prop("ADBE Opacity", "Opacity", 1, [key(0, 0, "hold", 16.67, 16.67), key(6, 100, "hold", 16.67, 16.67)])])]);
    const r = evaluateRubric(d, "functional_ui");
    const ent = r.passed.find((p) => p.id === "easing.entrance_decelerates");
    expect(ent?.note).toMatch(/appear \(hold\)/);
    expect(r.failed.map((x) => x.id)).not.toContain("easing.no_linear_motion");
  });

  it("flags off-frame keys, pop-in scale, keys outside the layer and zeroed glow", () => {
    const l = layer(
      1,
      "Badge",
      [
        prop("ADBE Scale", "Scale", 2, [key(0, [60, 60], "bezier", 33, 0.1), { ...key(9, [100, 100], "bezier", 64.5, 33), t: 0.305 }]),
      ],
      0,
      0.2,
    );
    l.glows = [{ name: "Glow", matchName: "ADBE Glo2", enabled: true, props: [prop("ADBE Glo2-0003", "Glow Intensity", 1, [key(0, 1, "bezier", 33, 33), key(9, 0, "bezier", 33, 33)])] }];
    const r = evaluateRubric(dump([l]), "product_video");
    const ids = r.failed.map((x) => x.id);
    expect(ids).toContain("timing.whole_frame");
    expect(ids).toContain("spatial.no_pop_in");
    expect(ids).toContain("spatial.keys_in_range");
    expect(ids).toContain("spatial.glow_not_zeroed");
    expect(r.failed.find((x) => x.id === "spatial.no_pop_in")?.fix).toMatch(/96-98/);
  });
});
