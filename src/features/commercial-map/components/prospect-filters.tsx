"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

import { formatCount, VISIT_STATUS_LABEL, VISIT_STATUSES } from "../lib/format";
import { categoryColor } from "../lib/prospect-features";
import type {
  PaletteKey,
  ProspectFacets,
  ProspectFilters,
  VisitStatus,
  ZoneCollection,
} from "../types/commercial-map.types";
import { ColorDot } from "./prospect-marks";

const TALL = "max-md:[&_[data-slot=dropdown-trigger]]:h-11";

const STATUS_OPTIONS = VISIT_STATUSES.map((status) => ({ value: status, label: VISIT_STATUS_LABEL[status] }));

export function hasActiveFilters(filters: ProspectFilters, search: string): boolean {
  return (
    search.trim() !== "" ||
    Boolean(filters.source_zone || filters.category || filters.zone_id || filters.visit_status) ||
    filters.former === true
  );
}

/**
 * Narrows the map and the list together. «Zona del archivo» is the sheet a
 * prospect came in; «Zona comercial» is the area JDH drew around it.
 */
export default function ProspectFilterPanel({
  filters,
  onChange,
  search,
  onSearchChange,
  facets,
  zones,
  colors,
  onClear,
}: {
  filters: ProspectFilters;
  onChange: (patch: Partial<ProspectFilters>) => void;
  search: string;
  onSearchChange: (text: string) => void;
  facets: ProspectFacets | undefined;
  zones: ZoneCollection | undefined;
  colors: Map<string, PaletteKey>;
  onClear: () => void;
}) {
  const sheetOptions = (facets?.source_zones ?? []).map((sheet) => ({
    value: sheet.value,
    label: `${sheet.value} (${formatCount(sheet.count)})`,
  }));
  const zoneOptions = (zones?.features ?? []).map((zone) => ({
    value: zone.properties.id,
    label: `${zone.properties.name} (${formatCount(zone.properties.prospect_count)})`,
  }));

  return (
    <section aria-label="Filtros de prospectos" className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nombre, dirección o ID"
          aria-label="Buscar prospectos por nombre, dirección o ID"
          className="pl-8 max-md:h-11"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 [&>*]:min-w-0">
        <Dropdown
          aria-label="Zona del archivo"
          options={sheetOptions}
          value={filters.source_zone ?? ""}
          onValueChange={(value) => onChange({ source_zone: value || undefined })}
          placeholder="Todas las zonas del archivo"
          clearable
          clearLabel="Quitar el filtro de zona del archivo"
          className={TALL}
        />
        {zoneOptions.length > 0 && (
          <Dropdown
            aria-label="Zona comercial"
            options={zoneOptions}
            // `zone_id` may also hold an official zone picked on the map: that one is not in this list.
            value={zoneOptions.some((zone) => zone.value === filters.zone_id) ? (filters.zone_id as string) : ""}
            onValueChange={(value) => onChange({ zone_id: value || undefined })}
            placeholder="Todas las zonas comerciales"
            clearable
            clearLabel="Quitar el filtro de zona comercial"
            className={TALL}
          />
        )}
        <Dropdown
          aria-label="Resultado de la visita"
          options={STATUS_OPTIONS}
          value={filters.visit_status ?? ""}
          onValueChange={(value) => onChange({ visit_status: (value as VisitStatus) || undefined })}
          placeholder="Cualquier resultado de visita"
          clearable
          clearLabel="Quitar el filtro de resultado"
          className={TALL}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría y tipo de prospecto">
        {(facets?.categories ?? []).map((category) => (
          <ToggleChip
            key={category.value}
            active={filters.category === category.value}
            onClick={() =>
              onChange({ category: filters.category === category.value ? undefined : category.value })
            }
            count={category.count}
          >
            <ColorDot color={categoryColor(colors, category.value)} />
            {category.value}
          </ToggleChip>
        ))}
        <ToggleChip active={filters.former === true} onClick={() => onChange({ former: filters.former ? undefined : true })}>
          Solo ex-clientes
        </ToggleChip>
      </div>

      {hasActiveFilters(filters, search) && (
        <Button variant="ghost" size="sm" onClick={onClear} className="max-md:h-11">
          <X aria-hidden="true" /> Limpiar filtros
        </Button>
      )}
    </section>
  );
}
