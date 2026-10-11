// Shape of the game data. No server code here: the browser imports these too.
import { z } from "zod";

const itemId = z.string().min(1);
const count = z.number().int().min(1);

/** ingredient id -> qty per one item; empty for raw resources */
export const Recipe = z.record(itemId, count);

const ItemData = z.object({
  id: itemId,
  name: z.string().min(1),
  type: z.string().min(1),
  /** what it produces, e.g. ["Energy"]; empty for most items */
  categories: z.array(z.string()),
  recipe: Recipe,
});

/** One item as the app uses it. */
export const CatalogItem = ItemData.extend({
  /** no longer in the game data: hidden from search, still shown and totalled in plans */
  retired: z.boolean(),
});
export type CatalogItem = z.infer<typeof CatalogItem>;

export const Catalog = z.record(itemId, CatalogItem);
export type Catalog = z.infer<typeof Catalog>;

/** One row of prisma/data/items.json, as scripts/extract writes it. */
export const SeedRow = ItemData.extend({
  /** comma-separated planets this unlocks on; empty means every planet */
  planet: z.string(),
});
export type SeedRow = z.infer<typeof SeedRow>;

/** The whole seed file. Ids and names are unique, every recipe points at an item that is in the file,
 *  and no recipe needs itself further down (the totals would never finish). */
export const SeedFile = z.array(SeedRow).superRefine((rows, ctx) => {
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== rows.length) ctx.addIssue({ code: "custom", message: "duplicate item ids" });
  const names = new Map<string, string>();
  for (const r of rows) {
    const other = names.get(r.name);
    if (other) ctx.addIssue({ code: "custom", message: `${other} and ${r.id} are both named "${r.name}"` });
    names.set(r.name, r.id);
  }
  for (const [i, r] of rows.entries())
    for (const ing of Object.keys(r.recipe))
      if (!ids.has(ing)) ctx.addIssue({ code: "custom", path: [i, "recipe", ing], message: `${r.id} uses unknown item ${ing}` });

  const recipes = new Map(rows.map((r) => [r.id, Object.keys(r.recipe)]));
  const done = new Set<string>();
  const visit = (id: string, path: string[]): void => {
    if (path.includes(id)) {
      ctx.addIssue({ code: "custom", message: `recipe loop: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}` });
      return;
    }
    if (done.has(id)) return;
    for (const ing of recipes.get(id) ?? []) visit(ing, [...path, id]);
    done.add(id);
  };
  for (const r of rows) visit(r.id, []);
});

/** item id -> how many you want to build */
export const Plan = z.record(itemId, count);
export type Plan = z.infer<typeof Plan>;
