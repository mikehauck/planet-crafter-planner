"use client";
import { useEffect, useRef, useState } from "react";
import * as actions from "@/app/plans/actions";
import type { NamedPlan } from "@/services/plans/schema";
import { DEFAULT_NAME, useActiveId, type PlanStore } from "@/lib/plan-store";

/** Stands in until the account has a plan; the first change creates it for real. */
const PLACEHOLDER_ID = "";
/** Holding the stepper fires a change per step; save the quantity once it settles. */
const QTY_SAVE_DELAY_MS = 400;

/** Plans saved in the signed-in account. Changes show at once and save in the background. */
export function useAccountPlans(initial: NamedPlan[]): PlanStore & { addPlans(added: NamedPlan[]): void } {
  const [plans, setPlans] = useState<NamedPlan[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useActiveId();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const creating = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const shown = plans.length ? plans : [{ id: PLACEHOLDER_ID, name: DEFAULT_NAME, items: {} }];
  const active = shown.find((p) => p.id === activeId) ?? shown[0];

  const setItems = (planId: string, change: (items: NamedPlan["items"]) => NamedPlan["items"]) =>
    setPlans((ps) => ps.map((p) => (p.id === planId ? { ...p, items: change(p.items) } : p)));
  const report = (r: actions.ActionResult<unknown>) => {
    if (!r.ok) setError(r.error);
    return r.ok ? null : r.error;
  };

  /** The active plan's real id, creating "My plan" first if the account has none. */
  async function activePlanId(): Promise<string | null> {
    if (active.id !== PLACEHOLDER_ID) return active.id;
    creating.current ??= actions.createPlan(DEFAULT_NAME).then((r) => {
      if (!r.ok) return report(r), null;
      // Keep what was added to the placeholder while the plan was being created.
      setPlans((ps) => [{ ...r.data, items: ps.find((p) => p.id === PLACEHOLDER_ID)?.items ?? {} }]);
      setActiveId(r.data.id);
      return r.data.id;
    });
    return creating.current;
  }

  function saveQty(itemId: string, qty: number) {
    const key = `${active.id}:${itemId}`;
    clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      setTimeout(async () => {
        timers.current.delete(key);
        const planId = await activePlanId();
        if (planId) report(await actions.setItemQty(planId, itemId, qty));
      }, QTY_SAVE_DELAY_MS),
    );
  }

  return {
    plans: shown,
    active,
    error,
    select: setActiveId,
    addPlans(added) {
      if (!added.length) return;
      // An untouched placeholder gives way to the imported plans.
      setPlans((ps) => [...ps.filter((p) => p.id !== PLACEHOLDER_ID), ...added]);
      setActiveId(added[0].id);
    },
    async create(name) {
      const r = await actions.createPlan(name);
      if (!r.ok) return r.error;
      setPlans((ps) => [...ps, r.data]);
      setActiveId(r.data.id);
      return null;
    },
    async rename(id, name) {
      if (id === PLACEHOLDER_ID) {
        const r = await actions.createPlan(name);
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
      setPlans((ps) => ps.filter((p) => p.id !== id));
      return null;
    },
    add(itemId) {
      if (active.items[itemId]) return;
      setItems(active.id, (items) => ({ ...items, [itemId]: 1 }));
      if (active.id === PLACEHOLDER_ID) setPlans([{ ...active, items: { [itemId]: 1 } }]);
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
