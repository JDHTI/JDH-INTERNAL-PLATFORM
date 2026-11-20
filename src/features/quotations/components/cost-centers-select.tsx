"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

import { useBillingCenters, useCostCentersComparison } from "../hooks/use-quotations";
import type { BillingCenter, CenterWarehouse, Quotation } from "../types/quotations.types";
import { centerLabel } from "./billing-center-select";

export const NATIONAL_LABEL = "Nacional";
/** From this many centers on, the panel gets a search box. */
const SEARCH_FROM = 8;

/** Where the cost comes from: the centers by code (none is Nacional) and the warehouses ticked inside them. */
export interface CostChoice {
  centers: string[];
  warehouses: string[];
}

export const sameChoice = (a: CostChoice, b: CostChoice) =>
  a.centers.join() === b.centers.join() && a.warehouses.join() === b.warehouses.join();

/** How a choice reads: "Nacional", "001 · ANTIOQUIA" or "001 · ANTIOQUIA, 003 · CENTRO". */
export function costCentersLabel(codes: string[], centers: BillingCenter[] | undefined): string {
  if (codes.length === 0) return NATIONAL_LABEL;
  const byCode = new Map((centers ?? []).map((center) => [center.code, center]));
  return codes.map((code) => (byCode.has(code) ? centerLabel(byCode.get(code)!) : code)).join(", ");
}

/** The short form, by code, with each center's ticked warehouses: "001 (MDE1, MDE4), 003". */
export function costChoiceCodes(choice: CostChoice, centers: BillingCenter[] | undefined): string {
  if (choice.centers.length === 0) return NATIONAL_LABEL;
  const ticked = new Set(choice.warehouses);
  const byCode = new Map((centers ?? []).map((center) => [center.code, center]));
  return choice.centers
    .map((code) => {
      const own = (byCode.get(code)?.warehouses ?? []).filter((warehouse) => ticked.has(warehouse.code)).map((warehouse) => warehouse.code);
      return own.length > 0 ? `${code} (${own.join(", ")})` : code;
    })
    .join(", ");
}

const PROMO = "PROMO";

/** The warehouses of one center by class, in the API's order (BP first). */
function byClass(warehouses: CenterWarehouse[]): { label: string; items: CenterWarehouse[] }[] {
  const groups = new Map<string, { label: string; items: CenterWarehouse[] }>();
  for (const warehouse of warehouses) {
    const group = groups.get(warehouse.classification) ?? { label: warehouse.classification_label, items: [] };
    group.items.push(warehouse);
    groups.set(warehouse.classification, group);
  }
  return [...groups.values()];
}

function WarehouseCheck({ warehouse, checked, onToggle }: { warehouse: CenterWarehouse; checked: boolean; onToggle: (code: string) => void }) {
  return (
    <label className="flex min-h-7 cursor-pointer items-center gap-2 rounded-sm px-2 text-[13px] hover:bg-canvas-subtle max-md:min-h-11">
      <input type="checkbox" checked={checked} onChange={() => onToggle(warehouse.code)} className="size-4 shrink-0 accent-[var(--primary)]" />
      <span className="min-w-0 flex-1 truncate" title={`${warehouse.code} · ${warehouse.name}`}>
        <span className="font-mono">{warehouse.code}</span> · {warehouse.name}
      </span>
    </label>
  );
}

