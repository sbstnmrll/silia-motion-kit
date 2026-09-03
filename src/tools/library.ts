import { z } from "zod";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildScript, jsLiteral, argsVar } from "../bridge/index.js";
import { err, ok, safe, type ToolContext, type ToolDef, type ToolRecord } from "./types.js";

export interface LibraryParam {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface LibraryEntry {
  name: string;
  description: string;
  jsx: string;
  params: Record<string, LibraryParam>;
  tags: string[];
  hash: string;
  createdAt: string;
  updatedAt: string;
  uses: number;
  lastOk: boolean | null;
  promoted: boolean;
  example?: Record<string, unknown>;
}

const NAME_RE = /^[a-z][a-z0-9_]{2,40}$/;

export function libraryDir(dataDir: string): string {
  const d = join(dataDir, "library");
  mkdirSync(d, { recursive: true });
  return d;
}

export function loadLibrary(dataDir: string): LibraryEntry[] {
  const d = libraryDir(dataDir);
  return readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(d, f), "utf-8")) as LibraryEntry;
      } catch {
        return null;
      }
    })
    .filter((x): x is LibraryEntry => !!x)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function save(dataDir: string, e: LibraryEntry): void {
  writeFileSync(join(libraryDir(dataDir), `${e.name}.json`), JSON.stringify(e, null, 2), "utf-8");
}

function normalise(jsx: string): string {
  return jsx.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}

/** Build the script for a library entry: `var params = {...}` then the body inside one undo group. */
export function buildLibraryScript(e: LibraryEntry, params: Record<string, unknown>): string {
  const merged: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(e.params)) {
    if (params[k] !== undefined) merged[k] = params[k];
    else if (p.default !== undefined) merged[k] = p.default;
    else if (p.required) throw new Error(`Missing required param "${k}"`);
  }
  for (const [k, v] of Object.entries(params)) if (!(k in merged)) merged[k] = v;
  let body = e.jsx;
  // {{param}} placeholders are replaced with JSON literals; `params.x` is also available.
  body = body.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (_m, k: string) => jsLiteral(merged[k]));
  return buildScript(`${argsVar("params", merged)}\nreturn __mutate(${JSON.stringify("Library: " + e.name)}, function () {\n${body}\n});`);
}

export function zodShapeFor(e: LibraryEntry): z.ZodRawShape {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [k, p] of Object.entries(e.params)) {
    let s: z.ZodTypeAny = p.type === "number" ? z.number() : p.type === "boolean" ? z.boolean() : p.type === "array" ? z.array(z.unknown()) : p.type === "object" ? z.record(z.string(), z.unknown()) : z.string();
    if (p.description) s = s.describe(p.description);
    shape[k] = p.required && p.default === undefined ? s : s.optional();
  }
  return shape;
}

export function libraryToolDef(ctx: ToolContext, e: LibraryEntry): ToolDef {
  return {
    description: `[library] ${e.description}${e.tags.length ? ` (tags: ${e.tags.join(", ")})` : ""}`,
    parameters: zodShapeFor(e),
    handler: safe(async (args: Record<string, unknown>) => runEntry(ctx, e, args)),
  };
}

async function runEntry(ctx: ToolContext, e: LibraryEntry, params: Record<string, unknown>) {
  let script: string;
  try {
    script = buildLibraryScript(e, params);
  } catch (x) {
    return err(x instanceof Error ? x.message : String(x), "BAD_ARG");
  }
  const r = await ctx.transport.send(script, { unsafe: true, longRunning: true });
  e.uses++;
  e.lastOk = r.success;
  save(ctx.config.dataDir, e);
  return r;
}

