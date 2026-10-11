"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** `whole`: the plan counts it as itself instead of breaking it down. Only `craftable` items can be broken down. */
export type Total = { id: string; name: string; qty: number; craftable: boolean; whole: boolean };

/** Totals list with the raw-only switch; rendered in the desktop drawer and the mobile sheet. */
export function IngredientsPanel({
  totals,
  rawOnly,
  onRawOnlyChange,
  onBreakDownChange,
}: {
  totals: Total[];
  rawOnly: boolean;
  onRawOnlyChange: (value: boolean) => void;
  onBreakDownChange: (id: string, breakDown: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Label className="text-sm font-normal">
        <Checkbox checked={rawOnly} onCheckedChange={onRawOnlyChange} />
        Raw resources only
      </Label>
      {totals.some((t) => t.craftable) && (
        <p className="text-xs text-muted-foreground">Untick what you will already have: it counts as itself.</p>
      )}
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {totals.map((t) => (
            <tr key={t.id}>
              <td className="w-6 py-1.5">
                {t.craftable && (
                  <Checkbox
                    checked={!t.whole}
                    onCheckedChange={(on) => onBreakDownChange(t.id, on)}
                    aria-label={`Break down ${t.name}`}
                    title="Break down into what it is made of"
                  />
                )}
              </td>
              <td className="py-1.5">{t.name}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{t.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
