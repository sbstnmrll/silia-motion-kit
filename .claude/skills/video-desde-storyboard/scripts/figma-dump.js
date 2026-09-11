// figma-dump.js — volcado de geometría de frames de un storyboard, para `use_figma` (Figma Plugin API).
//
// Uso: edita IDS con 2–3 ids de frame (los ids salen de `get_metadata` sobre la página del storyboard,
// p. ej. "117:3"). No pongas más de 3 por llamada: una respuesta grande rompe el transporte.
// Devuelve un string JSON. Por frame: id, name, x, y, w, h, fills (hex), radius, effects, children.
// Por hijo (en orden de z: el ÚLTIMO se dibuja ENCIMA): z, type, name, x/y/w/h relativos al frame,
// fills hex, radius, effects (tipos), opacity, rb = absoluteRenderBounds relativo al frame [x, y, w, h]
// (la caja de tinta real: úsala como posición en AE), y para TEXT: chars, font, size, lineHeight,
// letterSpacing, align, alignV, autoResize.
// Cadenas saneadas (Latin básico, máx. 200 chars) para que el JSON viaje sin romper el transporte.

const IDS = ["117:3", "146:596"];

function num(v, d) {
  if (typeof v !== "number") return v;
  const p = Math.pow(10, d === undefined ? 1 : d);
  return Math.round(v * p) / p;
}

function clean(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/[^\x20-\x7E¡-ÿĀ-ɏ‐-‧]/g, "?")
    .slice(0, 200);
}

function hex(c) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + h(c.r) + h(c.g) + h(c.b);
}

function fills(n) {
  if (!("fills" in n)) return undefined;
  if (n.fills === figma.mixed) return "mixed";
  return n.fills
    .filter((f) => f.visible !== false)
    .map((f) => {
      if (f.type !== "SOLID") return f.type;
      const op = typeof f.opacity === "number" && f.opacity < 1 ? "@" + Math.round(f.opacity * 100) : "";
      return hex(f.color) + op;
    });
}

function radius(n) {
  if (!("cornerRadius" in n)) return undefined;
  if (n.cornerRadius === figma.mixed) {
    return [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].map((r) => num(r));
  }
  return num(n.cornerRadius);
}

function effects(n) {
  if (!("effects" in n)) return [];
  return n.effects.filter((e) => e.visible !== false).map((e) => e.type);
}

function relBounds(n, fx, fy) {
  const b = n.absoluteRenderBounds;
  if (!b) return null;
  return [num(b.x - fx), num(b.y - fy), num(b.width), num(b.height)];
}

function textInfo(n) {
  if (n.type !== "TEXT") return undefined;
  const fn = n.fontName === figma.mixed ? "mixed" : n.fontName.family + " " + n.fontName.style;
  let lh = "mixed";
  if (n.lineHeight !== figma.mixed) {
    lh = n.lineHeight.unit === "AUTO" ? "auto" : num(n.lineHeight.value) + (n.lineHeight.unit === "PERCENT" ? "%" : "px");
  }
  const ls = n.letterSpacing === figma.mixed ? "mixed" : num(n.letterSpacing.value) + (n.letterSpacing.unit === "PERCENT" ? "%" : "px");
  return {
    chars: clean(n.characters),
    font: fn,
    size: n.fontSize === figma.mixed ? "mixed" : num(n.fontSize),
    lineHeight: lh,
    letterSpacing: ls,
    align: n.textAlignHorizontal,
    alignV: n.textAlignVertical,
    autoResize: n.textAutoResize,
  };
}

async function dumpFrame(id) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) return { id: id, error: "not found" };
  const fx = f.absoluteTransform[0][2];
  const fy = f.absoluteTransform[1][2];
  const kids = "children" in f ? f.children : [];
  const children = kids.map((c, i) => ({
    z: i,
    type: c.type,
    name: clean(c.name),
    x: num(c.x),
    y: num(c.y),
    w: num(c.width),
    h: num(c.height),
    fills: fills(c),
    radius: radius(c),
    effects: effects(c),
    opacity: "opacity" in c ? num(c.opacity, 2) : undefined,
    visible: c.visible,
    rb: relBounds(c, fx, fy),
    text: textInfo(c),
  }));
  return {
    id: id,
    name: clean(f.name),
    x: num(f.x),
    y: num(f.y),
    w: num(f.width),
    h: num(f.height),
    fills: fills(f),
    radius: radius(f),
    effects: effects(f),
    children: children,
  };
}

const out = [];
for (const id of IDS) out.push(await dumpFrame(id));
return JSON.stringify(out);
