"use client";
import { useMemo } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ItemSearch } from "@/components/planner/item-search";
import { rawTotals, type Catalog } from "@/lib/plan";
import { usePlan } from "@/lib/plan-store";

export function Planner({ catalog }: { catalog: Catalog }) {
  const { plan, add, setQty, remove, clear } = usePlan();
  const items = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  // Drop ids a data re-import removed, so a stale plan cannot break the page.
  const entries = Object.entries(plan).filter(([id]) => catalog[id]);
  const totals = Object.entries(rawTotals(catalog, plan))
    .map(([id, qty]) => ({ name: catalog[id].name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          {entries.length > 0 && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
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

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Raw resources needed</CardTitle>
        </CardHeader>
        <CardContent>
          {totals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {totals.map((t) => (
                  <tr key={t.name}>
                    <td className="py-1.5">{t.name}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{t.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
