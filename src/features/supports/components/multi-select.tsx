"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

/**
 * Several values from a known list (regional, unit, channel). Nothing chosen
 * means no restriction, which the trigger says in words.
 */
export default function MultiSelect({
  id,
  options,
  value,
  onChange,
  emptyLabel,
  "aria-describedby": describedBy,
}: {
  id: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
  "aria-describedby"?: string;
}) {
  const listId = useId();
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  // A stored value the catalog no longer lists stays visible, so it can be removed.
  const all = [...options, ...value.filter((item) => !options.includes(item))];

  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((current) => current !== item) : [...value, item]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm",
          "transition-colors duration-150 outline-none hover:bg-canvas-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control"
        )}
      >
        <span className={cn("min-w-0 truncate", value.length === 0 && "text-text-secondary")}>
          {value.length === 0 ? emptyLabel : value.join(", ")}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-text-secondary transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          id={listId}
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-border-control bg-surface p-1 shadow-lg"
        >
          {all.map((item) => (
            <label
              key={item}
              className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-canvas-subtle max-md:min-h-11"
            >
              <input
                type="checkbox"
                checked={value.includes(item)}
                onChange={() => toggle(item)}
                className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {item}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
