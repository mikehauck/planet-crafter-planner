"use client";
import { useEffect, useRef, useState } from "react";
import * as actions from "@/app/plans/actions";
import type { NamedPlan } from "@/services/plans/schema";
import { activePlanKey, toggled, useWorkingPlan, type PlanStore } from "@/lib/plan-store";

/** Stands in, unnamed, until the account has a plan. Nothing can be added to it: the planner asks for a name first. */
const PLACEHOLDER_ID = "";
/** Holding the stepper fires a change per step; save the quantity once it settles. */
const QTY_SAVE_DELAY_MS = 400;

/** Plans saved in the signed-in account. Changes show at once and save in the background. */
export function useAccountPlans(userId: string, initial: NamedPlan[]): PlanStore & { addPlans(added: NamedPlan[]): void } {
  const [plans, setPlans] = useState<NamedPlan[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const shown = plans.length ? plans : [{ id: PLACEHOLDER_ID, name: "", items: {}, keepWhole: [], rawOnly: true }];
  const { active, ready, select: setActiveId, afterDelete } = useWorkingPlan(activePlanKey(userId), shown);

  const setItems = (planId: string, change: (items: NamedPlan["items"]) => NamedPlan["items"]) =>
    setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, items: change(p.items) } : p)));
  const report = (r: actions.ActionResult<unknown>) => {
    if (!r.ok) setError(r.error);
    return r.ok ? null : r.error;
  };

  function saveQty(itemId: string, qty: number) {
    if (active.id === PLACEHOLDER_ID) return;
    const planId = active.id;
    const key = `${planId}:${itemId}`;
    clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      setTimeout(async () => {
        timers.current.delete(key);
        report(await actions.setItemQty(planId, itemId, qty));
      }, QTY_SAVE_DELAY_MS),
    );
  }

  return {
    plans: shown,
    active,
    ready,
    namesRequired: true,
    error,
    select: setActiveId,
    addPlans(added) {
      if (!added.length) return;
      // An untouched placeholder gives way to the imported plans.
      setPlans((ps) => [...ps.filter((p) => p.id !== PLACEHOLDER_ID), ...added]);
      setActiveId(added[0].id);
    },
    async create(name, items = {}) {
      const r = await actions.createPlan(name, items);
      if (!r.ok) return r.error;
      setPlans((ps) => [...ps, r.data]);
      setActiveId(r.data.id);
      return null;
    },
    async rename(id, name) {
      if (id === PLACEHOLDER_ID) {
        const r = await actions.createPlan(name, {});
        if (!r.ok) return r.error;
        setPlans([r.data]);
        setActiveId(r.data.id);
        return null;
      }
      const r = await actions.renamePlan(id, name);
      if (!r.ok) return r.error;
      setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)));
      return null;
    },
    async remove(id) {
      if (plans.length < 2) return "You need at least one plan.";
      const r = await actions.deletePlan(id);
      if (!r.ok) return r.error;
      afterDelete(id);
      setPlans((ps) => ps.filter((p) => p.id !== id));
      return null;
    },
    add(itemId) {
      if (active.id === PLACEHOLDER_ID || active.items[itemId]) return;
      setItems(active.id, (items) => ({ ...items, [itemId]: 1 }));
      saveQty(itemId, 1);
    },
    setQty(itemId, qty) {
      const n = Math.max(1, Math.floor(qty) || 1);
      setItems(active.id, (items) => ({ ...items, [itemId]: n }));
      saveQty(itemId, n);
    },
    removeItem(itemId) {
      clearTimeout(timers.current.get(`${active.id}:${itemId}`));
      setItems(active.id, (items) => {
        const rest = { ...items };
        delete rest[itemId];
        return rest;
      });
      const planId = active.id;
      if (planId !== PLACEHOLDER_ID) void actions.removeItem(planId, itemId).then(report);
    },
    setKeepWhole(itemId, whole) {
      const planId = active.id;
      if (planId === PLACEHOLDER_ID) return;
      setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, keepWhole: toggled(p.keepWhole, itemId, whole) } : p)));
      void actions.setKeepWhole(planId, itemId, whole).then(report);
    },
    setRawOnly(rawOnly) {
      const planId = active.id;
      if (planId === PLACEHOLDER_ID) return;
      setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, rawOnly } : p)));
      void actions.setRawOnly(planId, rawOnly).then(report);
    },
    clear() {
      for (const [key, t] of timers.current)
        if (key.startsWith(`${active.id}:`)) {
          clearTimeout(t);
          timers.current.delete(key);
        }
      setItems(active.id, () => ({}));
      if (active.id !== PLACEHOLDER_ID) void actions.clearPlan(active.id).then(report);
    },
  };
}
