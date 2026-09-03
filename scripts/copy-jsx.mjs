// Build step: concatenate src/jsx/vendor/json2.js + src/jsx/helpers.jsx into
// dist/jsx/helpers.jsx and copy the remaining .jsx files verbatim.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "jsx");
const dst = join(root, "dist", "jsx");
mkdirSync(dst, { recursive: true });

const json2 = readFileSync(join(src, "vendor", "json2.js"), "utf-8");
const helpers = readFileSync(join(src, "helpers.jsx"), "utf-8");
writeFileSync(
  join(dst, "helpers.jsx"),
  `// ==== json2.js (public domain) ====\n${json2}\n// ==== ae-mcp helpers ====\n${helpers}`,
  "utf-8",
);

for (const f of readdirSync(src)) {
  if (f.endsWith(".jsx") && f !== "helpers.jsx") copyFileSync(join(src, f), join(dst, f));
}
console.log(`jsx: wrote ${join(dst, "helpers.jsx")} (${json2.length + helpers.length} bytes)`);
