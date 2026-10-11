// Pure planning maths, shared by the page and scripts/verify-totals.mts.

export type CatalogItem = {
  id: string;
  name: string;
  type: string;
  /** what it produces, e.g. ["Energy"]; empty for most items */
  categories: string[];
  /** ingredient id -> qty per one of this item; empty for raw resources */
  recipe: Record<string, number>;
};

export type Catalog = Record<string, CatalogItem>;

/** plan: item id -> how many you want to build */
export type Plan = Record<string, number>;

/** One level down: the ingredients the planned items' own recipes call for. Raw items count as themselves. */
export function directTotals(catalog: Catalog, plan: Plan): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [id, qty] of Object.entries(plan)) {
    const item = catalog[id];
    if (!item || qty <= 0) continue;
    const parts = Object.entries(item.recipe);
    if (parts.length === 0) totals[id] = (totals[id] ?? 0) + qty;
    for (const [ing, per] of parts) totals[ing] = (totals[ing] ?? 0) + qty * per;
  }
  return totals;
}

/** Expand a plan down to raw resources (items with no recipe). Returns resource id -> total qty. */
export function rawTotals(catalog: Catalog, plan: Plan): Record<string, number> {
  const totals: Record<string, number> = {};
  const add = (id: string, qty: number) => {
    const item = catalog[id];
    if (!item) return;
    const parts = Object.entries(item.recipe);
    if (parts.length === 0) {
      totals[id] = (totals[id] ?? 0) + qty;
      return;
    }
    for (const [ing, per] of parts) add(ing, qty * per);
  };
  for (const [id, qty] of Object.entries(plan)) if (qty > 0) add(id, qty);
  return totals;
}
