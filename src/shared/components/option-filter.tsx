"use client";

import { useId } from "react";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

/** One filterable dropdown in a filter row; the placeholder stands in for the hidden label, and empty is every value. */
export default function OptionFilter({
  label,
  allLabel,
  value,
  options,
  loading,
  onChange,
}: {
  label: string;
  /** What the empty value reads as: «Todos los C.O.». */
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
