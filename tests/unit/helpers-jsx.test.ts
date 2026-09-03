/**
 * Runs the ES3 helper library inside node:vm with a stub After Effects DOM to
 * check envelopes, path resolution, coercion and ease arity without AE.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { describe, expect, it, beforeAll } from "vitest";

type Ctx = Record<string, any>;

function makeContext(): Ctx {
  // Minimal AE DOM stubs.
  const PropertyValueType = { NO_VALUE: 0, ThreeD_SPATIAL: 1, ThreeD: 2, TwoD_SPATIAL: 3, TwoD: 4, OneD: 5, COLOR: 6, CUSTOM_VALUE: 7, MARKER: 8, LAYER_INDEX: 9, MASK_INDEX: 10, SHAPE: 11, TEXT_DOCUMENT: 12 };
  const PropertyType = { PROPERTY: 1, INDEXED_GROUP: 2, NAMED_GROUP: 3 };
  const KeyframeInterpolationType = { LINEAR: 1, BEZIER: 2, HOLD: 3 };
  class KeyframeEase {
    constructor(
      public speed: number,
      public influence: number,
    ) {}
  }
  class Prop {
    propertyType = PropertyType.PROPERTY;
    keys: Array<{ t: number; v: unknown; inE?: KeyframeEase[]; outE?: KeyframeEase[]; ii?: number; oi?: number }> = [];
    value: unknown;
    canVaryOverTime = true;
    canSetExpression = true;
    expression = "";
    expressionEnabled = false;
    expressionError = "";
    isTimeVarying = false;
    propertyDepth = 2;
    parentProperty: Group | null = null;
    constructor(
      public matchName: string,
      public name: string,
      public propertyValueType: number,
      public isSpatial: boolean,
      value: unknown,
    ) {
      this.value = value;
    }
    get numKeys() {
      return this.keys.length;
    }
    setValue(v: unknown) {
      this.value = v;
    }
    setValuesAtTimes(ts: number[], vs: unknown[]) {
      ts.forEach((t, i) => this.keys.push({ t, v: vs[i], ii: 1, oi: 1 }));
      this.keys.sort((a, b) => a.t - b.t);
    }
    nearestKeyIndex(t: number) {
      let best = 1;
      let d = Infinity;
      this.keys.forEach((k, i) => {
        if (Math.abs(k.t - t) < d) {
          d = Math.abs(k.t - t);
          best = i + 1;
        }
      });
      return best;
    }
    keyTime(i: number) {
      return this.keys[i - 1].t;
    }
    keyValue(i: number) {
      return this.keys[i - 1].v;
    }
    setInterpolationTypeAtKey(i: number, a: number, b: number) {
      this.keys[i - 1].ii = a;
      this.keys[i - 1].oi = b;
    }
    setTemporalEaseAtKey(i: number, inE: KeyframeEase[], outE: KeyframeEase[]) {
      const dims = this.isSpatial ? 1 : Array.isArray(this.value) ? (this.value as unknown[]).length : 1;
      if (inE.length !== dims || outE.length !== dims) throw new Error(`ease arity ${inE.length}/${outE.length}, expected ${dims}`);
      this.keys[i - 1].inE = inE;
      this.keys[i - 1].outE = outE;
    }
    keyInTemporalEase(i: number) {
      return this.keys[i - 1].inE ?? [new KeyframeEase(0, 16.67)];
    }
    keyOutTemporalEase(i: number) {
      return this.keys[i - 1].outE ?? [new KeyframeEase(0, 16.67)];
    }
    keyInInterpolationType(i: number) {
      return this.keys[i - 1].ii;
    }
    keyOutInterpolationType(i: number) {
      return this.keys[i - 1].oi;
    }
    valueAtTime() {
      return this.value;
    }
  }
  class Group {
    propertyType = PropertyType.NAMED_GROUP;
    children: Array<Prop | Group> = [];
    propertyDepth = 1;
    parentProperty: Group | null = null;
    constructor(
      public matchName: string,
      public name: string,
    ) {}
    get numProperties() {
      return this.children.length;
    }
    add(c: Prop | Group) {
      c.parentProperty = this;
      this.children.push(c);
      return c;
    }
    property(i: number | string) {
      if (typeof i === "number") return this.children[i - 1];
      return this.children.find((c) => c.matchName === i || c.name === i) ?? null;
    }
  }
  const transform = new Group("ADBE Transform Group", "Transform");
  transform.add(new Prop("ADBE Position", "Position", PropertyValueType.ThreeD_SPATIAL, true, [960, 540, 0]));
  transform.add(new Prop("ADBE Scale", "Scale", PropertyValueType.ThreeD, false, [100, 100, 100]));
  transform.add(new Prop("ADBE Opacity", "Opacity", PropertyValueType.OneD, false, 100));
  const effects = new Group("ADBE Effect Parade", "Effects");
  const blur = new Group("ADBE Gaussian Blur 2", "Gaussian Blur");
  blur.add(new Prop("ADBE Gaussian Blur 2-0001", "Blurriness", PropertyValueType.OneD, false, 0));
  effects.add(blur);
  const fill = new Group("ADBE Fill", "Fill");
  fill.add(new Prop("ADBE Fill-0002", "Color", PropertyValueType.COLOR, false, [1, 1, 1, 1]));
  effects.add(fill);
  const layer = new Group("layer", "Layer 1");
  layer.propertyDepth = 0;
  layer.add(transform);
  layer.add(effects);

  const ctx: Ctx = {
    PropertyValueType,
    PropertyType,
    KeyframeInterpolationType,
    KeyframeEase,
    app: { version: "26.3x87", project: {} },
    $: { locale: "en_US" },
    Layer: Group,
    layer,
    console,
  };
  ctx.globalThis = ctx;
  return ctx;
}

let ctx: Ctx;
beforeAll(() => {
  ctx = makeContext();
  vm.createContext(ctx);
  const json2 = readFileSync(resolve(__dirname, "../../src/jsx/vendor/json2.js"), "utf-8");
  const helpers = readFileSync(resolve(__dirname, "../../src/jsx/helpers.jsx"), "utf-8");
  // Simulate the ES3 engine having no JSON: json2 must install it.
  vm.runInContext("this.JSON = undefined;", ctx);
  vm.runInContext(json2, ctx);
  vm.runInContext(helpers, ctx);
});

const run = (code: string) => vm.runInContext(code, ctx);

describe("helpers.jsx (vm)", () => {
  it("json2 installs JSON and envelopes serialise", () => {
    expect(run("typeof JSON.stringify")).toBe("function");
    expect(JSON.parse(run('__result({ a: 1, s: "ñ" })'))).toEqual({ success: true, data: { a: 1, s: "ñ" } });
    const e = JSON.parse(run('__error(new Error("boom"), "X")'));
    expect(e.success).toBe(false);
    expect(e.error).toBe("boom");
    expect(e.code).toBe("X");
  });

  it("warnings are attached to the result", () => {
    const r = JSON.parse(run('__warn("careful"); __result({ a: 1 })'));
    expect(r.data.warnings).toEqual(["careful"]);
    expect(JSON.parse(run("__result({})")).data.warnings).toBeUndefined();
  });

  it("__prop walks matchName paths, aliases and display-name fallback", () => {
    expect(run('__prop(layer, "ADBE Transform Group/ADBE Position").matchName')).toBe("ADBE Position");
    expect(run('__prop(layer, "position").matchName')).toBe("ADBE Position");
    expect(run('__prop(layer, "opacity").name')).toBe("Opacity");
    expect(run('__prop(layer, "Effects/Gaussian Blur/Blurriness").matchName')).toBe("ADBE Gaussian Blur 2-0001");
    expect(run('__prop(layer, "effects/ADBE Fill/ADBE Fill-0002").name')).toBe("Color");
    expect(() => run('__prop(layer, "ADBE Transform Group/ADBE Nope")')).toThrow(/not found/);
  });

  it("__color parses hex and normalises arrays", () => {
    expect(run('__color("#DEFF38")').map((x: number) => Math.round(x * 255))).toEqual([222, 255, 56]);
    expect(run('__color("#DEFF38", true)')).toHaveLength(4);
    expect(run("__color([255, 0, 128])").map((x: number) => Math.round(x * 255))).toEqual([255, 0, 128]);
    expect(run("__color([0.5, 0.5, 0.5])")).toEqual([0.5, 0.5, 0.5]);
    expect(run('__hex([1, 0, 0])')).toBe("#ff0000");
  });

  it("__coerce handles stringified arrays, percentages, colors and dims", () => {
    expect(run('__coerce(__prop(layer, "scale"), "[90, 90]")')).toEqual([90, 90, 0]);
    expect(run('__coerce(__prop(layer, "opacity"), "50%")')).toBe(50);
    expect(run('__coerce(__prop(layer, "opacity"), true)')).toBe(1);
    expect(run('__coerce(__prop(layer, "Effects/ADBE Fill/ADBE Fill-0002"), "#000000")')).toEqual([0, 0, 0, 1]);
    expect(() => run('__coerce(__prop(layer, "position"), 5)')).toThrow(/expects/);
  });

  it("__easeArrays uses one ease for spatial props and one per dimension otherwise", () => {
    expect(run('__easeArrays(__prop(layer, "position"), 0, 33).length')).toBe(1);
    expect(run('__easeArrays(__prop(layer, "scale"), 0, 33).length')).toBe(3);
    expect(run('__easeArrays(__prop(layer, "opacity"), 0, 33).length')).toBe(1);
    expect(run('__easeArrays(__prop(layer, "opacity"), 0, 500)[0].influence')).toBe(100);
  });

  it("__setKeys writes keys and applies preset eases with correct arity", () => {
    const r = run(`var p = __prop(layer, "scale"); __setKeys(p, [{ time: 0, value: [50, 50], ease: "power3_out" }, { time: 1, value: "[100,100]", ease: "hold" }]); __keyList(p)`);
    expect(r).toHaveLength(2);
    expect(r[0].value).toEqual([50, 50, 0]);
    expect(r[0].outInterpolation).toBe("bezier");
    expect(r[0].outEase.influence).toBe(21.5);
    expect(r[1].inInterpolation).toBe("hold");
    expect(() => run('__applyEase(__prop(layer, "scale"), 1, "nope")')).toThrow(/Unknown ease preset/);
  });

  it("__bezierToEase converts cubic-bezier to influence and speed", () => {
    const e = run(`var q = __prop(layer, "position"); __setKeys(q, [{ time: 0, value: [0, 0] }, { time: 1, value: [100, 0] }]); __bezierToEase(q, 1, { x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 })`);
    expect(e.outInfluence).toBeCloseTo(21.5, 1);
    expect(e.inInfluence).toBeCloseTo(64.5, 1);
    expect(e.outSpeed).toBeCloseTo((0.61 / 0.215) * 100, 0);
  });

  it("named presets resolve through the bezier table (speed computed, silia. prefix accepted)", () => {
    const r = run(`var o = __prop(layer, "opacity"); __setKeys(o, [{ time: 0, value: 0 }, { time: 1, value: 100 }]); [__applyEase(o, 1, "silia.power3_out"), __applyEase(o, 2, "Expo-Out")]`);
    expect(r[0].preset).toBe("power3_out");
    expect(r[0].outInfluence).toBe(21.5);
    expect(r[0].outSpeed).toBeCloseTo((0.61 / 0.215) * 100, 0);
    expect(r[1].preset).toBe("expo_out");
    expect(r[1].inInfluence).toBe(78);
    expect(r[1].inSpeed).toBe(0); // y2 = 1
    expect(run("__EASE_PRESETS.linear")).toBeNull();
    expect(run("__EASE_PRESETS.power3_out")).toEqual({ x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 });
  });

  it("the build regenerates the __EASE_PRESETS block in dist from motion/eases", async () => {
    const distHelpers = resolve(__dirname, "../../dist/jsx/helpers.jsx");
    const distEases = resolve(__dirname, "../../dist/motion/eases.js");
    if (!existsSync(distHelpers) || !existsSync(distEases)) return; // run npm run build first; nothing to check without dist
    const text = readFileSync(distHelpers, "utf-8");
    const start = text.indexOf("// @@EASE_PRESETS_START@@");
    const end = text.indexOf("// @@EASE_PRESETS_END@@");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = text.slice(start, end);
    expect(block).toMatch(/generated from src\/motion\/eases\.ts/);
    expect(block).toMatch(/^\s+linear: null,?$/m);
    const { EASES } = await import(pathToFileURL(distEases).href);
    for (const [name, def] of Object.entries<any>(EASES)) {
      if (name === "linear") continue;
      const [x1, y1, x2, y2] = def.bezier;
      expect(block, name).toContain(`  ${name}: { x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2} }`);
    }
    expect(block).not.toMatch(/,\s*\n\s*\}/); // no trailing commas (ES3)
    // The generated block must itself be valid ES3 that the vm can load.
    const probe: Record<string, any> = {};
    vm.createContext(probe);
    vm.runInContext(block.replace(/^\/\/.*$/gm, ""), probe);
    expect(Object.keys(probe.__EASE_PRESETS).length).toBe(Object.keys(EASES).length);
  });

  it("__effectsList is not required for alias lookup shape", () => {
    expect(run('__EFFECT_ALIASES["glow"]')).toBe("ADBE Glo2");
    expect(run('__EFFECT_ALIASES["directional blur"]')).toBe("ADBE Motion Blur");
  });

  it("__tc formats timecode", () => {
    expect(run("__tc(61.5, 30)")).toBe("00:01:01:15");
  });
});