export function getLibraryTools(ctx: ToolContext): ToolRecord {
  return {
    ae_tool_library: {
      description:
        "Self-growing tool library. After a raw ExtendScript works (ae_execute_extendscript), save it here with a name, description and param schema so it can be re-run by name (and promoted to a first-class MCP tool). save/update: {name, description, jsx, params:{p:{type,description,required,default}}, tags}; the jsx runs inside one undo group with `params.<p>` available and {{p}} placeholders replaced; it must return __result(...). list (optional tag/regex filter); get; run {name, params}; delete; promote {name, promoted:true|false} registers lib_<name> as a tool (available next session, or immediately when the server supports dynamic registration). Entries are deduplicated by content hash.",
      parameters: {
        action: z.enum(["save", "update", "list", "get", "run", "delete", "promote"]),
        name: z.string().regex(NAME_RE, "lowercase snake_case, 3-40 chars").optional(),
        description: z.string().max(500).optional(),
        jsx: z.string().max(200_000).optional(),
        params: z.record(z.string(), z.object({ type: z.enum(["string", "number", "boolean", "array", "object"]), description: z.string().optional(), required: z.boolean().optional(), default: z.unknown().optional() })).optional(),
        tags: z.array(z.string()).optional(),
        example: z.record(z.string(), z.unknown()).optional(),
        run_params: z.record(z.string(), z.unknown()).optional().describe("run: parameter values."),
        promoted: z.boolean().optional(),
        filter: z.string().optional().describe("list: regex on name/description/tags."),
      },
      handler: safe(async (a: Record<string, unknown>) => {
        const dataDir = ctx.config.dataDir;
        const lib = loadLibrary(dataDir);
        const byName = (n?: unknown) => lib.find((e) => e.name === n);
        if (a.action === "list") {
          const re = a.filter ? new RegExp(a.filter as string, "i") : null;
          return ok({ count: lib.length, tools: lib.filter((e) => !re || re.test(e.name) || re.test(e.description) || e.tags.some((t) => re.test(t))).map((e) => ({ name: e.name, description: e.description, params: e.params, tags: e.tags, uses: e.uses, lastOk: e.lastOk, promoted: e.promoted, updatedAt: e.updatedAt })) });
        }
        if (a.action === "get") {
          const e = byName(a.name);
          return e ? ok(e) : err("not found", "NOT_FOUND");
        }
        if (a.action === "delete") {
          const e = byName(a.name);
          if (!e) return err("not found", "NOT_FOUND");
          rmSync(join(libraryDir(dataDir), `${e.name}.json`), { force: true });
          return ok({ deleted: e.name });
        }
        if (a.action === "run") {
          const e = byName(a.name);
          if (!e) return err("not found", "NOT_FOUND");
          if (!ctx.config.allowRawScript && !ctx.capabilities.capabilities.has("unsafe-script") && !e.promoted) {
            return err("Running un-promoted library scripts requires AE_MCP_ALLOW_RAW=1; promote the entry (reviewed) to run it under the default profile.", "RAW_DISABLED");
          }
          return runEntry(ctx, e, (a.run_params as Record<string, unknown>) ?? {});
        }
        if (a.action === "promote") {
          const e = byName(a.name);
          if (!e) return err("not found", "NOT_FOUND");
          e.promoted = a.promoted !== false;
          e.updatedAt = new Date().toISOString();
          save(dataDir, e);
          const registered = e.promoted && ctx.registerDynamicTool ? ctx.registerDynamicTool(`lib_${e.name}`, libraryToolDef(ctx, e)) : false;
          return ok({ name: e.name, promoted: e.promoted, toolName: `lib_${e.name}`, registeredNow: registered, note: registered ? "Tool is available now." : e.promoted ? "Tool will be registered when the server restarts." : "Tool unregistered on next restart." });
        }
        if (a.action === "save" || a.action === "update") {
          if (!a.name || !a.jsx) return err("name and jsx are required", "BAD_ARG");
          if (!/__result\s*\(/.test(a.jsx as string)) return err("jsx must return __result(...)", "BAD_ARG");
          const hash = createHash("sha256").update(normalise(a.jsx as string)).digest("hex").slice(0, 16);
          const dup = lib.find((e) => e.hash === hash && e.name !== a.name);
          if (dup && a.action === "save") return err(`Identical script already saved as "${dup.name}"`, "DUPLICATE");
          const existing = byName(a.name);
          if (existing && a.action === "save") return err(`"${a.name}" exists; use action=update`, "EXISTS");
          const e: LibraryEntry = {
            name: a.name as string,
            description: (a.description as string) ?? existing?.description ?? "",
            jsx: a.jsx as string,
            params: (a.params as Record<string, LibraryParam>) ?? existing?.params ?? {},
            tags: (a.tags as string[]) ?? existing?.tags ?? [],
            hash,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            uses: existing?.uses ?? 0,
            lastOk: existing?.lastOk ?? null,
            promoted: existing?.promoted ?? false,
            example: (a.example as Record<string, unknown>) ?? existing?.example,
          };
          save(dataDir, e);
          return ok({ saved: e.name, hash, params: e.params, promoted: e.promoted, path: join(libraryDir(dataDir), `${e.name}.json`) });
        }
        return err("Unknown action", "BAD_ARG");
      }),
    },
  };
}

/** Promoted entries become first-class tools at startup. */
export function getPromotedLibraryTools(ctx: ToolContext): ToolRecord {
  const out: ToolRecord = {};
  if (!existsSync(join(ctx.config.dataDir, "library"))) return out;
  for (const e of loadLibrary(ctx.config.dataDir)) if (e.promoted) out[`lib_${e.name}`] = libraryToolDef(ctx, e);
  return out;
}
