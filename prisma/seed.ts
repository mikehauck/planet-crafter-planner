// Reconcile the database with prisma/data/items.json (from scripts/extract). Never deletes items: plans point at them.
// `pnpm db:seed -- --dry-run` prints what would change without writing.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { applyReconcile, formatReport, hasChanges, loadStoredItems, planReconcile } from "../services/catalog/reconcile";
import { SeedFile } from "../services/catalog/schema";

const dryRun = process.argv.includes("--dry-run");
// Validate before touching the database.
const rows = SeedFile.parse(JSON.parse(readFileSync(new URL("./data/items.json", import.meta.url), "utf8")));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const report = planReconcile(await loadStoredItems(db), rows);
  console.log(formatReport(report));
  if (dryRun) console.log("dry run: nothing written");
  else if (hasChanges(report)) {
    await applyReconcile(db, report);
    console.log("applied");
  }
}

main().finally(() => db.$disconnect());
