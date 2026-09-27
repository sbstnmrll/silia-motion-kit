// figma-dump.js — volcado de geometría de frames de un storyboard, para `use_figma` (Figma Plugin API).
//
// Uso: edita IDS con 2–3 ids de frame (los ids salen de `get_metadata` sobre la página del storyboard,
// p. ej. "117:3"). **1 id por llamada** si el board anida componentes (cards, instancias): el
// volcado es recursivo y la respuesta se corta a 20 kb — verificado el 2026-09-20 con tres tomas
// de `no-sabias-agente`, que no cupieron. 2-3 ids solo si las tomas son planas.
// Devuelve un string JSON. Por frame: id, name, x, y, w, h, fills (hex), radius, effects, children.
// Por hijo (en orden de z: el ÚLTIMO se dibuja ENCIMA): z, type, name, x/y/w/h relativos al frame,
// fills hex, radius, effects (tipos), opacity, rb = absoluteRenderBounds relativo al frame [x, y, w, h]
// (la caja de tinta real: úsala como posición en AE), backdrop = los fills de lo que se pinta DETRÁS
// (el último nodo ya pintado que lo cubre, a cualquier nivel, o el frame), path y depth para saber
// dónde estaba en la jerarquía, y para TEXT: chars, font, size, lineHeight,
// letterSpacing, align, alignV, autoResize, dropped.
// Cadenas saneadas (Latin básico, máx. 200 chars) para que el JSON viaje sin romper el transporte.
// `dropped` cuenta los glifos que el saneado tuvo que sustituir: un emoji que la fuente de marca no
// tiene sale como mancha en el render (pasó de verdad), así que se reporta en vez de perderse callando.
// `backdrop` existe para poder medir contraste sin abrir Figma: sin él no hay sobre qué medir.

const IDS = ["117:3", "146:596"];

function num(v, d) {
  if (typeof v !== "number") return v;
  const p = Math.pow(10, d === undefined ? 1 : d);
  return Math.round(v * p) / p;
}

const KEEP = /[^\x20-\x7E¡-ÿĀ-ɏ‐-‧]/g;

function clean(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(KEEP, "?")
    .slice(0, 200);
}

// Cuántos glifos no sobreviven al saneado. Señal, no ruido: si es > 0 el texto
// depende de un carácter que la fuente de marca probablemente no tiene.
// Se cuenta por punto de código, no por unidad UTF-16: un emoji es un glifo, no dos.
const KEEP_ONE = /[^\x20-\x7E¡-ÿĀ-ɏ‐-‧]/;

function droppedCount(s) {
  const str = String(s === undefined || s === null ? "" : s);
  let n = 0;
  for (const ch of str) if (KEEP_ONE.test(ch)) n++;
  return n;
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
    dropped: droppedCount(n.characters),
  };
}

// El fill de lo que se pinta DETRÁS de un nodo: el último nodo ya pintado (orden
// de documento = orden de pintado) cuya caja lo cubre y tiene relleno; si no hay
// ninguno, el del propio frame. Sin esto no se puede medir contraste fuera de Figma.
// Se busca sobre la lista aplanada, así que funciona también entre niveles: un
// texto dentro de `stage` encuentra la card que tiene debajo aunque sean primos.
function backdropOf(painted, node, frameFills) {
  const b = node.rb;
  if (!b) return frameFills;
  const bx = b[0], by = b[1], bw = b[2], bh = b[3];
  for (let j = painted.length - 1; j >= 0; j--) {
    const c = painted[j];
    if (!c.fills || !c.fills.length || !c.rb) continue;
    const r = c.rb;
    // Cubre el nodo si su caja lo contiene con holgura de 1 px.
    if (r[0] <= bx + 1 && r[1] <= by + 1 && r[0] + r[2] >= bx + bw - 1 && r[1] + r[3] >= by + bh - 1) return c.fills;
  }
  return frameFills;
}

// Los boards reales anidan: el contenido de una toma vive dentro de un frame
// `stage`, no como hijo directo. Volcar solo un nivel deja fuera justo lo que hay
// que medir, así que se recorre en profundidad y se devuelve una lista plana en
// orden de pintado, con `path` y `depth` para poder reconstruir la jerarquía.
// `rb` es siempre relativo al frame raíz, así que sigue siendo válido a cualquier
// profundidad. MAX_NODES acota la respuesta: el transporte se rompe con volcados
// grandes, y un board con más de 300 nodos por toma hay que volcarlo por partes.
const MAX_DEPTH = 6;
const MAX_NODES = 300;

function walk(node, fx, fy, depth, parentPath, out) {
  const kids = "children" in node ? node.children : [];
  for (let i = 0; i < kids.length; i++) {
    if (out.length >= MAX_NODES) return;
    const c = kids[i];
    const name = clean(c.name);
    const path = parentPath ? parentPath + "/" + name : name;
    out.push({
      z: out.length,
      depth: depth,
      path: path,
      type: c.type,
      name: name,
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
    });
    if (c.visible !== false && depth < MAX_DEPTH) walk(c, fx, fy, depth + 1, path, out);
  }
}

async function dumpFrame(id) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) return { id: id, error: "not found" };
  const fx = f.absoluteTransform[0][2];
  const fy = f.absoluteTransform[1][2];
  const frameFills = fills(f);
  const children = [];
  walk(f, fx, fy, 0, "", children);
  // Segunda pasada: el fondo de cada nodo es lo ya pintado por debajo de él.
  for (let i = 0; i < children.length; i++) {
    children[i].backdrop = backdropOf(children.slice(0, i), children[i], frameFills);
  }
  const truncated = children.length >= MAX_NODES;
  return {
    id: id,
    name: clean(f.name),
    x: num(f.x),
    y: num(f.y),
    w: num(f.width),
    h: num(f.height),
    truncated: truncated,
    fills: fills(f),
    radius: radius(f),
    effects: effects(f),
    children: children,
  };
}

const out = [];
for (const id of IDS) out.push(await dumpFrame(id));
return JSON.stringify(out);
