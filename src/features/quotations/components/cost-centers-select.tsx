"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

import { useBillingCenters, useCostCentersComparison } from "../hooks/use-quotations";
import type { BillingCenter, Quotation, WarehouseClass, WarehouseGroup } from "../types/quotations.types";
import { centerLabel } from "./billing-center-select";

export const NATIONAL_LABEL = "Nacional";
/** From this many centers on, the panel gets a search box. */
const SEARCH_FROM = 8;

/** Where the cost comes from: the centers by code (none is Nacional) and the warehouse groups ticked inside them. */
export interface CostChoice {
  centers: string[];
  groups: WarehouseGroup[];
}

const groupKey = (group: WarehouseGroup) => `${group.center_code}:${group.classification}`;
const groupKeys = (choice: CostChoice) => choice.groups.map(groupKey).sort().join();

export const sameChoice = (a: CostChoice, b: CostChoice) => a.centers.join() === b.centers.join() && groupKeys(a) === groupKeys(b);

/** The groups in the order the panel lists them. */
const CLASS_ORDER: WarehouseClass[] = ["BP", "BSP", "PROMO"];

const GROUP_LABELS: Record<WarehouseClass, { full: string; short: string }> = {
  BP: { full: "Bodegas principales", short: "principales" },
  BSP: { full: "Bodegas solicitudes puntuales", short: "puntuales" },
  PROMO: { full: "Bodegas promocionales", short: "promocionales" },
};

/** The groups a center has, each with its warehouses' codes. */
function centerGroups(center: BillingCenter): { classification: WarehouseClass; codes: string[] }[] {
  return CLASS_ORDER.flatMap((classification) => {
    const codes = (center.warehouses ?? []).filter((warehouse) => warehouse.classification === classification).map((warehouse) => warehouse.code);
    return codes.length > 0 ? [{ classification, codes }] : [];
  });
}

/**
 * What the quotation has chosen. Before the groups existed a quotation kept loose warehouses
 * (`cost_warehouses`, `cost_warehouse_groups` empty): each one turns its group on, by the class
 * the centers master gives it. Applying again sends the whole groups.
 */
export function quotationChoice(
  quotation: Pick<Quotation, "cost_centers" | "cost_warehouses" | "cost_warehouse_groups">,
  centers: BillingCenter[] | undefined
): CostChoice {
  const chosen = quotation.cost_warehouse_groups ?? [];
  if (chosen.length > 0 || (quotation.cost_warehouses ?? []).length === 0) {
    return { centers: quotation.cost_centers, groups: chosen.map(({ center_code, classification }) => ({ center_code, classification })) };
  }
  const loose = new Set(quotation.cost_warehouses);
  const groups = (centers ?? [])
    .filter((center) => quotation.cost_centers.includes(center.code))
    .flatMap((center) =>
      centerGroups(center)
        .filter((group) => group.codes.some((code) => loose.has(code)))
        .map((group) => ({ center_code: center.code, classification: group.classification }))
    );
  return { centers: quotation.cost_centers, groups };
}

/** How a choice reads: "Nacional", "001 · ANTIOQUIA" or "001 · ANTIOQUIA, 003 · CENTRO". */
export function costCentersLabel(codes: string[], centers: BillingCenter[] | undefined): string {
  if (codes.length === 0) return NATIONAL_LABEL;
  const byCode = new Map((centers ?? []).map((center) => [center.code, center]));
  return codes.map((code) => (byCode.has(code) ? centerLabel(byCode.get(code)!) : code)).join(", ");
}

/** A center's ticked groups, short: "principales, promocionales". */
function groupsText(choice: CostChoice, code: string): string {
  return CLASS_ORDER.filter((classification) =>
    choice.groups.some((group) => group.center_code === code && group.classification === classification)
  )
    .map((classification) => GROUP_LABELS[classification].short)
    .join(", ");
}

/** The short form, by code, with each center's ticked groups: "001 · principales, promocionales; 003". */
export function costChoiceCodes(choice: CostChoice): string {
  if (choice.centers.length === 0) return NATIONAL_LABEL;
  return choice.centers
    .map((code) => {
      const groups = groupsText(choice, code);
      return groups ? `${code} · ${groups}` : code;
    })
    .join("; ");
}

