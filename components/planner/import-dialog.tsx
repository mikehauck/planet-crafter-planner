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
import { Input } from "@/components/ui/input";
import { previewImport } from "@/services/plans/import";
import { PlanName, planLabel, type NamedPlan } from "@/services/plans/schema";

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
  /** browser plan name -> the name the user typed; untouched plans keep the suggested one */
  const [names, setNames] = useState<Record<string, string>>({});

  const preview = previewImport(
    browserPlans,
    accountPlans.map((p) => p.name),
    (id) => id in catalog,
  );
  if (dismissed || !preview.plans.length) return null;

  const chosen = preview.plans.map((p) => ({ ...p, name: (names[p.from] ?? p.name).trim() }));
  const taken = new Set(accountPlans.map((p) => p.name));
  const problem = (name: string, i: number) =>
    PlanName.safeParse(name).error?.issues[0].message ??
    (taken.has(name) || chosen.some((c, j) => j !== i && c.name === name) ? "Name already used" : null);
  const invalid = chosen.some((c, i) => problem(c.name, i));

  async function confirm() {
    setPending(true);
    setError(null);
    const r = await importPlans(chosen.map(({ name, items, keepWhole }) => ({ name, items, keepWhole })));
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
            Name each one as you want it in your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-3 text-sm">
          {chosen.map((p, i) => {
            const msg = problem(p.name, i);
            return (
              <li key={p.from} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Input
                    aria-label={`Name for "${planLabel({ name: p.from })}"`}
                    placeholder={p.from ? undefined : "Name this plan"}
                    value={names[p.from] ?? preview.plans[i].name}
                    onChange={(e) => setNames((n) => ({ ...n, [p.from]: e.target.value }))}
                    aria-invalid={msg ? true : undefined}
                    maxLength={60}
                  />
                  <span className="shrink-0 text-muted-foreground">
                    {count(p.items)} item{count(p.items) === 1 ? "" : "s"}
                  </span>
                </div>
                {msg && <span className="text-destructive">{msg}</span>}
              </li>
            );
          })}
        </ul>
        {preview.plans.some((p) => p.name !== p.from) && (
          <p className="text-sm text-muted-foreground">Names your account already uses were given a number; change them if you like.</p>
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
          <AlertDialogAction disabled={pending || invalid} onClick={confirm}>
            Move {preview.plans.length} plan{preview.plans.length === 1 ? "" : "s"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
