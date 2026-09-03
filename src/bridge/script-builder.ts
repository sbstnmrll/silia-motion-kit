/**
 * Builds the ExtendScript command text. Adapted from premiere-pro-mcp (MIT).
 * All generated code must be ES3: var, no arrow functions, no template literals.
 * The helper library itself is a real .jsx file (src/jsx/helpers.jsx), loaded once
 * per engine via the bootstrap line; see helpers-loader.ts.
 */

export const MAX_SCRIPT_BYTES = 500 * 1024;

const BLOCKED_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\beval\s*\(/, label: "eval(" },
  { re: /\bnew\s+Function\s*\(/, label: "new Function(" },
  { re: /\bsystem\s*\.\s*callSystem\s*\(/i, label: "system.callSystem(" },
];

// U+2028 / U+2029 are line terminators for the ES3 engine: never let them into a literal raw.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

// ES3 future-reserved words: using them as identifiers or object keys is a syntax error
// that $.evalFile swallows silently (the command returns an empty result).
const ES3_WORDS =
  "abstract|boolean|byte|char|class|const|debugger|double|enum|export|extends|final|float|goto|implements|import|int|interface|long|native|package|private|protected|public|short|static|super|synchronized|throws|transient|volatile";
export const ES3_RESERVED = new RegExp(`(?:[{,(]\\s*|\\bvar\\s+)(${ES3_WORDS})\\b\\s*[:=,)]`);

// An unescaped "/" inside a regex character class terminates the literal in ES3.
// Note: an unescaped "/" inside a regex character class also ends the literal in ES3
// (write [^\/] not [^/]); it cannot be detected reliably without a tokenizer, so the
// CEP executor reports evaluation errors instead (see cep-plugin/main.js).

/**
 * Guard rail, not a sandbox: blocks the obvious ways a templated argument could
 * escalate into arbitrary code. Raw scripts (execute_extendscript) bypass the
 * pattern check but keep the size limit and the ES3 syntax checks.
 */
export function validateScript(script: string, allowUnsafe = false): void {
  if (Buffer.byteLength(script, "utf-8") > MAX_SCRIPT_BYTES) {
    throw new Error(`Script exceeds ${MAX_SCRIPT_BYTES / 1024} KB size limit`);
  }
  const reserved = ES3_RESERVED.exec(script);
  if (reserved) {
    const line = script.slice(0, reserved.index).split(/\r?\n/).length;
    throw new Error(`Script uses the ES3 reserved word "${reserved[1]}" as an identifier or object key (line ${line}); rename it.`);
  }
  if (allowUnsafe) return;
  for (const { re, label } of BLOCKED_PATTERNS) {
    if (re.test(script)) throw new Error(`Script contains blocked pattern: ${label}`);
  }
}

/** Bootstrap line: load helpers_<hash>.jsx unless this exact version is already in the engine. */
export function buildBootstrap(helpersPath: string, version: string): string {
  const escaped = helpersPath.replace(/\\/g, "/").replace(/"/g, '\\"');
  return `if (typeof __AE_MCP_HELPERS_V === "undefined" || __AE_MCP_HELPERS_V !== "${version}") { $.evalFile(new File("${escaped}")); }`;
}

/**
 * Wrap tool code in an IIFE with a try/catch that returns the error envelope.
 * The code must `return __result(...)` or `return __error(...)`.
 */
export function buildScript(code: string): string {
  return `(function () {
  try {
${code}
  } catch (e) {
    return __error(e);
  }
})();`;
}

/** Escape a string for embedding inside a double- or single-quoted ExtendScript literal. */
export function escapeForExtendScript(value: string): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}

/** Quote a JS value as an ExtendScript literal ("..." for strings, JSON for the rest). */
export function jsLiteral(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${escapeForExtendScript(value)}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value).replace(LINE_SEP, "\\u2028").replace(PARA_SEP, "\\u2029");
}

/**
 * Emit `var <name> = <json>;` so a tool script receives its arguments as a parsed
 * object instead of interpolating each field. Keeps the generated code short and
 * makes injection impossible for object-shaped inputs.
 */
export function argsVar(name: string, value: unknown): string {
  return `var ${name} = ${jsLiteral(value)};`;
}
