import { describe, expect, it } from "vitest";
import { CapabilityDeniedError, capabilitiesForToolInvocation, capabilityForTool, guardToolHandler, isToolPermitted, resolveCapabilities } from "../../src/security/capabilities.js";

describe("capabilities", () => {
  it("defaults exclude unsafe-script", () => {
    const c = resolveCapabilities(undefined);
    expect([...c.capabilities].sort()).toEqual(["edit", "export", "filesystem", "inspect"]);
    expect(c.source).toBe("default");
  });
  it("parses the environment list and rejects unknown names", () => {
    expect([...resolveCapabilities("inspect, edit").capabilities].sort()).toEqual(["edit", "inspect"]);
    expect(() => resolveCapabilities("inspect,banana")).toThrow(/Unknown/);
  });
  it("classifies tools and fails closed to edit", () => {
    expect(capabilityForTool("ae_execute_extendscript")).toBe("unsafe-script");
    expect(capabilityForTool("ae_frame")).toBe("export");
    expect(capabilityForTool("ae_layer_query")).toBe("inspect");
    expect(capabilityForTool("ae_something_new")).toBe("edit");
  });
  it("resolves action-level authority for consolidated tools", () => {
    expect(capabilitiesForToolInvocation("ae_project", { action: "info" })).toEqual(["inspect"]);
    expect(capabilitiesForToolInvocation("ae_project", { action: "open" })).toEqual(["edit", "filesystem"]);
    expect(capabilitiesForToolInvocation("ae_render", { action: "start" })).toEqual(["export", "filesystem"]);
  });
  it("withholds unsafe tools from listing under the default profile but always lists ae_status", () => {
    const c = resolveCapabilities(undefined);
    expect(isToolPermitted("ae_execute_extendscript", c)).toBe(false);
    expect(isToolPermitted("ae_status", resolveCapabilities("export"))).toBe(true);
    expect(isToolPermitted("ae_project", resolveCapabilities("inspect"))).toBe(true); // info action is inspect-only
  });
  it("guardToolHandler denies at call time", async () => {
    const c = resolveCapabilities("inspect");
    const guarded = guardToolHandler("ae_layer_create", async () => "ran", c, () => "op1");
    await expect(guarded({})).rejects.toBeInstanceOf(CapabilityDeniedError);
    const ok = guardToolHandler("ae_project", async () => "ran", c);
    await expect(ok({ action: "info" })).resolves.toBe("ran");
  });
});
