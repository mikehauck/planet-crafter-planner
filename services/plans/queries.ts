import "server-only";
import { db } from "@/lib/db";
import type { NamedPlan } from "./schema";

/** A user's plans with their items, oldest first. */
export async function listPlans(userId: string): Promise<NamedPlan[]> {
  const plans = await db.plan.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { items: { select: { itemId: true, qty: true } } },
  });
  return plans.map((p) => ({ id: p.id, name: p.name, items: Object.fromEntries(p.items.map((i) => [i.itemId, i.qty])) }));
}
