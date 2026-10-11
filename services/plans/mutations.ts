import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { uniqueName, type NamedPlan } from "./schema";

/** A failure the user can act on; the message is shown to them. */
export class PlanError extends Error {}

type Tx = Prisma.TransactionClient;

/** Throws unless `planId` belongs to `userId`. Someone else's plan looks the same as a missing one. */
async function ownPlan(tx: Tx, userId: string, planId: string) {
  const plan = await tx.plan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  if (!plan) throw new PlanError("That plan no longer exists.");
}

const isNameClash = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** New empty plan. A taken name gets -1, -2...; the name actually used is returned. */
export async function createPlan(userId: string, name: string): Promise<NamedPlan> {
  return db.$transaction(async (tx) => {
    const taken = await tx.plan.findMany({ where: { userId }, select: { name: true } });
    const plan = await tx.plan.create({ data: { userId, name: uniqueName(name, taken.map((p) => p.name)) } });
    return { id: plan.id, name: plan.name, items: {} };
  });
}

export async function renamePlan(userId: string, planId: string, name: string): Promise<void> {
  try {
    const { count } = await db.plan.updateMany({ where: { id: planId, userId }, data: { name } });
    if (!count) throw new PlanError("That plan no longer exists.");
  } catch (e) {
    if (isNameClash(e)) throw new PlanError(`You already have a plan called "${name}".`);
    throw e;
  }
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const { count } = await db.plan.deleteMany({ where: { id: planId, userId } });
  if (!count) throw new PlanError("That plan no longer exists.");
}

/** Add an item or change its quantity. Retired items can stay in a plan but cannot be added again. */
export async function setItemQty(userId: string, planId: string, itemId: string, qty: number): Promise<void> {
  await db.$transaction(async (tx) => {
    await ownPlan(tx, userId, planId);
    const item = await tx.item.findUnique({ where: { id: itemId }, select: { retiredAt: true } });
    if (!item) throw new PlanError("That item is not in the game data.");
    const key = { planId_itemId: { planId, itemId } };
    if (item.retiredAt && !(await tx.planItem.findUnique({ where: key })))
      throw new PlanError("That item is no longer in the game.");
    await tx.planItem.upsert({ where: key, create: { planId, itemId, qty }, update: { qty } });
  });
}

export async function removeItem(userId: string, planId: string, itemId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await ownPlan(tx, userId, planId);
    await tx.planItem.deleteMany({ where: { planId, itemId } });
  });
}

export async function clearPlan(userId: string, planId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await ownPlan(tx, userId, planId);
    await tx.planItem.deleteMany({ where: { planId } });
  });
}
