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
});
export type NamedPlan = z.infer<typeof NamedPlan>;

/** `name`, or `name-1`, `name-2`... : the first one not in `taken`. */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 1; ; n++) if (!used.has(`${name}-${n}`)) return `${name}-${n}`;
}
