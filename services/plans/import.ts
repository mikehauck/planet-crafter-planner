// Moving browser plans into an account. Pure: the dialog previews with it, the server applies it.
import type { Plan } from "@/services/catalog/schema";
import { uniqueName } from "./schema";

export type IncomingPlan = { name: string; items: Plan; keepWhole: string[] };
export type ImportPreview = {
  /** in order: the browser plan's name, the name it will get, the items that go across */
  plans: { from: string; name: string; items: Plan; keepWhole: string[] }[];
  /** item ids not in the game data at all; retired items still go across */
  dropped: { plan: string; itemId: string }[];
};

/** Names that clash with the account (or each other) get -1, -2...; unknown items are dropped; empty plans are skipped. */
export function previewImport(incoming: IncomingPlan[], accountNames: string[], knownItem: (id: string) => boolean): ImportPreview {
  const taken = [...accountNames];
  const preview: ImportPreview = { plans: [], dropped: [] };
  for (const p of incoming) {
    const items: Plan = {};
    for (const [id, qty] of Object.entries(p.items))
      if (knownItem(id)) items[id] = qty;
      else preview.dropped.push({ plan: p.name, itemId: id });
    if (!Object.keys(items).length) continue;
    const name = uniqueName(p.name, taken);
    taken.push(name);
    preview.plans.push({ from: p.name, name, items, keepWhole: p.keepWhole.filter(knownItem) });
  }
  return preview;
}
