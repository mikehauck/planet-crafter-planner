// Cross-checks on the catalog. Pure: callers load the data and decide what to print.
import { directTotals, rawTotals } from "@/lib/plan";
import type { Catalog, Plan, SeedRow } from "./schema";

/** Default plan for verifyTotals: deep recipes with shared components. */
export const TEST_PLAN: Plan = { OreExtractor2: 2, Drone1: 3, Heater2: 1 };

type Totals = Record<string, number>; // item name -> qty
export type TotalsCheck = {
  ok: boolean;
  app: { raw: Totals; direct: Totals };
  expected: { raw: Totals; direct: Totals };
};

/** Compare the app's totals over `catalog` (from the database) with a separate expansion of the seed rows. */
export function verifyTotals(catalog: Catalog, seed: SeedRow[], plan: Plan = TEST_PLAN): TotalsCheck {
  const byName = (t: Totals) => Object.fromEntries(Object.entries(t).map(([id, q]) => [catalog[id]?.name ?? id, q]));
  const app = { raw: byName(rawTotals(catalog, plan)), direct: byName(directTotals(catalog, plan)) };

  const rows = new Map(seed.map((r) => [r.id, r]));
  const raw: Totals = {};
  const expand = (id: string, q: number) => {
    const r = rows.get(id)!;
    const parts = Object.entries(r.recipe);
    if (!parts.length) raw[r.name] = (raw[r.name] ?? 0) + q;
    for (const [j, k] of parts) expand(j, q * k);
  };
  const direct: Totals = {};
  for (const [id, q] of Object.entries(plan)) {
    expand(id, q);
    for (const [j, k] of Object.entries(rows.get(id)!.recipe)) {
      const name = rows.get(j)!.name;
      direct[name] = (direct[name] ?? 0) + q * k;
    }
  }

  const same = (a: Totals, b: Totals) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  return { ok: same(app.raw, raw) && same(app.direct, direct), app, expected: { raw, direct } };
}