/**
 * Where the cost of every line comes from: Nacional, alone, or one or more
 * operation centers. Nacional and the centers exclude each other: ticking
 * Nacional clears the centers, ticking a center clears Nacional, and leaving
 * no center ticked is Nacional again. A ticked center that has warehouses
 * opens its groups underneath (principales, solicitudes puntuales,
 * promocionales), never single warehouses: the API opens each group into its
 * warehouses. Ticking principal or one-off groups narrows the center to them,
 * ticking none keeps its usual ones; the promotional group adds on top. With two or more centers ticked, the
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
  const comparison = useCostCentersComparison(quotation.id, quotation.version, value.centers, value.groups);
  const costliest = value.centers.length > 1 ? comparison.data?.highest ?? null : null;
  const { containerRef, triggerRef, isOpen, setIsOpen } = useDismissablePanel<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const options = centers.data ?? [];
  const selected = new Set(value.centers);
  const ticked = new Set(value.groups.map(groupKey));
  const q = query.trim().toLowerCase();
  const shown = q === "" ? options : options.filter((center) => centerLabel(center).toLowerCase().includes(q));
  const national = value.centers.length === 0;
  const withWarehouses = options.some((center) => selected.has(center.code) && (center.warehouses?.length ?? 0) > 0);

  // Keep the master's order (centers by code, groups BP, BSP, PROMO), not the clicking order.
  const emit = (nextCenters: Set<string>, nextGroups: Set<string>) => {
    const chosen = options.filter((center) => nextCenters.has(center.code));
    onChange({
      centers: chosen.map((center) => center.code),
      groups: chosen.flatMap((center) =>
        centerGroups(center)
          .map((group) => ({ center_code: center.code, classification: group.classification }))
          .filter((group) => nextGroups.has(groupKey(group)))
      ),
    });
  };

  // A center left unticked takes its groups with it: `emit` only keeps those of ticked centers.
  const toggleCenter = (code: string) => {
    const next = new Set(selected);
    if (!next.delete(code)) next.add(code);
    emit(next, ticked);
  };

  const toggleGroup = (key: string) => {
    const next = new Set(ticked);
    if (!next.delete(key)) next.add(key);
    emit(selected, next);
  };

  const groupsNote = value.centers.length === 1 && groupsText(value, value.centers[0]) ? ` · ${groupsText(value, value.centers[0])}` : "";
  const summary = centers.isPending
    ? "Cargando los C.O.…"
    : centers.isError
      ? "No se pudieron cargar los C.O."
      : value.centers.length > 1
        ? `${value.centers.length} C.O.: ${costChoiceCodes(value)}`
        : `${costCentersLabel(value.centers, options)}${groupsNote}`;

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
        title={value.centers.length > 1 || value.groups.length > 0 ? costChoiceCodes(value) : undefined}
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
              onChange={() => onChange({ centers: [], groups: [] })}
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
              const groups = centerGroups(center);
              const open = selected.has(center.code) && groups.length > 0;
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
                      {groups.map((group) => {
                        const key = groupKey({ center_code: center.code, classification: group.classification });
                        const codes = group.codes.join(", ");
                        return (
                          <label
                            key={key}
                            className="flex min-h-7 cursor-pointer items-center gap-2 rounded-sm px-2 text-[13px] hover:bg-canvas-subtle max-md:min-h-11"
                          >
                            <input
                              type="checkbox"
                              checked={ticked.has(key)}
                              onChange={() => toggleGroup(key)}
                              className="size-4 shrink-0 accent-[var(--primary)]"
                            />
                            <span className="shrink-0">{GROUP_LABELS[group.classification].full}</span>
                            {/* Which warehouses the group opens into; the API keeps that breakdown. */}
                            <span className="min-w-0 flex-1 truncate text-right font-mono text-xs text-text-secondary" title={codes}>
                              {codes}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-text-secondary">Ningún C.O. coincide con «{query.trim()}».</li>}
          </ul>
          {withWarehouses && (
            <p className="mx-2 mt-1 border-t border-border pt-1.5 pb-1 text-xs text-text-secondary">
              Sin grupos principales ni puntuales marcados, el C.O. usa sus bodegas de siempre. Las promocionales se suman a ellas:
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
