import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Catalog } from "@/lib/plan";

/** All items with their recipes. Game data only changes on a re-import, so cache it. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const items = await db.item.findMany({
    orderBy: { name: "asc" },
    include: { ingredients: { select: { ingredientId: true, qty: true } } },
  });
  logger.info({ items: items.length }, "catalog loaded");

  const catalog: Catalog = {};
  for (const i of items) {
    catalog[i.id] = {
      id: i.id,
      name: i.name,
      type: i.type,
      categories: i.categories,
      recipe: Object.fromEntries(i.ingredients.map((r) => [r.ingredientId, r.qty])),
    };
  }
  return catalog;
}
