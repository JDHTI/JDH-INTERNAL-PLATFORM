"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

/** From this many options on, the panel gets a search box: scanning a long list by eye is slow. */
const SEARCH_FROM = 8;

/**
 * A dropdown of checkboxes. Nothing ticked means "all": the filter is off, and
 * the trigger says so. The panel is a group of real checkboxes, so Tab, Space
 * and screen readers work as they do anywhere else; Escape and a click outside
 * close it (`useDismissablePanel`).
 */
export function MultiSelect({
  label,
  allLabel,
  options,
  value,
  onValueChange,
  className,
  disabled,
}: {
  /** What is being chosen, plural: "Categorías". Also the panel's accessible name. */
  label: string;
  /** The trigger's text when nothing is ticked: "Todas las categorías". */
  allLabel: string;
  options: string[];
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
}) {
  const panelId = React.useId();
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  const [query, setQuery] = React.useState("");
  const selected = new Set(value);
  const q = query.trim().toLowerCase();
  const shown = q === "" ? options : options.filter((option) => option.toLowerCase().includes(q));

  const toggle = (option: string) => {
    const next = new Set(selected);
    if (!next.delete(option)) next.add(option);
    // Keep the options' order, not the clicking order.
    onValueChange(options.filter((item) => next.has(item)));
  };

  const summary = value.length === 0 ? allLabel : value.length === 1 ? value[0] : `${label}: ${value.length}`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || options.length === 0}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => {
          setQuery("");
          setIsOpen(!isOpen);
        }}
        title={value.length > 1 ? value.join(", ") : undefined}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-2.5 text-left text-sm",
          "transition-colors duration-150 hover:bg-canvas-subtle max-md:h-11",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          // A filter that is on reads as on: the primary border, like a pressed chip.
          value.length > 0 ? "border-primary font-medium" : "border-border-control"
        )}
      >
        <span className="min-w-0 truncate">
          <span className="sr-only">{label}: </span>
          {summary}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-text-secondary", isOpen && "rotate-180")} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border-control bg-surface p-1 shadow-lg"
        >
          {options.length >= SEARCH_FROM && (
            <div className="relative p-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Buscar en ${label.toLowerCase()}`}
                aria-label={`Buscar en ${label.toLowerCase()}`}
                autoFocus
                className="h-8 pl-8 max-md:h-11"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-[13px] text-text-secondary">
            <span className="tabular-nums" aria-live="polite">
              {value.length === 0 ? "Sin filtro: se ven todas" : `${value.length} de ${options.length}`}
            </span>
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onValueChange([])}
                className="rounded-sm font-medium text-text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
              >
                Ver todas
              </button>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((option) => (
              <li key={option}>
                <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-canvas-subtle max-md:min-h-11">
                  <input
                    type="checkbox"
                    checked={selected.has(option)}
                    onChange={() => toggle(option)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate" title={option}>{option}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-text-secondary">Ninguna coincide con «{query.trim()}».</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
