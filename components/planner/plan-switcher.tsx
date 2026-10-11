"use client";
import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PlanStore } from "@/lib/plan-store";
import { planLabel } from "@/services/plans/schema";

/**
 * new: a second plan. When the current plan is unnamed it is named in the same step
 *      (or, if it is still empty, naming it is all "new" does).
 */
type Kind = "new" | "rename" | "delete";

/** Pick the plan to show; make, rename or delete plans. */
export function PlanSwitcher({ store }: { store: PlanStore }) {
  const { plans, active } = store;
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const unnamed = !active.name;
  // Nothing to pick between until a named plan exists (the start is one unnamed plan, or the account placeholder).
  const showPicker = plans.some((p) => p.name);
  const empty = Object.keys(active.items).length === 0;
  // "+" on an empty unnamed plan just names it; on an unnamed plan with items, it names it and makes the new one.
  const nameOnly = kind === "new" && unnamed && empty;
  const nameBoth = kind === "new" && unnamed && !empty;

  const open = (k: Kind) => {
    setName(k === "rename" ? active.name : "");
    setCurrentName("");
    setError(null);
    setKind(k);
  };

  async function confirm() {
    if (!kind) return;
    setPending(true);
    let err: string | null;
    if (kind === "delete") err = await store.remove(active.id);
    else if (kind === "rename" || nameOnly) err = await store.rename(active.id, name);
    else if (nameBoth) err = (await store.rename(active.id, currentName)) ?? (await store.create(name));
    else err = await store.create(name);
    setPending(false);
    if (err) setError(err);
    else setKind(null);
  }

  const title =
    kind === "delete"
      ? `Delete "${planLabel(active)}"?`
      : kind === "rename" || nameOnly
        ? unnamed
          ? "Name your plan"
          : "Rename plan"
        : "New plan";
  const count = Object.keys(active.items).length;

  return (
    <div className="flex items-center gap-1">
      <label htmlFor="plan-picker" className="mr-1 text-sm font-medium">
        Plans
      </label>
      {showPicker && (
        <select
          id="plan-picker"
          aria-label="Plan"
          value={active.id}
          onChange={(e) => store.select(e.target.value)}
          className="h-8 max-w-56 truncate rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {planLabel(p)}
            </option>
          ))}
        </select>
      )}
      <Button variant="ghost" size="icon" aria-label="New plan" onClick={() => open("new")}>
        <PlusIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label={unnamed ? "Name plan" : "Rename plan"} onClick={() => open("rename")}>
        <PencilIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Delete plan" disabled={plans.length < 2} onClick={() => open("delete")}>
        <Trash2Icon />
      </Button>

      <AlertDialog open={kind !== null} onOpenChange={(o) => !o && setKind(null)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
            className="flex flex-col gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {kind === "delete" ? (
                <AlertDialogDescription>
                  This deletes the plan and its {count} item{count === 1 ? "" : "s"}.
                </AlertDialogDescription>
              ) : nameBoth ? (
                <div className="flex flex-col gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    Your current plan needs a name first
                    <Input value={currentName} onChange={(e) => setCurrentName(e.target.value)} maxLength={60} autoFocus />
                  </label>
                  <label className="flex flex-col gap-1">
                    New plan
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                  </label>
                </div>
              ) : (
                <Input aria-label="Plan name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={pending} variant={kind === "delete" ? "destructive" : "default"}>
                {kind === "delete" ? "Delete plan" : kind === "rename" || nameOnly ? "Save name" : "Create"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