/**
 * Where the cost of every line comes from: Nacional, alone, or one or more
 * operation centers. Nacional and the centers exclude each other: ticking
 * Nacional clears the centers, ticking a center clears Nacional, and leaving
 * no center ticked is Nacional again. A ticked center that has warehouses
 * opens them underneath. Ticking BP/BSP ones narrows the center to those,
 * ticking none keeps its usual ones; the promotional ones add on top, all at
 * once with «Incluir bodegas promocionales» or one by one. With two or more centers ticked, the
 * panel asks the API which one costs the most for this quotation's references
 * and marks it, before anything is applied. The panel is a group of real
 * checkboxes, so Tab, Space and screen readers work as anywhere else; Escape
 * and a click outside close it.
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
  value: CostChoice;
  onChange: (choice: CostChoice) => void;
  disabled?: boolean;
}) {
  const panelId = useId();
  const centers = useBillingCenters();
  const comparison = useCostCentersComparison(quotation.id, quotation.version, value.centers, value.warehouses);
  const costliest = value.centers.length > 1 ? comparison.data?.highest ?? null : null;
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const options = centers.data ?? [];
  const selected = new Set(value.centers);
  const ticked = new Set(value.warehouses);
  const q = query.trim().toLowerCase();
  const shown = q === "" ? options : options.filter((center) => centerLabel(center).toLowerCase().includes(q));
  const national = value.centers.length === 0;
  const withWarehouses = options.some((center) => selected.has(center.code) && (center.warehouses?.length ?? 0) > 0);

  // Keep the master's order (centers by code, warehouses by class and code), not the clicking order.
  const emit = (nextCenters: Set<string>, nextWarehouses: Set<string>) => {
    const chosen = options.filter((center) => nextCenters.has(center.code));
    onChange({
      centers: chosen.map((center) => center.code),
      warehouses: chosen.flatMap((center) => (center.warehouses ?? []).filter((w) => nextWarehouses.has(w.code)).map((w) => w.code)),
    });
  };

  // A center left unticked takes its warehouses with it: `emit` only keeps those of ticked centers.
  const toggleCenter = (code: string) => {
    const next = new Set(selected);
    if (!next.delete(code)) next.add(code);
    emit(next, ticked);
  };

  const toggleWarehouse = (code: string) => {
    const next = new Set(ticked);
    if (!next.delete(code)) next.add(code);
    emit(selected, next);
  };

  /** «Incluir bodegas promocionales»: all of the center's on, or all off when they already are. */
  const toggleAll = (codes: string[]) => {
    const next = new Set(ticked);
    const allOn = codes.every((code) => next.has(code));
    for (const code of codes) {
      if (allOn) next.delete(code);
      else next.add(code);
    }
    emit(selected, next);
  };

  const warehousesNote = value.warehouses.length > 0 ? ` · ${value.warehouses.length === 1 ? "1 bodega" : `${value.warehouses.length} bodegas`}` : "";
  const summary = centers.isPending
    ? "Cargando los C.O.…"
    : centers.isError
      ? "No se pudieron cargar los C.O."
      : value.centers.length > 1
        ? `${value.centers.length} C.O.: ${value.centers.join(", ")}${warehousesNote}`
        : `${costCentersLabel(value.centers, options)}${warehousesNote}`;

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
        title={value.centers.length > 1 || value.warehouses.length > 0 ? costChoiceCodes(value, options) : undefined}
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
              onChange={() => onChange({ centers: [], warehouses: [] })}
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
          <ul className="max-h-80 overflow-y-auto">
            {shown.map((center) => {
              const open = selected.has(center.code) && (center.warehouses?.length ?? 0) > 0;
              const usual = (center.warehouses ?? []).filter((warehouse) => warehouse.classification !== PROMO);
              const promos = (center.warehouses ?? []).filter((warehouse) => warehouse.classification === PROMO);
              const promosOn = promos.filter((warehouse) => ticked.has(warehouse.code)).length;
              return (
                <li key={center.code}>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-canvas-subtle max-md:min-h-11">
                    <input
                      type="checkbox"
                      checked={selected.has(center.code)}
                      onChange={() => toggleCenter(center.code)}
                      className="size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1 truncate" title={centerLabel(center)}>{centerLabel(center)}</span>
                    {costliest === center.code && (
                      <Badge tone="warning" className="shrink-0 px-1.5 py-0 text-xs">Más costoso</Badge>
                    )}
                    {value.centers.length > 1 && selected.has(center.code) && comparison.isFetching && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-text-secondary" aria-hidden="true" />
                    )}
                  </label>
                  {open && (
                    <div role="group" aria-label={`Bodegas de ${centerLabel(center)}`} className="mb-1 ml-4 border-l border-border pl-2">
                      {byClass(usual).map((group) => (
                        <div key={group.label} role="group" aria-label={group.label}>
                          <p className="px-2 pt-1 text-xs text-text-secondary" aria-hidden="true">{group.label}</p>
                          {group.items.map((warehouse) => (
                            <WarehouseCheck key={warehouse.code} warehouse={warehouse} checked={ticked.has(warehouse.code)} onToggle={toggleWarehouse} />
                          ))}
                        </div>
                      ))}
                      {promos.length > 0 && (
                        <div role="group" aria-label={promos[0].classification_label}>
                          <label className="mt-1 flex min-h-7 cursor-pointer items-center gap-2 rounded-sm px-2 text-[13px] font-medium hover:bg-canvas-subtle max-md:min-h-11">
                            <input
                              type="checkbox"
                              checked={promosOn === promos.length}
                              ref={(input) => {
                                if (input) input.indeterminate = promosOn > 0 && promosOn < promos.length;
                              }}
                              onChange={() => toggleAll(promos.map((warehouse) => warehouse.code))}
                              className="size-4 shrink-0 accent-[var(--primary)]"
                            />
                            Incluir bodegas promocionales
                          </label>
                          <div className="ml-4">
                            {promos.map((warehouse) => (
                              <WarehouseCheck key={warehouse.code} warehouse={warehouse} checked={ticked.has(warehouse.code)} onToggle={toggleWarehouse} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-text-secondary">Ningún C.O. coincide con «{query.trim()}».</li>}
          </ul>
          {withWarehouses && (
            <p className="mx-2 mt-1 border-t border-border pt-1.5 pb-1 text-xs text-text-secondary">
              Sin bodegas principales ni puntuales marcadas, el C.O. usa sus bodegas de siempre. Las promocionales se suman a ellas:
              cuentan en las existencias y, si tienen existencia, entran al mayor costo. En SIESA el costo promedio es por
              instalación, así que las bodegas cambian sobre todo qué existencias cuentan.
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {costliest ? `Más costoso: ${costCentersLabel([costliest], options)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
