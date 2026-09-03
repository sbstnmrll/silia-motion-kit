import { describe, expect, it } from "vitest";
import { argsVar, buildBootstrap, buildScript, escapeForExtendScript, jsLiteral, validateScript } from "../../src/bridge/script-builder.js";

describe("escapeForExtendScript", () => {
  it("escapes quotes, backslashes and control characters", () => {
    expect(escapeForExtendScript('a"b')).toBe('a\\"b');
    expect(escapeForExtendScript("a'b")).toBe("a\\'b");
    expect(escapeForExtendScript("a\\b")).toBe("a\\\\b");
    expect(escapeForExtendScript("a\nb\r\tc")).toBe("a\\nb\\r\\tc");
  });
  it("escapes the ES3 line terminators U+2028/U+2029", () => {
    expect(escapeForExtendScript("a\u2028b\u2029c")).toBe("a\\u2028b\\u2029c");
  });
  it("keeps Spanish accents and emoji intact", () => {
    expect(escapeForExtendScript("Silia — prueba ñ á é 🎬")).toBe("Silia — prueba ñ á é 🎬");
  });
});

describe("jsLiteral / argsVar", () => {
  it("serialises primitives and objects to ES3-safe literals", () => {
    expect(jsLiteral("x")).toBe('"x"');
    expect(jsLiteral(1.5)).toBe("1.5");
    expect(jsLiteral(true)).toBe("true");
    expect(jsLiteral(null)).toBe("null");
    expect(jsLiteral(undefined)).toBe("undefined");
    expect(jsLiteral({ a: [1, "b"], c: { d: null } })).toBe('{"a":[1,"b"],"c":{"d":null}}');
  });
  it("escapes line terminators inside JSON payloads", () => {
    expect(jsLiteral({ s: "a\u2028b" })).not.toContain("\u2028");
    expect(argsVar("a", { s: "x" })).toBe('var a = {"s":"x"};');
  });
});

describe("buildScript / buildBootstrap", () => {
  it("wraps code in an IIFE with try/catch returning __error", () => {
    const s = buildScript("return __result({ ok: true });");
    expect(s.startsWith("(function () {")).toBe(true);
    expect(s).toContain("return __error(e);");
    expect(s.trimEnd().endsWith("})();")).toBe(true);
  });
  it("bootstrap guards on the helpers version and uses forward slashes", () => {
    const b = buildBootstrap("C:\\Temp\\ae-mcp-bridge\\v26\\helpers_abc.jsx", "abc");
    expect(b).toContain('__AE_MCP_HELPERS_V !== "abc"');
    expect(b).toContain('$.evalFile(new File("C:/Temp/ae-mcp-bridge/v26/helpers_abc.jsx"))');
  });
});

describe("validateScript", () => {
  it("blocks eval, new Function and system.callSystem unless unsafe", () => {
    expect(() => validateScript("eval('x')")).toThrow(/eval/);
    expect(() => validateScript("var f = new Function('a')")).toThrow(/Function/);
    expect(() => validateScript("system.callSystem('dir')")).toThrow(/callSystem/);
    expect(() => validateScript("eval('x')", true)).not.toThrow();
  });
  it("enforces the size limit even for unsafe scripts", () => {
    expect(() => validateScript("x".repeat(600 * 1024), true)).toThrow(/size limit/);
  });
  it("allows ordinary tool code", () => {
    expect(() => validateScript('var c = __comp("active"); return __result(__compInfo(c));')).not.toThrow();
  });
});
