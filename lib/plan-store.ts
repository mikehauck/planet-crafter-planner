"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Plan } from "@/services/catalog/schema";
import { LocalPlan, PlanName, uniqueName, type NamedPlan } from "@/services/plans/schema";

/** What the planner needs from wherever plans are kept: this browser, or the signed-in account. */
export type PlanStore = {
  plans: NamedPlan[];
  /** always set: a store with no plans yet offers an empty unnamed plan (name "") */
  active: NamedPlan;
  /** false until the browser's storage has been read (server render and hydration): show a skeleton, not a plan */
  ready: boolean;
  /** true when plans are saved to the account, so an unnamed plan must be named before anything is added */
  namesRequired: boolean;
  select(id: string): void;
  /** These resolve to an error message for the user, or null. `items` start the new plan off. */
  create(name: string, items?: Plan): Promise<string | null>;
  rename(id: string, name: string): Promise<string | null>;
  remove(id: string): Promise<string | null>;
  add(itemId: string): void;
  setQty(itemId: string, qty: number): void;
  removeItem(itemId: string): void;
  /** Count an item as itself in the totals (`whole`), or break it down again. */
  setKeepWhole(itemId: string, whole: boolean): void;
  /** Totals drawer view: raw resources, or one level down. */
  setRawOnly(rawOnly: boolean): void;
  clear(): void;
  /** last failed background save, if any */
  error: string | null;
};

// localStorage, with a memory fallback when storage is blocked. One listener set for every key.
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string | null) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** A stored value; `undefined` until the browser has been read (the server has no localStorage). */
const NOT_READ = () => undefined;
const useStored = (key: string): string | null | undefined => useSyncExternalStore(subscribe, () => read(key), NOT_READ);

/** `ids` with `itemId` added (`whole`) or removed. */
export const toggled = (ids: string[], itemId: string, whole: boolean) => [...ids.filter((i) => i !== itemId), ...(whole ? [itemId] : [])];

/** Keep the valid entries of a stored item list; drop the rest. */
export function cleanItems(value: unknown): Plan {
  const items: Plan = {};
  if (!value || typeof value !== "object") return items;
  for (const [id, qty] of Object.entries(value)) {
    const entry = Plan.safeParse({ [id]: qty });
    if (entry.success) Object.assign(items, entry.data);
  }
  return items;
}

