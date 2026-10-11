"use client";
import { useState } from "react";
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
import { importPlans } from "@/app/plans/actions";
import type { Catalog } from "@/lib/plan";
import { clearLocalPlans, useBrowserPlans } from "@/lib/plan-store";
import { previewImport } from "@/services/plans/import";
import type { NamedPlan } from "@/services/plans/schema";

/**
 * Signed in with plans still in this browser: offer to move them into the account.
 * OK imports them and empties the browser's list; Cancel leaves them and asks again next visit.
 */
export function ImportDialog({
  catalog,
  accountPlans,
  onImported,
}: {
  catalog: Catalog;
  accountPlans: NamedPlan[];
  onImported: (plans: NamedPlan[]) => void;
}) {
  const browserPlans = useBrowserPlans();
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = previewImport(
    browserPlans,
    accountPlans.map((p) => p.name),
    (id) => id in catalog,
  );
  if (dismissed || !preview.plans.length) return null;

  async function confirm() {
    setPending(true);
    setError(null);
    const r = await importPlans(browserPlans.map(({ name, items }) => ({ name, items })));
    setPending(false);
    if (!r.ok) return setError(r.error);
    onImported(r.data);
    clearLocalPlans();
  }

  const count = (items: object) => Object.keys(items).length;
  return (
    <AlertDialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move this browser&rsquo;s plans into your account?</AlertDialogTitle>
          <AlertDialogDescription>
            They are saved here, on this device only. Once moved, they are in your account and removed from this browser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-1 text-sm">
          {preview.plans.map((p) => (
            <li key={p.from} className="flex justify-between gap-4">
              <span>
                {p.from}
                {p.name !== p.from && <span className="text-muted-foreground"> → {p.name}</span>}
              </span>
              <span className="text-muted-foreground">
                {count(p.items)} item{count(p.items) === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
        {preview.plans.some((p) => p.name !== p.from) && (
          <p className="text-sm text-muted-foreground">Your account already has plans with those names, so they get a number.</p>
        )}
        {preview.dropped.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Not in the game data any more, so left out: {preview.dropped.map((d) => `${d.itemId} (${d.plan})`).join(", ")}.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={confirm}>
            Move {preview.plans.length} plan{preview.plans.length === 1 ? "" : "s"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
