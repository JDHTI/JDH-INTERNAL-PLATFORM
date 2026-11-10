"use client";

import { useId, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

import { useBillingCenters } from "../hooks/use-quotations";
import type { BillingCenter } from "../types/quotations.types";
import { centerLabel } from "./billing-center-select";

export const NATIONAL_LABEL = "Nacional";
export const NATIONAL_HELP = "El costo más alto de todas las bodegas, referencia por referencia.";
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
 * no center ticked is Nacional again. The panel is a group of real checkboxes,
 * so Tab, Space and screen readers work as anywhere else; Escape and a click
 * outside close it.
 */
export default function CostCentersSelect({
  id,
  value,
  onChange,
  disabled = false,
  describedBy,
}: {
  id: string;
  /** Chosen centers by code; empty is Nacional. */
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const panelId = useId();
  const centers = useBillingCenters();
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
        aria-describedby={describedBy}
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
          <label className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-canvas-subtle max-md:min-h-11">
            <input
              type="checkbox"
              checked={national}
              onChange={() => onChange([])}
              className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
            />
            <span className="min-w-0">
              <span className="block font-medium">{NATIONAL_LABEL}</span>
              <span className="block text-[13px] text-text-secondary">{NATIONAL_HELP} No se combina con otros C.O.</span>
            </span>
          </label>
          <div className="mx-2 my-1 border-t border-border" />
          <p className="px-2 py-1 text-[13px] text-text-secondary">
            O uno o varios C.O.: con varios, cada referencia toma el más costoso.
          </p>
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
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-text-secondary">Ningún C.O. coincide con «{query.trim()}».</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
