// Named plans. No server code here: the browser imports these too.
import { z } from "zod";
import { Plan } from "@/services/catalog/schema";

export const PlanName = z.string().trim().min(1, "Give the plan a name").max(60, "60 characters at most");

/** A plan with its items, as both stores hand it to the planner. */
export const NamedPlan = z.object({
  id: z.string().min(1),
  name: PlanName,
  /** item id -> qty */
  items: Plan,
  /** item ids counted as themselves in the totals, not broken down. Missing in plans saved before it existed. */
  keepWhole: z.array(z.string().min(1)).default([]),
  /** totals drawer: raw resources (true) or one level down. Missing in plans saved before it existed. */
  rawOnly: z.boolean().default(true),
});
export type NamedPlan = z.infer<typeof NamedPlan>;

/** A plan in the browser may be unnamed (name ""): the one you start in. It is named before a second plan
 *  is made or it moves into an account; plans in the database always have a name. */
export const LocalPlan = NamedPlan.extend({ name: z.union([PlanName, z.literal("")]) });

/** What to show for a plan's name. */
export const planLabel = (p: { name: string }) => p.name || "Unnamed plan";

/** `name`, or `name-1`, `name-2`... : the first one not in `taken`. */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 1; ; n++) if (!used.has(`${name}-${n}`)) return `${name}-${n}`;
}
