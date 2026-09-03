// Build step: concatenate src/jsx/vendor/json2.js + src/jsx/helpers.jsx into
// dist/jsx/helpers.jsx and copy the remaining .jsx files verbatim.
//
// While doing so, the block between `// @@EASE_PRESETS_START@@` and
// `// @@EASE_PRESETS_END@@` in helpers.jsx is regenerated from the compiled
// dist/motion/eases.js (single source of truth for named eases). Runs after tsc;
// when dist/motion/eases.js is missing the source block is kept and a warning printed.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "jsx");
const dst = join(root, "dist", "jsx");
mkdirSync(dst, { recursive: true });

const START = "// @@EASE_PRESETS_START@@";
const END = "// @@EASE_PRESETS_END@@";

/** ES3 object literal `{ name: { x1, y1, x2, y2 } }` with `linear: null`; no trailing commas. */
function renderEasePresets(eases) {
  const lines = ["var __EASE_PRESETS = {"];
  const entries = Object.entries(eases);
  entries.forEach(([name, def], i) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Ease name "${name}" is not a valid ES3 identifier key`);
    const comma = i < entries.length - 1 ? "," : "";
    if (name === "linear") {
      lines.push(`  linear: null${comma}`);
      return;
    }
    const [x1, y1, x2, y2] = def.bezier;
    for (const v of def.bezier) if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`Ease "${name}" has a non-finite bezier value`);
    lines.push(`  ${name}: { x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2} }${comma}`);
  });
  lines.push("};");
  return lines.join("\n");
}

async function fillEasePresets(helpers) {
  const s = helpers.indexOf(START);
  const e = helpers.indexOf(END);
  if (s < 0 || e < 0 || e < s) {
    console.warn("jsx: ease preset markers not found in helpers.jsx; block left as is");
    return helpers;
  }
  const easesJs = join(root, "dist", "motion", "eases.js");
  if (!existsSync(easesJs)) {
    console.warn(`jsx: ${easesJs} missing (run tsc first); ease preset block left as is`);
    return helpers;
  }
  const { EASES } = await import(pathToFileURL(easesJs).href);
  const block = `${START} (generated from src/motion/eases.ts; ${Object.keys(EASES).length} eases)\n${renderEasePresets(EASES)}\n`;
  return helpers.slice(0, s) + block + helpers.slice(e);
}

const json2 = readFileSync(join(src, "vendor", "json2.js"), "utf-8");
const helpers = await fillEasePresets(readFileSync(join(src, "helpers.jsx"), "utf-8"));
writeFileSync(join(dst, "helpers.jsx"), `// ==== json2.js (public domain) ====\n${json2}\n// ==== ae-mcp helpers ====\n${helpers}`, "utf-8");

for (const f of readdirSync(src)) {
  if (f.endsWith(".jsx") && f !== "helpers.jsx") copyFileSync(join(src, f), join(dst, f));
}
console.log(`jsx: wrote ${join(dst, "helpers.jsx")} (${json2.length + helpers.length} bytes)`);
