"use client";

import { Check, ChevronDown } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

export interface ChecklistOption {
  value: string;
  label: string;
}

/**
 * Trigger plus a panel of checkboxes, for choices that stack: several
 * statuses at once, or which optional columns the table shows. Real
 * checkboxes inside a labelled group, so Tab and Space work as expected.
 */
export default function ChecklistMenu({
  id,
  label,
  summary,
  options,
  selected,
  onChange,
  align = "left",
  icon,
}: {
  id: string;
  /** Accessible name of the group and the trigger. */
  label: string;
  /** What the trigger reads while closed ("Todos", "2 estados"). */
  summary: string;
  options: ChecklistOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  align?: "left" | "right";
  icon?: React.ReactNode;
}) {
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  const panelId = `${id}-panel`;

  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : // Kept in option order, so the URL does not depend on click order.
          options.map((option) => option.value).filter((v) => v === value || selected.includes(v))
    );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={`${label}: ${summary}`}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm",
          "transition-colors duration-150 hover:bg-canvas-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control"
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {icon}
          <span className="truncate">{summary}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-text-secondary transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <fieldset
          id={panelId}
          className={cn(
            "absolute top-full z-50 mt-1 max-h-72 min-w-full overflow-y-auto rounded-md border border-border-control bg-surface-raised p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <legend className="sr-only">{label}</legend>
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm whitespace-nowrap hover:bg-canvas-subtle max-md:min-h-11"
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border border-border-control",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    checked && "border-primary bg-primary text-text-on-primary"
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                {option.label}
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
