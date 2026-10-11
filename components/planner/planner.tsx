"use client";
import { useMemo, useState } from "react";
import { ListIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { PlanSwitcher } from "@/components/planner/plan-switcher";
import { useAccountPlans } from "@/lib/account-plans";
import { directTotals, rawTotals, type Catalog } from "@/lib/plan";
import { useLocalPlans, type PlanStore } from "@/lib/plan-store";
import type { NamedPlan } from "@/services/plans/schema";

/** Signed out: plans live in this browser. */
export function LocalPlanner({ catalog }: { catalog: Catalog }) {
  return <Planner catalog={catalog} store={useLocalPlans()} />;
}

/** Signed in: plans live in the account. */
export function AccountPlanner({ catalog, plans }: { catalog: Catalog; plans: NamedPlan[] }) {
  return <Planner catalog={catalog} store={useAccountPlans(plans)} />;
}

function Planner({ catalog, store }: { catalog: Catalog; store: PlanStore }) {
  const plan = store.active.items;
  const { add, setQty, removeItem: remove, clear } = store;
  const [rawOnly, setRawOnly] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  // Retired items stay in the catalog so plans can show and total them, but cannot be added again.
  const items = useMemo(
    () => Object.values(catalog).filter((i) => !i.retired).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  // Drop ids a data re-import removed, so a stale plan cannot break the page.
  const entries = Object.entries(plan).filter(([id]) => catalog[id]);
  const totals = Object.entries((rawOnly ? rawTotals : directTotals)(catalog, plan))
    .map(([id, qty]) => ({ name: catalog[id].name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
                    <AlertDialogTitle>Clear &ldquo;{store.active.name}&rdquo;?</AlertDialogTitle>
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
          <ItemSearch items={items} onPick={add} />
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Search above to add something to build.</p>
          ) : (
            <ul className="divide-y">
              {entries.map(([id, qty]) => (
                <li key={id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 truncate">{catalog[id].name}</span>
                  {catalog[id].retired && <Badge variant="destructive">No longer in the game</Badge>}
                  <Badge variant="secondary">{catalog[id].type}</Badge>
                  <QtyField value={qty} onChange={(q) => setQty(id, q)} label={catalog[id].name} />
                  <Button variant="ghost" size="icon" onClick={() => remove(id)} aria-label={`Remove ${catalog[id].name}`}>
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
