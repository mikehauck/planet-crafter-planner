// Cross-checks on the catalog. Pure: callers load the data and decide what to print.
import { directTotals, rawTotals } from "@/lib/plan";
import { hasChanges, planReconcile, type StoredItem } from "./reconcile";
import { SeedFile, type Catalog, type Plan, type SeedRow } from "./schema";

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

/** Cases the reconciler must get right, run on copies of the seed rows. Returns the failures; empty means all passed. */
export function checkReconcile(seed: SeedRow[]): string[] {
  const failures: string[] = [];
  const expect = (name: string, ok: boolean) => ok || failures.push(name);
  const stored = (rows: SeedRow[], retired: string[] = []): StoredItem[] =>
    rows.map((r) => ({ ...structuredClone(r), retired: retired.includes(r.id) }));
  const withRaw = seed.find((r) => Object.keys(r.recipe).length)!;
  const [first, second] = seed;

  const same = planReconcile(stored(seed), seed);
  expect("unchanged file: nothing to do", !hasChanges(same) && same.unchanged === seed.length);

  const edited = seed.map((r) => (r.id === withRaw.id ? { ...r, recipe: { ...r.recipe, [first.id]: 99 } } : r));
  const changed = planReconcile(stored(seed), edited);
  expect("changed recipe: one change, recipe only", changed.changed.length === 1 && Object.keys(changed.changed[0].diff).join() === "recipe");

  const removed = planReconcile(stored(seed), seed.filter((r) => r.id !== second.id));
  expect("removed item: retired, not deleted", removed.retired.length === 1 && removed.retired[0].id === second.id && removed.added.length === 0);

  const back = planReconcile(stored(seed, [second.id]), seed);
  expect("re-added item: restored with no other diff", back.restored.length === 1 && Object.keys(back.restored[0].diff).length === 0);

  const reused = [...seed.filter((r) => r.id !== second.id), { ...second, id: `${second.id}_New` }];
  const reuse = planReconcile(stored(seed, [second.id]), reused);
  expect("name reused by a new id: added, old one stays retired", reuse.added.length === 1 && reuse.retired.length === 0 && reuse.restored.length === 0);
  expect("seed file: duplicate names rejected", !SeedFile.safeParse([...seed, { ...first, id: `${first.id}_Dup` }]).success);
  const loop = seed.map((r) => (r.id === withRaw.id ? { ...r, recipe: { ...r.recipe, [r.id]: 1 } } : r));
  expect("seed file: recipe loop rejected", !SeedFile.safeParse(loop).success);
  expect("seed file: real data accepted", SeedFile.safeParse(seed).success);
  expect("seed file: unknown ingredient rejected", !SeedFile.safeParse([{ ...first, recipe: { NoSuchItem: 1 } }]).success);

  return failures;
}
