// Check the app's totals (lib/plan.ts over the database) against a separate expansion of prisma/data/items.json.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { directTotals, rawTotals, type Catalog } from "../lib/plan";

const TEST = { OreExtractor2: 2, Drone1: 3, Heater2: 1 };

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const items = await db.item.findMany({ include: { ingredients: true } });
await db.$disconnect();
const catalog: Catalog = Object.fromEntries(
  items.map((i) => [
    i.id,
    { id: i.id, name: i.name, type: i.type, categories: i.categories, recipe: Object.fromEntries(i.ingredients.map((r) => [r.ingredientId, r.qty])) },
  ]),
);
const app = Object.fromEntries(Object.entries(rawTotals(catalog, TEST)).map(([id, q]) => [catalog[id].name, q]));

type Row = { id: string; name: string; recipe: Record<string, number> };
const data = new Map<string, Row>(
  (JSON.parse(readFileSync("prisma/data/items.json", "utf8")) as Row[]).map((r) => [r.id, r]),
);
const expected: Record<string, number> = {};
function expand(id: string, q: number) {
  const r = data.get(id)!;
  const parts = Object.entries(r.recipe);
  if (!parts.length) expected[r.name] = (expected[r.name] ?? 0) + q;
  for (const [j, k] of parts) expand(j, q * k);
}
for (const [id, q] of Object.entries(TEST)) expand(id, q);

// one level down, straight from the seed data
const expectedDirect: Record<string, number> = {};
for (const [id, q] of Object.entries(TEST))
  for (const [j, k] of Object.entries(data.get(id)!.recipe)) {
    const name = data.get(j)!.name;
    expectedDirect[name] = (expectedDirect[name] ?? 0) + q * k;
  }
const appDirect = Object.fromEntries(Object.entries(directTotals(catalog, TEST)).map(([id, q]) => [catalog[id].name, q]));

const sorted = (o: Record<string, number>) => JSON.stringify(Object.entries(o).sort());
console.log("totals:", app);
console.log("direct:", appDirect);
if (sorted(app) === sorted(expected) && sorted(appDirect) === sorted(expectedDirect)) console.log("MATCH");
else {
  console.log("MISMATCH, expected", expected, expectedDirect);
  process.exit(1);
}
