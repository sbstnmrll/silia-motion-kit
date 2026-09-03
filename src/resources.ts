import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./tools/types.js";
import { runScript } from "./tools/types.js";
import { AE_INSTRUCTIONS } from "./server.js";
import { MATCHNAME_CHEATSHEET } from "./resources/matchnames.js";

async function readJson(ctx: ToolContext, code: string): Promise<string> {
  const r = await runScript(ctx, code, { timeoutMs: 8000 });
  return JSON.stringify(r.success ? r.data : { error: r.error, code: r.code }, null, 2);
}

export function registerResources(server: McpServer, ctx: ToolContext): void {
  server.registerResource(
    "ae-instructions",
    "config://ae-instructions",
    { description: "How to drive After Effects through this server (read once per session).", mimeType: "text/plain" },
    async (uri) => ({ contents: [{ uri: uri.href, text: AE_INSTRUCTIONS }] }),
  );
  server.registerResource(
    "ae-matchnames",
    "ae://matchnames",
    { description: "Curated matchName cheat sheet: transform, text, shape, animator, selector, mask and common effect parameter paths.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, text: MATCHNAME_CHEATSHEET }] }),
  );
  server.registerResource(
    "ae-status",
    "ae://status",
    { description: "Live bridge status and project summary (same as ae_status).", mimeType: "application/json" },
    async (uri) => {
      const status = await ctx.transport.status();
      const live = status.listeners.length > 0 ? await readJson(ctx, "return __result({ project: __projectInfo(), activeComp: (app.project.activeItem instanceof CompItem) ? __compInfo(app.project.activeItem) : null });") : JSON.stringify({ connected: false });
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ bridge: status, live: JSON.parse(live) }, null, 2) }] };
    },
  );
  server.registerResource(
    "ae-project",
    "ae://project",
    { description: "Open project summary: file, comps, missing footage.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: await readJson(ctx, "return __result(__projectInfo());") }] }),
  );
  server.registerResource(
    "ae-comps",
    "ae://comps",
    { description: "All compositions with size, fps, duration and layer counts.", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: await readJson(ctx, "var out=[]; for (var i=1;i<=app.project.numItems;i++){ var it=app.project.item(i); if (it instanceof CompItem) out.push(__compInfo(it)); } return __result(out);") }],
    }),
  );
}
