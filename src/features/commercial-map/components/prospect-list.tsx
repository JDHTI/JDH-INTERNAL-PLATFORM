"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { CloudOff, MapPinOff, RefreshCw, SearchX } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { categoryColor } from "../lib/prospect-features";
import type { Page, PaletteKey, ProspectSummary } from "../types/commercial-map.types";
import { ProspectMark } from "./prospect-marks";

/**
 * The prospects on the map, by name. It is also the keyboard's way to every
 * prospect: the marks on the canvas cannot take focus, these rows can.
 */
export default function ProspectList({
  query,
  colors,
  selectedId,
  onSelect,
  onPageChange,
  filtered,
  onClear,
  emptyHint,
}: {
  query: UseQueryResult<Page<ProspectSummary>>;
  colors: Map<string, PaletteKey>;
  selectedId: string | null;
  onSelect: (prospect: ProspectSummary) => void;
  onPageChange: (page: number) => void;
  /** Whether a filter is on: an empty list then means the filter found nothing. */
  filtered: boolean;
  onClear: () => void;
  /** What to do when there are no prospects at all. */
  emptyHint: React.ReactNode;
}) {
  if (query.isPending) return <TableSkeleton rows={8} label="Cargando los prospectos" />;

  if (query.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo cargar la lista de prospectos"
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }

  const { items, total, page, size } = query.data;

  if (items.length === 0) {
    return filtered ? (
      <StatePanel
        icon={SearchX}
        title="Ningún prospecto coincide con los filtros"
        action={
          <Button variant="outline" onClick={onClear}>
            Limpiar filtros
          </Button>
        }
      >
        Prueba con otra zona o quita la búsqueda.
      </StatePanel>
    ) : (
      <StatePanel icon={MapPinOff} title="Todavía no hay prospectos con ubicación">
        {emptyHint}
      </StatePanel>
    );
  }

  return (
    <div className="space-y-2">
      <ul className={cn("divide-y divide-border rounded-lg border border-border", query.isPlaceholderData && "opacity-60")}>
        {items.map((prospect) => {
          const selected = prospect.id === selectedId;
          return (
            <li key={prospect.id}>
              <button
                type="button"
                onClick={() => onSelect(prospect)}
                aria-current={selected ? "true" : undefined}
                data-prospect={prospect.id}
                className={cn(
                  "flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left transition-colors duration-150",
                  "first:rounded-t-lg last:rounded-b-lg hover:bg-primary-subtle",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  selected && "bg-primary-subtle"
                )}
              >
                <ProspectMark
                  color={categoryColor(colors, prospect.category)}
                  former={prospect.is_former_customer}
                  approximate={prospect.location_quality === "approximate"}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{prospect.name}</span>
                  <span className="block truncate text-[13px] text-text-secondary">
                    {[prospect.address ?? prospect.sector, prospect.source_zone].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Pager page={page} size={size} total={total} count={items.length} onPageChange={onPageChange} />
    </div>
  );
}
