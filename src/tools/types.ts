import type { z } from "zod";
import type { AeMcpConfig } from "../config.js";
import type { BridgeResult, SendOptions, Transport } from "../bridge/index.js";
import { buildScript } from "../bridge/index.js";
import type { CapabilityConfig } from "../security/index.js";
import type { AuditSink } from "../security/index.js";

export interface ToolContext {
  transport: Transport;
  config: AeMcpConfig;
  capabilities: CapabilityConfig;
  audit: AuditSink;
  /** Set by the server: register a tool at runtime (returns false when unsupported). */
  registerDynamicTool?: (name: string, def: ToolDef) => boolean;
}

export interface ToolDef {
  description: string;
  /** zod raw shape; the server wraps it in z.object(). */
  parameters: z.ZodRawShape;
  handler: (args: any) => Promise<BridgeResult>;
}

export type ToolRecord = Record<string, ToolDef>;
export type ToolModule = (ctx: ToolContext) => ToolRecord;

/** Run tool code (body of the IIFE; must return __result/__error) in After Effects. */
export function runScript(ctx: ToolContext, code: string, options?: SendOptions): Promise<BridgeResult> {
  return ctx.transport.send(buildScript(code), options);
}

export function ok(data: unknown): BridgeResult {
  return { success: true, data };
}

export function err(error: string, code?: string): BridgeResult {
  return code ? { success: false, error, code } : { success: false, error };
}

/** Wrap a handler so thrown errors become failure envelopes instead of MCP errors. */
export function safe<TArgs>(fn: (args: TArgs) => Promise<BridgeResult>): (args: TArgs) => Promise<BridgeResult> {
  return async (args: TArgs) => {
    try {
      return await fn(args);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  };
}
