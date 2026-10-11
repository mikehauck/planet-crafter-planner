"use server";
// The planner's writes for signed-in users. Each action: who is asking, is the input valid, then the service.
import { z } from "zod";
import { logger } from "@/lib/logger";
import { requireUser } from "@/services/auth/queries";
import { Plan } from "@/services/catalog/schema";
import { PlanName, type NamedPlan } from "@/services/plans/schema";
import * as plans from "@/services/plans/mutations";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

const id = z.string().min(1);
const qty = z.number().int().min(1);

async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await requireUser();
  try {
    return { ok: true, data: await fn(user.id) };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input." };
    if (e instanceof plans.PlanError) return { ok: false, error: e.message };
    logger.error({ err: e, userId: user.id }, "plan action failed");
    return { ok: false, error: "Could not save. Reload the page and try again." };
  }
}

export async function createPlan(name: string, items: unknown = {}): Promise<ActionResult<NamedPlan>> {
  return run((u) => plans.createPlan(u, PlanName.parse(name), Plan.parse(items)));
}

export async function renamePlan(planId: string, name: string): Promise<ActionResult> {
  return run((u) => plans.renamePlan(u, id.parse(planId), PlanName.parse(name)));
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  return run((u) => plans.deletePlan(u, id.parse(planId)));
}

export async function setItemQty(planId: string, itemId: string, n: number): Promise<ActionResult> {
  return run((u) => plans.setItemQty(u, id.parse(planId), id.parse(itemId), qty.parse(n)));
}

export async function removeItem(planId: string, itemId: string): Promise<ActionResult> {
  return run((u) => plans.removeItem(u, id.parse(planId), id.parse(itemId)));
}

export async function setKeepWhole(planId: string, itemId: string, whole: boolean): Promise<ActionResult> {
  return run((u) => plans.setKeepWhole(u, id.parse(planId), id.parse(itemId), z.boolean().parse(whole)));
}

export async function setRawOnly(planId: string, rawOnly: boolean): Promise<ActionResult> {
  return run((u) => plans.setRawOnly(u, id.parse(planId), z.boolean().parse(rawOnly)));
}

export async function clearPlan(planId: string): Promise<ActionResult> {
  return run((u) => plans.clearPlan(u, id.parse(planId)));
}

const Incoming = z.array(z.object({ name: PlanName, items: Plan, keepWhole: z.array(id).default([]), rawOnly: z.boolean().default(true) })).max(100);

/** Move the browser's plans into the account; returns the plans as created. */
export async function importPlans(incoming: unknown): Promise<ActionResult<NamedPlan[]>> {
  return run((u) => plans.importPlans(u, Incoming.parse(incoming)));
}
