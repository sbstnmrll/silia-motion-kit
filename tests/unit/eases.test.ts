import { describe, expect, it } from "vitest";
import { EASES, bezierToInfluence, bezierToKeyframeEase, easeCategory, easeNames, easeToCss, easesByCategory, resolveEase } from "../../src/motion/eases.js";
import { SILIA_EASES, resolveEase as resolveSiliaEase } from "../../src/silia/tokens.js";
import { durationFor, distanceDurationTable } from "../../src/motion/durations.js";
import { staggerFor } from "../../src/motion/staggers.js";
import { fillExpression, EXPRESSION_LIBRARY } from "../../src/motion/expressions.js";
import { planMotion } from "../../src/motion/plan.js";
import { REGISTERS } from "../../src/motion/taxonomy.js";

describe("motion/eases", () => {
  it("every bezier has 4 finite numbers and a role", () => {
    for (const [name, e] of Object.entries(EASES)) {
      expect(e.bezier, name).toHaveLength(4);
      for (const v of e.bezier) expect(Number.isFinite(v), `${name} ${v}`).toBe(true);
      expect(["enter", "exit", "within", "loop", "any"]).toContain(e.role);
      expect(e.source.length, name).toBeGreaterThan(0);
      expect(e.license.length, name).toBeGreaterThan(0);
    }
  });

  it("Easy Ease maps to 33.33 / 33.33", () => {
    const inf = bezierToInfluence(EASES.ease.bezier);
    expect(inf.outInfluence).toBeCloseTo(33.3, 1);
    expect(inf.inInfluence).toBeCloseTo(33.3, 1);
  });

  it("material_emphasized_decelerate maps to out 5 / in 90", () => {
    const inf = bezierToInfluence(EASES.material_emphasized_decelerate.bezier);
    expect(inf.outInfluence).toBe(5);
    expect(inf.inInfluence).toBe(90);
  });

  it("bezierToKeyframeEase computes speed from the average speed and guards vertical tangents", () => {
    const e = bezierToKeyframeEase([0.215, 0.61, 0.355, 1], 100);
    expect(e.outInfluence).toBeCloseTo(21.5, 2);
    expect(e.inInfluence).toBeCloseTo(64.5, 2);
    expect(e.outSpeed).toBeCloseTo((0.61 / 0.215) * 100, 2);
    expect(e.inSpeed).toBe(0); // y2 = 1 -> flat arrival
    const g = bezierToKeyframeEase([0, 0, 1, 1], 50);
    expect(g.outSpeed).toBe(0);
    expect(g.inSpeed).toBe(0);
    expect(g.outInfluence).toBe(0.1);
    expect(g.inInfluence).toBe(0.1);
    const clamp = bezierToKeyframeEase([1.5, 0, -0.2, 1], 10);
    expect(clamp.outInfluence).toBe(100);
    expect(clamp.inInfluence).toBe(100);
  });

  it("resolveEase accepts case, separators and the silia. prefix", () => {
    expect(resolveEase("power3_out")?.name).toBe("power3_out");
    expect(resolveEase("Power3.Out")?.name).toBe("power3_out");
    expect(resolveEase("power3-out")?.name).toBe("power3_out");
    expect(resolveEase("silia.snappy")?.name).toBe("snappy");
    expect(resolveEase(" Material Emphasized Decelerate ")?.name).toBe("material_emphasized_decelerate");
    expect(resolveEase("nope")).toBeUndefined();
  });

  it("legacy Silia names keep their production beziers", () => {
    expect(EASES.power2_out.bezier).toEqual([0.25, 0.46, 0.45, 0.94]);
    expect(EASES.power3_out.bezier).toEqual([0.215, 0.61, 0.355, 1]);
    expect(EASES.power3_in_out.bezier).toEqual([0.645, 0.045, 0.355, 1]);
    expect(EASES.power2_in_out.bezier).toEqual([0.455, 0.03, 0.515, 0.955]);
    expect(EASES.expo_out.bezier).toEqual([0.19, 1, 0.22, 1]);
    expect(EASES.snappy.bezier).toEqual([0.15, 0.85, 0.15, 1]);
    expect(EASES.gsap_power3_out.bezier).toEqual([0.165, 0.84, 0.44, 1]);
    expect(EASES.power2_out.note).toMatch(/legacy/i);
  });

  it("overshoot flags are set only where y leaves 0..1", () => {
    for (const [name, e] of Object.entries(EASES)) {
      const [, y1, , y2] = e.bezier;
      const leaves = y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1;
      expect(Boolean(e.overshoots), name).toBe(leaves);
    }
    expect(EASES.ease_out_back.overshoots).toBe(true);
    expect(EASES.ease_in_out_back.overshoots).toBe(true);
  });

  it("categories and css", () => {
    expect(easeCategory("carbon_productive_standard")).toBe("carbon");
    expect(easeCategory("ease_out_quart")).toBe("easings.net");
    expect(easeCategory("power3_out")).toBe("silia/gsap");
    expect(easeToCss("linear")).toBe("linear");
    expect(easeToCss("snappy")).toBe("cubic-bezier(0.15, 0.85, 0.15, 1)");
    const grouped = easesByCategory();
    expect(Object.keys(grouped).sort()).toEqual(["atlassian", "carbon", "easings.net", "fluent", "material", "polaris", "silia/gsap"]);
    expect(Object.values(grouped).reduce((n, arr) => n + arr.length, 0)).toBe(easeNames().length);
  });

  it("register default eases all resolve", () => {
    for (const r of Object.values(REGISTERS)) for (const name of Object.values(r.eases)) expect(resolveEase(name!), name).toBeDefined();
  });
});

