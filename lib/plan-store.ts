"use client";
import { useMemo, useSyncExternalStore } from "react";
import { Plan } from "@/services/catalog/schema";
import { NamedPlan, PlanName, uniqueName } from "@/services/plans/schema";

/** What the planner needs from wherever plans are kept: this browser, or the signed-in account. */
export type PlanStore = {
  plans: NamedPlan[];
  /** always set: a store with no plans yet offers an empty "My plan" */
  active: NamedPlan;
  select(id: string): void;
  /** These resolve to an error message for the user, or null. */
  create(name: string): Promise<string | null>;
  rename(id: string, name: string): Promise<string | null>;
  remove(id: string): Promise<string | null>;
  add(itemId: string): void;
  setQty(itemId: string, qty: number): void;
  removeItem(itemId: string): void;
  clear(): void;
  /** last failed background save, if any */
  error: string | null;
};

export const DEFAULT_NAME = "My plan";

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

const useStored = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => null);

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

function parseJson(raw: string | null): unknown {
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Which plan is showing, per browser, for either store. */
const ACTIVE_KEY = "planet-crafter:active-plan";
export function useActiveId(): [string | null, (id: string) => void] {
  return [useStored(ACTIVE_KEY), (id) => write(ACTIVE_KEY, id)];
}

// --- Plans kept in this browser (signed out) ---

const PLANS_KEY = "planet-crafter:plans";
/** Before named plans: one unnamed plan. Read once into "My plan" and left in place, never written. */
const LEGACY_KEY = "planet-crafter:plan";
const LOCAL_DEFAULT_ID = "local-default";

/** The browser's plans as stored, without the empty default. Phase-C import reads this too. */
export function parseLocalPlans(raw: string | null, legacy: string | null): NamedPlan[] {
  const stored = parseJson(raw);
  if (Array.isArray(stored)) {
    const plans: NamedPlan[] = [];
    for (const p of stored) {
      const plan = NamedPlan.safeParse({ ...p, items: cleanItems(p?.items) });
      if (plan.success && !plans.some((q) => q.id === plan.data.id || q.name === plan.data.name)) plans.push(plan.data);
    }
    return plans;
  }
  const old = cleanItems(parseJson(legacy));
  return Object.keys(old).length ? [{ id: LOCAL_DEFAULT_ID, name: DEFAULT_NAME, items: old }] : [];
}

export function useLocalPlans(): PlanStore {
  const raw = useStored(PLANS_KEY);
  const legacy = useStored(LEGACY_KEY);
  const [activeId, setActiveId] = useActiveId();
  const plans = useMemo(() => {
    const parsed = parseLocalPlans(raw, legacy);
    return parsed.length ? parsed : [{ id: LOCAL_DEFAULT_ID, name: DEFAULT_NAME, items: {} }];
  }, [raw, legacy]);
  const active = plans.find((p) => p.id === activeId) ?? plans[0];

  const save = (next: NamedPlan[]) => write(PLANS_KEY, JSON.stringify(next));
  const update = (items: Plan) => save(plans.map((p) => (p.id === active.id ? { ...p, items } : p)));
  const nameError = (name: string, exceptId?: string) =>
    plans.some((p) => p.name === name && p.id !== exceptId) ? `You already have a plan called "${name}".` : null;

  return {
    plans,
    active,
    error: null,
    select: setActiveId,
    async create(input) {
      const name = PlanName.safeParse(input);
      if (!name.success) return name.error.issues[0].message;
      const plan = { id: crypto.randomUUID(), name: uniqueName(name.data, plans.map((p) => p.name)), items: {} };
      save([...plans, plan]);
      setActiveId(plan.id);
      return null;
    },
    async rename(id, input) {
      const name = PlanName.safeParse(input);
      if (!name.success) return name.error.issues[0].message;
      const clash = nameError(name.data, id);
      if (clash) return clash;
      save(plans.map((p) => (p.id === id ? { ...p, name: name.data } : p)));
      return null;
    },
    async remove(id) {
      if (plans.length < 2) return "You need at least one plan.";
      save(plans.filter((p) => p.id !== id));
      return null;
    },
    add: (itemId) => update({ ...active.items, [itemId]: active.items[itemId] ?? 1 }),
    setQty: (itemId, qty) => update({ ...active.items, [itemId]: Math.max(1, Math.floor(qty) || 1) }),
    removeItem(itemId) {
      const rest = { ...active.items };
      delete rest[itemId];
      update(rest);
    },
    clear: () => update({}),
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
