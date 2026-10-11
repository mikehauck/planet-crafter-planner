"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Plan } from "@/lib/plan";

// The plan lives in this browser only (no accounts yet). Falls back to memory when storage is blocked.
const KEY = "planet-crafter:plan";
const listeners = new Set<() => void>();
let memory = "{}";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(plan: Plan) {
  memory = JSON.stringify(plan);
  try {
    localStorage.setItem(KEY, memory);
  } catch {}
  listeners.forEach((l) => l());
}

function parse(raw: string): Plan {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function usePlan() {
  const raw = useSyncExternalStore(subscribe, read, () => "{}");
  const plan = useMemo(() => parse(raw), [raw]);

  return {
    plan,
    setQty(id: string, qty: number) {
      write({ ...plan, [id]: Math.max(1, Math.floor(qty) || 1) });
    },
    add(id: string) {
      write({ ...plan, [id]: plan[id] ?? 1 });
    },
    remove(id: string) {
      const rest = { ...plan };
      delete rest[id];
      write(rest);
    },
    clear() {
      write({});
    },
  };
}
