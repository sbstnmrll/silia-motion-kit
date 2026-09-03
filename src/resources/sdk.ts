/**
 * ae://sdk resources — the After Effects ExtendScript object reference split per
 * object under data/sdk/*.md (from pushREC/after-effects-sdk-kb, MIT; content derived
 * from https://ae-scripting.docsforadobe.dev/, AE 26.0). Files are read relative to the
 * package root so the resource works from dist/ and from an installed package.
 */
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Package root: dist/resources/sdk.js → ../.. */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SDK_DIR = join(PACKAGE_ROOT, "data", "sdk");

export function sdkObjects(): string[] {
  if (!existsSync(SDK_DIR)) return [];
  return readdirSync(SDK_DIR)
    .filter((f) => f.endsWith(".md") && f !== "INDEX.md")
    .map((f) => f.slice(0, -3))
    .sort();
}

/** Case-insensitive lookup, tolerant of "Object" suffixes and separators (comp-item → CompItem). */
export function resolveSdkObject(name: string): string | undefined {
  const objects = sdkObjects();
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.]/g, "").replace(/object$/, "");
  const wanted = norm(name);
  return objects.find((o) => norm(o) === wanted) ?? objects.find((o) => norm(o).startsWith(wanted));
}

export function readSdkIndex(): string {
  const p = join(SDK_DIR, "INDEX.md");
  if (existsSync(p)) return readFileSync(p, "utf-8");
  const objects = sdkObjects();
  if (!objects.length) return "# ae://sdk\n\nNo reference files found under data/sdk. Run the SDK split (see THIRD_PARTY_NOTICES.md, pushREC/after-effects-sdk-kb).";
  return `# ae://sdk\n\n${objects.map((o) => `- ae://sdk/${o}`).join("\n")}\n`;
}

export function registerSdkResources(server: McpServer): void {
  server.registerResource(
    "ae-sdk-index",
    "ae://sdk",
    { description: "After Effects ExtendScript API reference index (AE 26.0): every scripting object with a one-line summary and its ae://sdk/{object} URI. From pushREC/after-effects-sdk-kb (MIT).", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: readSdkIndex() }] }),
  );
  server.registerResource(
    "ae-sdk-object",
    new ResourceTemplate("ae://sdk/{object}", {
      list: async () => ({ resources: sdkObjects().map((o) => ({ uri: `ae://sdk/${o}`, name: `ae-sdk-${o}`, description: `ExtendScript reference: ${o}`, mimeType: "text/markdown" })) }),
      complete: { object: (value) => sdkObjects().filter((o) => o.toLowerCase().startsWith(value.toLowerCase())) },
    }),
    { description: "ExtendScript reference for one scripting object (Application, Project, CompItem, Layer, AVLayer, TextLayer, Property, PropertyGroup, TextDocument, KeyframeEase, MarkerValue, RenderQueue, OutputModule, MatchNames, Changelog …). Attributes, methods, parameters, version notes.", mimeType: "text/markdown" },
    async (uri, vars) => {
      const requested = String(vars.object ?? "");
      const object = resolveSdkObject(requested);
      if (!object) {
        return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Not found\n\nNo reference for "${requested}". Known objects:\n\n${sdkObjects().map((o) => `- ae://sdk/${o}`).join("\n")}\n` }] };
      }
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: readFileSync(join(SDK_DIR, `${object}.md`), "utf-8") }] };
    },
  );
}
