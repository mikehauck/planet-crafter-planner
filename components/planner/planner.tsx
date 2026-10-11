"use client";
import { useMemo, useState } from "react";
import { ListIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { IngredientsPanel } from "@/components/planner/ingredients-panel";
import { ItemSearch } from "@/components/planner/item-search";
import { directTotals, rawTotals, type Catalog } from "@/lib/plan";
import { usePlan } from "@/lib/plan-store";

export function Planner({ catalog }: { catalog: Catalog }) {
  const { plan, add, setQty, remove, clear } = usePlan();
  const [rawOnly, setRawOnly] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const items = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
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
          <CardTitle>Plan</CardTitle>
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
                    <AlertDialogTitle>Clear the plan?</AlertDialogTitle>
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
          <ItemSearch items={items} onPick={add} />
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Search above to add something to build.</p>
          ) : (
            <ul className="divide-y">
              {entries.map(([id, qty]) => (
                <li key={id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 truncate">{catalog[id].name}</span>
                  <Badge variant="secondary">{catalog[id].type}</Badge>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(id, e.target.valueAsNumber)}
                    className="w-20"
                    aria-label={`How many ${catalog[id].name}`}
                  />
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
