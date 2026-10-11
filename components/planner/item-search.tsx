"use client";
import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/plan";

const MAX_RESULTS = 50;

/** Type to find an item (name or type); arrows + Enter or a click adds it to the plan. */
export function ItemSearch({ items, onPick }: { items: CatalogItem[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = words.length
    ? items
        .filter((i) => words.every((w) => `${i.name} ${i.type}`.toLowerCase().includes(w)))
        .slice(0, MAX_RESULTS)
    : [];

  const pick = (id: string) => {
    onPick(id);
    setQuery("");
    setActive(0);
  };

  return (
    <div className="flex flex-col gap-1">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "Enter" && results[active]) pick(results[active].id);
            else if (e.key === "Escape") setQuery("");
            else return;
            e.preventDefault();
          }}
          placeholder="Search items — name or type, e.g. “drone” or “machine”"
          aria-label="Search items"
          autoFocus
        />
      </InputGroup>
      {words.length > 0 && (
        <ul role="listbox" className="max-h-80 overflow-y-auto rounded-lg border p-1">
          {results.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">No items match.</li>}
          {results.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the search box
                pick(item.id);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                i === active && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex-1">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
