"use client";

import { useId, useMemo } from "react";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import { formatCo } from "../lib/format";
import type { EntryOptions } from "../types/costs.types";

/** One filterable dropdown; empty is every value. */
function OptionFilter({
  label,
  allLabel,
  value,
  options,
  loading,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
  loading: boolean;
  onChange: (next: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchableDropdown
        id={id}
        value={value}
        options={options}
        onValueChange={onChange}
        placeholder={loading ? "Cargando…" : allLabel}
        emptyMessage="Ninguno con ese texto."
        clearLabel={`Quitar el filtro de ${label.toLowerCase()}`}
        disabled={loading && options.length === 0}
      />
    </div>
  );
}

/** The period's C.O., «003 · Antioquia». */
export function CoFilter({
  options,
  loading,
  value,
  onChange,
}: {
  options: EntryOptions | undefined;
  loading: boolean;
  value: string;
  onChange: (co: string) => void;
}) {
  const items = useMemo(
    () => (options?.cos ?? []).map((co) => ({ value: co.code, label: co.name ? `${formatCo(co.code)} · ${co.name}` : formatCo(co.code) })),
    [options]
  );
  return <OptionFilter label="Centro de operación" allLabel="Todos los C.O." value={value} options={items} loading={loading} onChange={onChange} />;
}

/** The period's warehouses; with a C.O. chosen, only its own. */
export function WarehouseFilter({
  options,
  loading,
  co,
  value,
  onChange,
}: {
  options: EntryOptions | undefined;
  loading: boolean;
  /** The chosen C.O., empty for all. */
  co: string;
  value: string;
  onChange: (warehouse: string) => void;
}) {
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (options?.warehouses ?? [])
      .filter((warehouse) => co === "" || warehouse.co === null || formatCo(warehouse.co) === formatCo(co))
      .filter((warehouse) => !seen.has(warehouse.code) && seen.add(warehouse.code))
      .map((warehouse) => ({ value: warehouse.code, label: warehouse.code }));
  }, [options, co]);
  return <OptionFilter label="Bodega" allLabel="Todas las bodegas" value={value} options={items} loading={loading} onChange={onChange} />;
}
