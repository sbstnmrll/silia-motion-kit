// Generates docs/supported-actions.md from the live tool registry (dist build).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { collectTools, createContext } = await import(`file://${join(root, "dist", "server.js").replace(/\\/g, "/")}`);
const { loadConfig } = await import(`file://${join(root, "dist", "config.js").replace(/\\/g, "/")}`);
const { resolveCapabilities, capabilityForTool } = await import(`file://${join(root, "dist", "security", "index.js").replace(/\\/g, "/")}`);

const config = loadConfig({ AE_MCP_ALLOW_RAW: "1" });
const ctx = createContext(config, resolveCapabilities("inspect,edit,export,filesystem,unsafe-script"));
const tools = collectTools(ctx);

function actions(shape) {
  const a = shape.action;
  if (!a) return null;
  const def = a instanceof z.ZodEnum ? a : a?._def?.innerType;
  const opts = def?.options ?? def?._def?.entries ? Object.keys(def._def.entries) : def?.options;
  return Array.isArray(opts) ? opts : opts ? Object.values(opts) : null;
}

const lines = ["# ae-mcp supported tools", "", `Generated ${new Date().toISOString().slice(0, 10)} from the tool registry. ${Object.keys(tools).length} tools.`, "", "| Tool | Authority | Actions | Description |", "|---|---|---|---|"];
for (const [name, def] of Object.entries(tools).sort(([a], [b]) => a.localeCompare(b))) {
  const acts = actions(def.parameters);
  const desc = def.description.split(/\n/)[0].replace(/\|/g, "\\|").slice(0, 220);
  lines.push(`| \`${name}\` | ${capabilityForTool(name)} | ${acts ? acts.map((x) => `\`${x}\``).join(", ") : "—"} | ${desc} |`);
}
lines.push("", "## Parameters", "");
for (const [name, def] of Object.entries(tools).sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`### ${name}`, "", def.description, "", "| Param | Type | Notes |", "|---|---|---|");
  for (const [p, schema] of Object.entries(def.parameters)) {
    const s = schema;
    const optional = s.isOptional?.() ?? s?._def?.type === "optional";
    const inner = s?._def?.innerType ?? s;
    const type = inner?._def?.type ?? inner?.def?.type ?? "";
    const enumVals = inner?._def?.entries ? Object.keys(inner._def.entries).join(" \\| ") : "";
    const desc = (s.description ?? inner.description ?? "").replace(/\|/g, "\\|");
    lines.push(`| \`${p}\` | ${type}${enumVals ? `: ${enumVals}` : ""}${optional ? " (optional)" : ""} | ${desc} |`);
  }
  lines.push("");
}
mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "supported-actions.md"), lines.join("\n"), "utf-8");
console.log(`docs/supported-actions.md written (${Object.keys(tools).length} tools)`);
