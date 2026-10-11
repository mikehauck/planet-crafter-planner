// Shape of the game data. No server code here: the browser imports these too.
import { z } from "zod";

const itemId = z.string().min(1);
const count = z.number().int().min(1);

/** ingredient id -> qty per one item; empty for raw resources */
export const Recipe = z.record(itemId, count);

/** One item as the app uses it. */
export const CatalogItem = z.object({
  id: itemId,
  name: z.string().min(1),
  type: z.string().min(1),
  /** what it produces, e.g. ["Energy"]; empty for most items */
  categories: z.array(z.string()),
  recipe: Recipe,
});
export type CatalogItem = z.infer<typeof CatalogItem>;

export const Catalog = z.record(itemId, CatalogItem);
export type Catalog = z.infer<typeof Catalog>;

/** One row of prisma/data/items.json, as scripts/extract writes it. */
export const SeedRow = CatalogItem.extend({
  /** comma-separated planets this unlocks on; empty means every planet */
  planet: z.string(),
});
export type SeedRow = z.infer<typeof SeedRow>;

/** The whole seed file. Every recipe must point at an item that is in the file. */
export const SeedFile = z.array(SeedRow).superRefine((rows, ctx) => {
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) ctx.addIssue({ code: "custom", message: "duplicate item ids" });
  for (const [i, r] of rows.entries())
    for (const ing of Object.keys(r.recipe))
      if (!ids.has(ing)) ctx.addIssue({ code: "custom", path: [i, "recipe", ing], message: `${r.id} uses unknown item ${ing}` });
});

/** item id -> how many you want to build */
export const Plan = z.record(itemId, count);
export type Plan = z.infer<typeof Plan>;
