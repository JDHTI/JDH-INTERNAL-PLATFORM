"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

import { useBillingCenters, useCostCentersComparison } from "../hooks/use-quotations";
import type { BillingCenter, Quotation } from "../types/quotations.types";
import { centerLabel } from "./billing-center-select";

export const NATIONAL_LABEL = "Nacional";
/** From this many centers on, the panel gets a search box. */
const SEARCH_FROM = 8;

/** How a choice reads: "Nacional", "001 · ANTIOQUIA" or "001 · ANTIOQUIA, 003 · CENTRO". */
export function costCentersLabel(codes: string[], centers: BillingCenter[] | undefined): string {
  if (codes.length === 0) return NATIONAL_LABEL;
  const byCode = new Map((centers ?? []).map((center) => [center.code, center]));
  return codes.map((code) => (byCode.has(code) ? centerLabel(byCode.get(code)!) : code)).join(", ");
}

/**
 * Where the cost of every line comes from: Nacional, alone, or one or more
 * operation centers. Nacional and the centers exclude each other: ticking
 * Nacional clears the centers, ticking a center clears Nacional, and leaving
 * no center ticked is Nacional again. With two or more ticked, the panel asks
 * the API which one costs the most for this quotation's references and marks
 * it, before anything is applied. The panel is a group of real checkboxes, so
 * Tab, Space and screen readers work as anywhere else; Escape and a click
 * outside close it.
 */
export default function CostCentersSelect({
  id,
  quotation,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  quotation: Pick<Quotation, "id" | "version">;
  /** Chosen centers by code; empty is Nacional. */
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}) {
  const panelId = useId();
  const centers = useBillingCenters();
  const comparison = useCostCentersComparison(quotation.id, quotation.version, value);
  const costliest = value.length > 1 ? comparison.data?.highest ?? null : null;
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const options = centers.data ?? [];
  const selected = new Set(value);
  const q = query.trim().toLowerCase();
  const shown = q === "" ? options : options.filter((center) => centerLabel(center).toLowerCase().includes(q));
  const national = value.length === 0;

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (!next.delete(code)) next.add(code);
    // Keep the master's order (by code), not the clicking order.
    onChange(options.filter((center) => next.has(center.code)).map((center) => center.code));
  };

  const summary = centers.isPending
    ? "Cargando los C.O.…"
    : centers.isError
      ? "No se pudieron cargar los C.O."
      : value.length > 1
        ? `${value.length} C.O.: ${value.join(", ")}`
        : costCentersLabel(value, options);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled || centers.isPending || centers.isError}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => {
          setQuery("");
          setIsOpen(!isOpen);
        }}
        title={value.length > 1 ? costCentersLabel(value, options) : undefined}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm",
          "transition-colors duration-150 hover:bg-canvas-subtle max-md:h-11",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-text-secondary", isOpen && "rotate-180")} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-label="C.O. del costo"
          className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border-control bg-surface p-1 shadow-lg"
        >
          <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm font-medium hover:bg-canvas-subtle max-md:min-h-11">
            <input
              type="checkbox"
              checked={national}
              onChange={() => onChange([])}
              className="size-4 shrink-0 accent-[var(--primary)]"
            />
            {NATIONAL_LABEL}
          </label>
          <div className="mx-2 my-1 border-t border-border" />
          {options.length >= SEARCH_FROM && (
            <div className="relative p-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Código o nombre del C.O."
                aria-label="Buscar un C.O."
                autoFocus
                className="h-8 pl-8 max-md:h-11"
              />
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((center) => (
              <li key={center.code}>
                <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-canvas-subtle max-md:min-h-11">
                  <input
                    type="checkbox"
                    checked={selected.has(center.code)}
                    onChange={() => toggle(center.code)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate" title={centerLabel(center)}>{centerLabel(center)}</span>
                  {costliest === center.code && (
                    <Badge tone="warning" className="shrink-0 px-1.5 py-0 text-xs">Más costoso</Badge>
                  )}
                  {value.length > 1 && selected.has(center.code) && comparison.isFetching && (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-text-secondary" aria-hidden="true" />
                  )}
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-text-secondary">Ningún C.O. coincide con «{query.trim()}».</li>}
          </ul>
          <p className="sr-only" aria-live="polite">
            {costliest ? `Más costoso: ${costCentersLabel([costliest], options)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
