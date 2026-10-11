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

type Dialog = { kind: "new" | "rename" | "delete" } | null;

/** Pick the plan to show; make, rename or delete plans. */
export function PlanSwitcher({ store }: { store: PlanStore }) {
  const { plans, active } = store;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const open = (kind: "new" | "rename" | "delete") => {
    setName(kind === "rename" ? active.name : "");
    setError(null);
    setDialog({ kind });
  };

  async function confirm() {
    if (!dialog) return;
    setPending(true);
    const err =
      dialog.kind === "new"
        ? await store.create(name)
        : dialog.kind === "rename"
          ? await store.rename(active.id, name)
          : await store.remove(active.id);
    setPending(false);
    if (err) setError(err);
    else setDialog(null);
  }

  const title = { new: "New plan", rename: "Rename plan", delete: `Delete "${active.name}"?` };

  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Plan"
        value={active.id}
        onChange={(e) => store.select(e.target.value)}
        className="h-8 max-w-56 truncate rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="icon" aria-label="New plan" onClick={() => open("new")}>
        <PlusIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Rename plan" onClick={() => open("rename")}>
        <PencilIcon />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Delete plan" disabled={plans.length < 2} onClick={() => open("delete")}>
        <Trash2Icon />
      </Button>

      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
            className="flex flex-col gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog && title[dialog.kind]}</AlertDialogTitle>
              {dialog?.kind === "delete" ? (
                <AlertDialogDescription>
                  This deletes the plan and its {Object.keys(active.items).length} item
                  {Object.keys(active.items).length === 1 ? "" : "s"}.
                </AlertDialogDescription>
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
              <AlertDialogAction type="submit" disabled={pending} variant={dialog?.kind === "delete" ? "destructive" : "default"}>
                {dialog?.kind === "delete" ? "Delete plan" : dialog?.kind === "new" ? "Create" : "Rename"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