function parseJson(raw: string | null | undefined): unknown {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** The working plan, remembered per browser: one key for the browser's own plans, one per signed-in account. */
export const activePlanKey = (userId?: string) => (userId ? `planet-crafter:active-plan:${userId}` : "planet-crafter:active-plan");

/**
 * Which of `plans` is the working one. A missing or stale stored id falls back to the first plan; on page load
 * that fallback is also written back (only then: mid-session, a newly selected plan can briefly be missing from
 * `plans`, and writing back would undo the selection). `afterDelete(id)` moves to the plan that takes its place.
 */
export function useWorkingPlan(key: string, plans: NamedPlan[]) {
  const stored = useStored(key);
  const select = (id: string) => write(key, id);
  const active = plans.find((p) => p.id === stored) ?? plans[0];
  const ready = stored !== undefined;
  const checked = useRef(false);
  useEffect(() => {
    if (!ready || checked.current) return;
    checked.current = true;
    if (active.id && stored !== active.id) write(key, active.id);
  }, [ready, stored, active.id, key]);
  return {
    active,
    ready,
    select,
    afterDelete(id: string) {
      if (id !== active.id) return;
      const i = plans.findIndex((p) => p.id === id);
      const next = plans[i + 1] ?? plans[i - 1];
      if (next) select(next.id);
    },
  };
}

// --- Plans kept in this browser (signed out) ---

const PLANS_KEY = "planet-crafter:plans";
/** Before named plans: one plan. Read once into the unnamed plan and left in place, never written. */
const LEGACY_KEY = "planet-crafter:plan";
const LOCAL_DEFAULT_ID = "local-default";

/** The browser's plans as stored, without the empty default. Phase-C import reads this too. */
export function parseLocalPlans(raw: string | null | undefined, legacy: string | null | undefined): NamedPlan[] {
  const stored = parseJson(raw);
  if (Array.isArray(stored)) {
    const plans: NamedPlan[] = [];
    for (const p of stored) {
      const keepWhole = Array.isArray(p?.keepWhole) ? p.keepWhole.filter((id: unknown) => typeof id === "string" && id) : [];
      const rawOnly = typeof p?.rawOnly === "boolean" ? p.rawOnly : true;
      const plan = LocalPlan.safeParse({ ...p, items: cleanItems(p?.items), keepWhole, rawOnly });
      if (plan.success && !plans.some((q) => q.id === plan.data.id || q.name === plan.data.name)) plans.push(plan.data);
    }
    return plans;
  }
  const old = cleanItems(parseJson(legacy));
  return Object.keys(old).length ? [{ id: LOCAL_DEFAULT_ID, name: "", items: old, keepWhole: [], rawOnly: true }] : [];
}

const withDefault = (plans: NamedPlan[]) =>
  plans.length ? plans : [{ id: LOCAL_DEFAULT_ID, name: "", items: {}, keepWhole: [], rawOnly: true }];

export function useLocalPlans(): PlanStore {
  const raw = useStored(PLANS_KEY);
  const legacy = useStored(LEGACY_KEY);
  const plans = useMemo(() => withDefault(parseLocalPlans(raw, legacy)), [raw, legacy]);
  const { active, ready, select: setActiveId, afterDelete } = useWorkingPlan(activePlanKey(), plans);

  // Changes read storage afresh, so two in a row (name this plan, then make a new one) see each other.
  const latest = () => withDefault(parseLocalPlans(read(PLANS_KEY), read(LEGACY_KEY)));
  const save = (next: NamedPlan[]) => write(PLANS_KEY, JSON.stringify(next));
  const updatePlan = (change: (plan: NamedPlan) => NamedPlan) =>
    save(latest().map((p) => (p.id === active.id ? change(p) : p)));
  const update = (change: (items: Plan) => Plan) => updatePlan((p) => ({ ...p, items: change(p.items) }));

  return {
    plans,
    active,
    ready,
    namesRequired: false,
    error: null,
    select: setActiveId,
    async create(input, items = {}) {
      const name = PlanName.safeParse(input);
      if (!name.success) return name.error.issues[0].message;
      const now = latest();
      if (now.some((p) => !p.name)) return "Name your current plan first.";
      const plan = { id: crypto.randomUUID(), name: uniqueName(name.data, now.map((p) => p.name)), items, keepWhole: [], rawOnly: true };
      save([...now, plan]);
      setActiveId(plan.id);
      return null;
    },
    async rename(id, input) {
      const name = PlanName.safeParse(input);
      if (!name.success) return name.error.issues[0].message;
      const now = latest();
      if (now.some((p) => p.name === name.data && p.id !== id)) return `You already have a plan called "${name.data}".`;
      save(now.map((p) => (p.id === id ? { ...p, name: name.data } : p)));
      return null;
    },
    async remove(id) {
      const now = latest();
      if (now.length < 2) return "You need at least one plan.";
      afterDelete(id);
      save(now.filter((p) => p.id !== id));
      return null;
    },
    add: (itemId) => update((items) => ({ ...items, [itemId]: items[itemId] ?? 1 })),
    setQty: (itemId, qty) => update((items) => ({ ...items, [itemId]: Math.max(1, Math.floor(qty) || 1) })),
    removeItem: (itemId) =>
      update((items) => {
        const rest = { ...items };
        delete rest[itemId];
        return rest;
      }),
    setKeepWhole: (itemId, whole) => updatePlan((p) => ({ ...p, keepWhole: toggled(p.keepWhole, itemId, whole) })),
    setRawOnly: (rawOnly) => updatePlan((p) => ({ ...p, rawOnly })),
    clear: () => update(() => ({})),
  };
}

/** The plans kept in this browser, as stored (no empty default). The signed-in page offers to import them. */
export function useBrowserPlans(): NamedPlan[] {
  const raw = useStored(PLANS_KEY);
  const legacy = useStored(LEGACY_KEY);
  return useMemo(() => parseLocalPlans(raw, legacy), [raw, legacy]);
}

/** Empty the browser's plans (after moving them into an account). An empty list also hides the legacy key for good. */
export function clearLocalPlans() {
  write(PLANS_KEY, JSON.stringify([]));
}
