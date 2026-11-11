"use client";

import { useId, useMemo } from "react";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import type { SupplierOption } from "../types/price-increases.types";

/**
 * The commercial supplier of the history and the analysis, picked from the
 * suppliers that have references there: typing narrows the list, it never
 * becomes a filter on its own. Empty is every supplier.
 */
export default function IncreaseSupplierFilter({
  suppliers,
  value,
  onChange,
  disabled = false,
  className = "w-full sm:w-72",
}: {
  suppliers: SupplierOption[] | undefined;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Width: fixed beside other controls; `w-full` in a grid cell. */
  className?: string;
}) {
  const id = useId();
  const options = useMemo(
    () =>
      (suppliers ?? []).map((item) => ({
        value: item.code,
        label: `${item.name ?? "Sin nombre"} · ${item.code}`,
      })),
    [suppliers]
  );
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        Proveedor
      </label>
      <SearchableDropdown
        id={id}
        value={value}
        options={options}
        onValueChange={onChange}
        placeholder={suppliers ? "Todos los proveedores" : "Cargando proveedores…"}
        emptyMessage="Ningún proveedor con ese nombre o código."
        clearLabel="Quitar el proveedor"
        disabled={disabled || !suppliers}
      />
    </div>
  );
}
