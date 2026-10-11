// Bring the items table in line with a game data import without deleting anything plans may point at.
// No "server-only": prisma/seed.ts runs this under tsx with its own client.
import type { PrismaClient } from "@/generated/prisma/client";
import type { SeedRow } from "./schema";

/** An item as stored, in seed-row shape. */
export type StoredItem = SeedRow & { retired: boolean };

type FieldDiff = Record<string, { from: unknown; to: unknown }>;

export type ReconcileReport = {
  /** new ids */
  added: SeedRow[];
  /** in the database and the file, with different data */
  changed: { row: SeedRow; diff: FieldDiff }[];
  /** retired earlier, back in the file; diff is empty when nothing else changed */
  restored: { row: SeedRow; diff: FieldDiff }[];
  /** in the database, missing from the file: kept, marked retired */
  retired: { id: string; name: string }[];
  unchanged: number;
};

export async function loadStoredItems(db: PrismaClient): Promise<StoredItem[]> {
  const items = await db.item.findMany({ include: { ingredients: { select: { ingredientId: true, qty: true } } } });
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    planet: i.planet,
    categories: i.categories,
    recipe: Object.fromEntries(i.ingredients.map((r) => [r.ingredientId, r.qty])),
    retired: i.retiredAt !== null,
  }));
}

// Recipes compare as sets of lines; everything else compares as-is.
const norm = (field: keyof SeedRow, v: unknown) =>
  JSON.stringify(field === "recipe" ? Object.entries(v as Record<string, number>).sort() : v);
const FIELDS = ["name", "type", "planet", "categories", "recipe"] as const;

function diff(stored: StoredItem, row: SeedRow): FieldDiff {
  const d: FieldDiff = {};
  for (const f of FIELDS) if (norm(f, stored[f]) !== norm(f, row[f])) d[f] = { from: stored[f], to: row[f] };
  return d;
}

/** Work out what an import would do. Pure. `rows` must already have passed SeedFile. */
export function planReconcile(stored: StoredItem[], rows: SeedRow[]): ReconcileReport {
  const byId = new Map(stored.map((s) => [s.id, s]));
  const report: ReconcileReport = { added: [], changed: [], restored: [], retired: [], unchanged: 0 };
  for (const row of rows) {
    const s = byId.get(row.id);
    if (!s) report.added.push(row);
    else if (s.retired) report.restored.push({ row, diff: diff(s, row) });
    else {
      const d = diff(s, row);
      if (Object.keys(d).length) report.changed.push({ row, diff: d });
      else report.unchanged++;
    }
  }
  const inFile = new Set(rows.map((r) => r.id));
  for (const s of stored) if (!s.retired && !inFile.has(s.id)) report.retired.push({ id: s.id, name: s.name });
  return report;
}

export const hasChanges = (r: ReconcileReport) =>
  r.added.length + r.changed.length + r.restored.length + r.retired.length > 0;

/** Apply a report in one transaction. Items are written before recipe lines so new ingredients exist first. */
export async function applyReconcile(db: PrismaClient, report: ReconcileReport): Promise<void> {
  const fields = ({ name, type, planet, categories }: SeedRow) => ({ name, type, planet, categories });
  const recipeLines = (r: SeedRow) =>
    Object.entries(r.recipe).map(([ingredientId, qty]) => ({ itemId: r.id, ingredientId, qty }));
  const updates = [...report.changed, ...report.restored];
  const newRecipes = [...report.added, ...updates.filter((u) => "recipe" in u.diff).map((u) => u.row)];

  await db.$transaction(
    async (tx) => {
      await tx.item.createMany({ data: report.added.map((r) => ({ id: r.id, ...fields(r) })) });
      for (const { row } of updates) await tx.item.update({ where: { id: row.id }, data: { ...fields(row), retiredAt: null } });
      await tx.item.updateMany({ where: { id: { in: report.retired.map((r) => r.id) } }, data: { retiredAt: new Date() } });
      await tx.recipeIngredient.deleteMany({ where: { itemId: { in: newRecipes.map((r) => r.id) } } });
      await tx.recipeIngredient.createMany({ data: newRecipes.flatMap(recipeLines) });
    },
    { timeout: 60_000 },
  );
}

/** Human-readable report, one line per item. */
export function formatReport(r: ReconcileReport): string {
  const show = (d: FieldDiff) =>
    Object.entries(d)
      .map(([f, { from, to }]) => `${f}: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`)
      .join("; ");
  return [
    `added ${r.added.length}, changed ${r.changed.length}, restored ${r.restored.length}, retired ${r.retired.length}, unchanged ${r.unchanged}`,
    ...r.added.map((a) => `  + ${a.id} (${a.name})`),
    ...r.changed.map((c) => `  ~ ${c.row.id} (${c.row.name}): ${show(c.diff)}`),
    ...r.restored.map((c) => `  ^ ${c.row.id} (${c.row.name}) back in the game${Object.keys(c.diff).length ? `: ${show(c.diff)}` : ""}`),
    ...r.retired.map((x) => `  - ${x.id} (${x.name}) retired`),
  ].join("\n");
}
