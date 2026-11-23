"use client";

import { useId, useMemo } from "react";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import type { CostReason } from "../types/costs.types";

/** Narrows a list to the lines with one reason; empty is every line. */
export default function ReasonFilter({
  reasons,
  value,
  onChange,
}: {
  reasons: CostReason[] | undefined;
  value: string;
  onChange: (reasonId: string) => void;
}) {
  const id = useId();
  const options = useMemo(() => (reasons ?? []).map((reason) => ({ value: reason.id, label: reason.name })), [reasons]);
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Motivo
      </label>
      <SearchableDropdown
        id={id}
        value={value}
        options={options}
        onValueChange={onChange}
        placeholder={reasons ? "Todos los motivos" : "Cargando motivos…"}
        emptyMessage="Ningún motivo con ese texto."
        clearLabel="Quitar el motivo del filtro"
        disabled={!reasons}
      />
    </div>
  );
}
