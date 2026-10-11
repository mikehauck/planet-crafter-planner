"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type Total = { name: string; qty: number };

/** Totals list with the raw-only switch; rendered in the desktop drawer and the mobile sheet. */
export function IngredientsPanel({
  totals,
  rawOnly,
  onRawOnlyChange,
}: {
  totals: Total[];
  rawOnly: boolean;
  onRawOnlyChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Label className="text-sm font-normal">
        <Checkbox checked={rawOnly} onCheckedChange={onRawOnlyChange} />
        Raw resources only
      </Label>
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
    </div>
  );
}
