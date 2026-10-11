// Pure planning maths, shared by the page and services/catalog/checks.ts.
import type { Catalog, Plan } from "@/services/catalog/schema";

export type { Catalog, CatalogItem, Plan } from "@/services/catalog/schema";

/** Items in `whole` count as themselves: you will have them, so they are not broken down. */
type Whole = ReadonlySet<string>;
const none: Whole = new Set();

/** One level down: the ingredients the planned items' own recipes call for. Raw items count as themselves. */
export function directTotals(catalog: Catalog, plan: Plan, whole: Whole = none): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [id, qty] of Object.entries(plan)) {
    const item = catalog[id];
    if (!item || qty <= 0) continue;
    const parts = whole.has(id) ? [] : Object.entries(item.recipe);
    if (parts.length === 0) totals[id] = (totals[id] ?? 0) + qty;
    for (const [ing, per] of parts) totals[ing] = (totals[ing] ?? 0) + qty * per;
  }
  return totals;
}

/** Expand a plan down to raw resources (items with no recipe) and kept-whole items. Returns item id -> total qty. */
export function rawTotals(catalog: Catalog, plan: Plan, whole: Whole = none): Record<string, number> {
  const totals: Record<string, number> = {};
  const add = (id: string, qty: number) => {
    const item = catalog[id];
    if (!item) return;
    const parts = whole.has(id) ? [] : Object.entries(item.recipe);
    if (parts.length === 0) {
      totals[id] = (totals[id] ?? 0) + qty;
      return;
    }
    for (const [ing, per] of parts) add(ing, qty * per);
  };
  for (const [id, qty] of Object.entries(plan)) if (qty > 0) add(id, qty);
  return totals;
}
