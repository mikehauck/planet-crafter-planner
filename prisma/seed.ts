// Load prisma/data/items.json (from scripts/extract) into the database, replacing what is there.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { SeedFile } from "../services/catalog/schema";

// Validate before touching the database: a bad file must not wipe the tables.
const rows = SeedFile.parse(JSON.parse(readFileSync(new URL("./data/items.json", import.meta.url), "utf8")));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  await db.$transaction([
    db.recipeIngredient.deleteMany(),
    db.item.deleteMany(),
    db.item.createMany({ data: rows.map(({ id, name, type, planet, categories }) => ({ id, name, type, planet, categories })) }),
    db.recipeIngredient.createMany({
      data: rows.flatMap((r) =>
        Object.entries(r.recipe).map(([ingredientId, qty]) => ({ itemId: r.id, ingredientId, qty })),
      ),
    }),
  ]);
  console.log(`seeded ${await db.item.count()} items, ${await db.recipeIngredient.count()} recipe lines`);
}

main().finally(() => db.$disconnect());