describe("silia tokens derive from EASES", () => {
  it("SILIA_EASES is a view over EASES with influences", () => {
    expect(Object.keys(SILIA_EASES).sort()).toEqual(easeNames().sort());
    expect(SILIA_EASES.power3_out.outInfluence).toBeCloseTo(21.5, 2);
    expect(SILIA_EASES.power3_out.inInfluence).toBeCloseTo(64.5, 2);
    expect(SILIA_EASES.linear.inInfluence).toBe(0.1);
  });
  it("resolveEase (tokens) delegates and keeps the legacy shape", () => {
    const e = resolveSiliaEase("silia.power3_out");
    expect(e.bezier).toEqual([0.215, 0.61, 0.355, 1]);
    expect(e.inSpeed).toBe(0);
    expect(e.outInfluence).toBeCloseTo(21.5, 2);
    expect(() => resolveSiliaEase("nope")).toThrow(/Unknown ease/);
  });
});

describe("motion/durations + staggers", () => {
  it("durationFor follows 300*sqrt(d/200) clamped per register and snaps to frames", () => {
    expect(durationFor(200, "product_video").ms).toBe(300);
    expect(durationFor(800, "product_video").ms).toBe(600);
    expect(durationFor(50, "functional_ui").ms).toBe(150); // 150 raw = band floor
    expect(durationFor(5000, "functional_ui").ms).toBe(400); // clamped
    expect(durationFor(5000, "product_video").ms).toBe(900); // clamped to hero max
    const snapped = durationFor(450, "product_video", 30);
    expect(snapped.frames).toBe(Math.round((450 / 1000) * 30));
    expect(snapped.ms).toBe(Math.round((snapped.frames! / 30) * 1000));
    expect(distanceDurationTable()).toHaveLength(6);
  });
  it("staggerFor uses the table and caps long sequences", () => {
    expect(staggerFor(3, "functional_ui", 200).perItemMs).toBe(40);
    expect(staggerFor(5, "product_video", 300).perItemMs).toBe(90);
    expect(staggerFor(10, "functional_ui", 200).perItemMs).toBe(20);
    const long = staggerFor(40, "product_video", 400);
    expect(long.sequenceMs).toBeLessThanOrEqual(2000);
    expect(long.perItemMs).toBeGreaterThanOrEqual(40);
    const ui = staggerFor(200, "functional_ui", 150);
    expect(ui.perItemMs).toBe(8); // floor
    expect(staggerFor(1, "product_video", 300).perItemMs).toBe(0);
  });
});

describe("motion/expressions", () => {
  it("fills placeholders with defaults and params, warns on unknown/out-of-range", () => {
    const d = fillExpression("inertia");
    expect(d.expression).toContain("amp = 0.08; freq = 3; decay = 6;");
    expect(d.expression).not.toMatch(/\{\{/);
    const p = fillExpression("inertia", { amp: 0.5, bogus: 1 });
    expect(p.expression).toContain("amp = 0.5;");
    expect(p.warnings.join(" ")).toMatch(/outside/);
    expect(p.warnings.join(" ")).toMatch(/bogus/);
    const t = fillExpression("ebox_responsive", { target: 'My "Title"', padding: 32 });
    expect(t.expression).toContain('thisComp.layer("My \\"Title\\"")');
    expect(t.expression).toContain("pad = 32;");
    expect(() => fillExpression("nope")).toThrow(/Unknown library/);
  });
  it("every template's placeholders are declared params and defaults fill completely", () => {
    for (const [name, def] of Object.entries(EXPRESSION_LIBRARY)) {
      const used = [...def.template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      for (const u of used) expect(def.params, `${name}.${u}`).toHaveProperty(u);
      expect(fillExpression(name).expression, name).not.toMatch(/\{\{/);
    }
  });
});

describe("motion/plan", () => {
  it("plans a hero reveal for aesthetic intent in product_video", () => {
    const p = planMotion({ intent: "aesthetic" });
    expect(p.register).toBe("product_video");
    expect(p.ease.name).toBe("ease_out_expo");
    expect(p.durationMs).toBeGreaterThanOrEqual(600);
    expect(p.durationMs).toBeLessThanOrEqual(900);
    expect(p.durationFrames).toBe(Math.round((p.durationMs / 1000) * 30));
    expect(p.exitEase.name).toBe("power2_in");
    expect(p.sources.length).toBeGreaterThan(0);
  });
  it("feedback defaults to functional_ui and staggers", () => {
    const p = planMotion({ intent: "feedback", item_count: 4, fps: 60 });
    expect(p.register).toBe("functional_ui");
    expect(p.ease.name).toBe("fluent_ease_out");
    expect(p.staggerMs).toBe(30);
    expect(p.sequenceMs).toBeLessThanOrEqual(500);
  });
  it("uses the distance formula when distance_px is given", () => {
    const p = planMotion({ intent: "transition", distance_px: 800, register: "product_video", fps: 30 });
    expect(p.durationMs).toBe(600);
    expect(p.durationFrames).toBe(18);
    expect(() => planMotion({ intent: "nope" as any })).toThrow(/Unknown intent/);
  });
});
