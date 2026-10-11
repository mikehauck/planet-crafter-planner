// Check the app's totals (lib/plan.ts over the database) against a separate expansion of prisma/data/items.json.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { verifyTotals } from "../services/catalog/checks";
import { loadCatalog } from "../services/catalog/load";
import { SeedFile } from "../services/catalog/schema";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const catalog = await loadCatalog(db);
await db.$disconnect();
const seed = SeedFile.parse(JSON.parse(readFileSync("prisma/data/items.json", "utf8")));

const result = verifyTotals(catalog, seed);
console.log("totals:", result.app.raw);
console.log("direct:", result.app.direct);
if (result.ok) console.log("MATCH");
else {
  console.log("MISMATCH, expected", result.expected.raw, result.expected.direct);
  process.exit(1);
}
