"use client";
import { NumberField } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";

const stepButton =
  "flex size-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5";

/** − [qty] + : hold a button to repeat; arrow keys step by 1, shift+arrows by 10. */
export function QtyField({ value, onChange, label }: { value: number; onChange: (qty: number) => void; label: string }) {
  return (
    <NumberField.Root
      value={value}
      onValueChange={(v) => v != null && onChange(v)}
      min={1}
      step={1}
      largeStep={10}
      format={{ maximumFractionDigits: 0 }}
    >
      <NumberField.Group className="flex h-8 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <NumberField.Decrement className={stepButton} aria-label={`One fewer ${label}`}>
          <MinusIcon />
        </NumberField.Decrement>
        <NumberField.Input
          aria-label={`How many ${label}`}
          className="h-full w-12 border-x border-input bg-transparent text-center text-sm tabular-nums outline-none"
        />
        <NumberField.Increment className={stepButton} aria-label={`One more ${label}`}>
          <PlusIcon />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
