/**
 * Stagger (offset-and-delay) tables per item count and register, and a helper that
 * keeps whole sequences under the register's cap.
 */
import { REGISTERS, type Register } from "./taxonomy.js";

export interface StaggerRow {
  /** Inclusive item-count band; `max` null = open-ended. */
  items: { min: number; max: number | null };
  functional_ui: number | "computed";
  product_video: number | "computed";
  note: string;
}

export const STAGGER_TABLE: StaggerRow[] = [
  { items: { min: 2, max: 3 }, functional_ui: 40, product_video: 120, note: "Few items: each one gets its own beat." },
  { items: { min: 4, max: 6 }, functional_ui: 30, product_video: 90, note: "Lists and card rows." },
  { items: { min: 7, max: 12 }, functional_ui: 20, product_video: 60, note: "Dense lists; the cascade reads as one gesture." },
  { items: { min: 13, max: null }, functional_ui: "computed", product_video: "computed", note: "Long lists: perItem = (sequenceCap - itemDuration) / (n - 1), floored at 8 ms (UI) / 40 ms (video); cap 500 ms (UI) / 2000 ms (video)." },
];

/** Minimum per-item stagger when the sequence is capped. */
export const STAGGER_FLOOR_MS: Record<Register, number> = { functional_ui: 8, product_video: 40 };

export interface StaggerResult {
  itemCount: number;
  register: Register;
  perItemMs: number;
  /** Total choreographed sequence: last item's end. */
  sequenceMs: number;
  capMs: number;
  /** True when the cap forced the per-item value below the table value. */
  capped: boolean;
  rule: string;
}

export function staggerFor(itemCount: number, register: Register = "product_video", itemDurationMs = 300): StaggerResult {
  const n = Math.max(1, Math.floor(Number(itemCount) || 1));
  const cap = REGISTERS[register].stagger.sequenceCapMs;
  const floor = STAGGER_FLOOR_MS[register];
  if (n === 1) return { itemCount: 1, register, perItemMs: 0, sequenceMs: itemDurationMs, capMs: cap, capped: false, rule: "Single item: no stagger." };
  const row = STAGGER_TABLE.find((r) => n >= r.items.min && (r.items.max === null || n <= r.items.max)) ?? STAGGER_TABLE[STAGGER_TABLE.length - 1];
  const tableValue = row[register];
  let perItem: number;
  let rule: string;
  if (tableValue === "computed") {
    perItem = Math.max(floor, Math.floor((cap - itemDurationMs) / (n - 1)));
    rule = `n=${n}: (cap ${cap} - item ${itemDurationMs}) / ${n - 1}, floor ${floor} ms`;
  } else {
    perItem = tableValue;
    rule = `n=${n} (${row.items.min}${row.items.max === null ? "+" : `–${row.items.max}`} items): ${tableValue} ms per item`;
  }
  let capped = false;
  const total = (n - 1) * perItem + itemDurationMs;
  if (total > cap) {
    perItem = Math.max(floor, Math.floor((cap - itemDurationMs) / (n - 1)));
    capped = true;
    rule += ` → capped so the sequence stays ≤ ${cap} ms`;
  }
  return { itemCount: n, register, perItemMs: perItem, sequenceMs: (n - 1) * perItem + itemDurationMs, capMs: cap, capped, rule };
}

export const STAGGER_ATTRIBUTION = [
  "Per-item values are a house synthesis of Carbon (Apache-2.0) and Material 3 (CC BY 4.0, Material Design, Google) stagger guidance and Silia production values (letter_stagger 32 ms).",
];
