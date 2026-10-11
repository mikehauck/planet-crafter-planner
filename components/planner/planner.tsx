"use client";
import { useMemo, useState } from "react";
import { ListIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { IngredientsPanel } from "@/components/planner/ingredients-panel";
import { ItemSearch } from "@/components/planner/item-search";
import { QtyField } from "@/components/planner/qty-field";
import { ImportDialog } from "@/components/planner/import-dialog";
import { PlanSwitcher } from "@/components/planner/plan-switcher";
import { useAccountPlans } from "@/lib/account-plans";
import { directTotals, rawTotals, type Catalog } from "@/lib/plan";
import { useLocalPlans, useStoredFlag, type PlanStore } from "@/lib/plan-store";
import { planLabel, type NamedPlan } from "@/services/plans/schema";
import { Input } from "@/components/ui/input";

/** Signed out: plans live in this browser. */
export function LocalPlanner({ catalog }: { catalog: Catalog }) {
  return <Planner catalog={catalog} store={useLocalPlans()} />;
}

/** Signed in: plans live in the account. Plans left in this browser are offered for import. */
export function AccountPlanner({ catalog, userId, plans }: { catalog: Catalog; userId: string; plans: NamedPlan[] }) {
  const store = useAccountPlans(userId, plans);
  return (
    <>
      {/* The placeholder (no id) is not a saved plan, so its name is not taken. */}
      <ImportDialog catalog={catalog} accountPlans={store.plans.filter((p) => p.id)} onImported={store.addPlans} />
      <Planner catalog={catalog} store={store} />
    </>
  );
}

function Planner({ catalog, store }: { catalog: Catalog; store: PlanStore }) {
  const plan = store.active.items;
  const { add, setQty, removeItem: remove, clear, setKeepWhole } = store;
  // A view setting for this browser, not part of the plan.
  const [rawOnly, setRawOnly] = useStoredFlag("planet-crafter:raw-only", true);
  const [confirmClear, setConfirmClear] = useState(false);
  // Saving to the account needs a named plan: the first pick into the unnamed placeholder asks for one.
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const pick = (id: string) => {
    if (store.namesRequired && !store.active.name) {
      setFirstName("");
      setNameError(null);
      setPendingItem(id);
    } else add(id);
  };
  async function createFirst() {
    if (!pendingItem) return;
    const err = await store.create(firstName, { [pendingItem]: 1 });
    if (err) setNameError(err);
    else setPendingItem(null);
  }
  // Retired items stay in the catalog so plans can show and total them, but cannot be added again.
  const items = useMemo(
    () => Object.values(catalog).filter((i) => !i.retired).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  // Drop ids a data re-import removed, so a stale plan cannot break the page.
  const entries = Object.entries(plan).filter(([id]) => catalog[id]);
  const whole = new Set(store.active.keepWhole);
  const craftable = (id: string) => Object.keys(catalog[id]?.recipe ?? {}).length > 0;
  const totals = Object.entries((rawOnly ? rawTotals : directTotals)(catalog, plan, whole))
    .map(([id, qty]) => ({ name: catalog[id].name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Until the browser's storage is read, which plan is the working one is unknown: show a skeleton, not a guess.
  if (!store.ready) return <PlannerSkeleton />;

  const title = rawOnly ? "Raw resources needed" : "Ingredients needed";
  const panel = <IngredientsPanel totals={totals} rawOnly={rawOnly} onRawOnlyChange={setRawOnly} />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <PlanSwitcher store={store} />
          </CardTitle>
          {entries.length > 0 && (
            <CardAction className="flex gap-2">
              {/* Narrow screens: the ingredients panel slides in from the right. */}
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <ListIcon />
                      Ingredients ({totals.length})
                    </Button>
                  }
                />
                <SheetContent side="right" className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-4">{panel}</div>
                </SheetContent>
              </Sheet>
              <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
                <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Clear</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear &ldquo;{planLabel(store.active)}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all {entries.length} item{entries.length === 1 ? "" : "s"} from your plan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => {
                        clear();
                        setConfirmClear(false);
                      }}
                    >
                      Clear plan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {store.error && (
            <p role="alert" className="text-sm text-destructive">
              {store.error}
            </p>
          )}
          <ItemSearch items={items} onPick={pick} />
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Search above to add something to build.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-normal">Item</th>
                  <th className="pb-2 font-normal">Type</th>
                  {/* Ticked: the totals show what it is made of. Unticked: you will have it, so it counts as itself. */}
                  <th className="px-3 pb-2 text-center font-normal whitespace-nowrap" title="Count what it is made of in the totals. Untick if you will already have it.">
                    Break down
                  </th>
                  <th className="pb-2 text-center font-normal">Qty</th>
                  <th className="pb-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(([id, qty]) => (
                  <tr key={id}>
                    <td className="max-w-0 py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{catalog[id].name}</span>
                        {catalog[id].retired && <Badge variant="destructive">No longer in the game</Badge>}
                      </div>
                    </td>
                    <td className="w-px py-2">
                      <Badge variant="secondary">{catalog[id].type}</Badge>
                    </td>
                    <td className="w-px px-3 py-2">
                      {/* Raw resources cannot be broken down. */}
                      {craftable(id) && (
                        <div className="flex justify-center">
                          <Checkbox
                            checked={!whole.has(id)}
                            onCheckedChange={(on) => setKeepWhole(id, !on)}
                            aria-label={`Break down ${catalog[id].name}`}
                          />
                        </div>
                      )}
                    </td>
                    <td className="w-px py-2">
                      <QtyField value={qty} onChange={(q) => setQty(id, q)} label={catalog[id].name} />
                    </td>
                    <td className="w-px py-2 pl-3">
                      <Button variant="ghost" size="icon" onClick={() => remove(id)} aria-label={`Remove ${catalog[id].name}`}>
                        <XIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingItem !== null} onOpenChange={(o) => !o && setPendingItem(null)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void createFirst();
            }}
            className="flex flex-col gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Name your plan</AlertDialogTitle>
              <AlertDialogDescription>
                It is saved to your account, so it needs a name.
              </AlertDialogDescription>
              <Input aria-label="Plan name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoFocus />
              {nameError && (
                <p role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit">
                Create and add {pendingItem && catalog[pendingItem]?.name}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {entries.length > 0 && (
        // Wide screens: a drawer pinned to the right edge, like a shopping cart. The page makes room for it.
        <aside
          data-ingredients-drawer
          aria-label={title}
          className="fixed inset-y-0 right-0 hidden w-80 flex-col gap-4 overflow-y-auto border-l bg-background p-4 lg:flex"
        >
          <h2 className="font-medium">{title}</h2>
          {panel}
        </aside>
      )}
    </>
  );
}

function PlannerSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading your plan">
      <CardHeader>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-8 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}
