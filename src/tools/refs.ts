import { z } from "zod";

/** Comp reference: "active" (default), item id, name, or {id}/{name}. */
export const compRef = z
  .union([z.string(), z.number().int(), z.object({ id: z.number().int().optional(), name: z.string().optional() })])
  .optional()
  .describe('Composition: "active" (default), numeric item id, comp name, or {id}|{name}.');

/** Layer reference: 1-based index, name, or {id}/{index}/{name}. */
export const layerRef = z
  .union([z.number().int(), z.string(), z.object({ id: z.number().int().optional(), index: z.number().int().optional(), name: z.string().optional() })])
  .describe("Layer: 1-based index, layer name, or {id} (AE 22+), {index}, {name}.");

export const layerRefs = z.array(layerRef).min(1).describe("One or more layer references.");

/** Property path: matchName segments joined by "/", or an alias (position, scale, opacity...). */
export const propPath = z
  .string()
  .min(1)
  .describe('Property path by matchName, e.g. "ADBE Transform Group/ADBE Position" or "Effects/ADBE Gaussian Blur 2/ADBE Gaussian Blur 2-0001". Aliases: position, scale, rotation, opacity, anchor, orientation, "source text", contents.');

/** Any property value: number, [x,y], [x,y,z], "#RRGGBB", string. */
export const propValue = z.union([z.number(), z.string(), z.boolean(), z.array(z.number()), z.array(z.string())]).describe('Value matching the property: number, [x,y], [x,y,z], "#RRGGBB" for colors, string for text.');

export const colorValue = z.union([z.string(), z.array(z.number())]).describe('"#RRGGBB" or [r,g,b] (0..1 or 0..255)');

export const easeSpec = z
  .union([
    z.string(),
    z.object({
      inInfluence: z.number().min(0.1).max(100).optional(),
      outInfluence: z.number().min(0.1).max(100).optional(),
      inSpeed: z.number().optional(),
      outSpeed: z.number().optional(),
    }),
    z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }).describe("cubic-bezier(x1,y1,x2,y2)"),
  ])
  .describe('Ease: preset name (linear, hold, ease, ease_in, ease_out, ease_in_out, power2_out, power3_out, power3_in_out, expo_out, snappy), {inInfluence,outInfluence,inSpeed,outSpeed}, or cubic-bezier {x1,y1,x2,y2}.');

export const timeoutMs = z.number().int().min(1000).max(600_000).optional().describe("Override the command timeout in ms.");
