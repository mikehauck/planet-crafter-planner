// No "server-only" and no Next imports: scripts run this under tsx with their own client.
import type { PrismaClient } from "@/generated/prisma/client";
import type { Catalog } from "./schema";

/** All items with their recipes, uncached. */
export async function loadCatalog(db: PrismaClient): Promise<Catalog> {
  const items = await db.item.findMany({
    orderBy: { name: "asc" },
    include: { ingredients: { select: { ingredientId: true, qty: true } } },
  });

  const catalog: Catalog = {};
  for (const i of items) {
    catalog[i.id] = {
      id: i.id,
      name: i.name,
      type: i.type,
      categories: i.categories,
      retired: i.retiredAt !== null,
      recipe: Object.fromEntries(i.ingredients.map((r) => [r.ingredientId, r.qty])),
    };
  }
  return catalog;
}
