"use client";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import { useBillingCenters } from "../hooks/use-quotations";
import type { BillingCenter } from "../types/quotations.types";

/** "001 · ANTIOQUIA": the code people know the center by, then its name. */
export function centerLabel(center: Pick<BillingCenter, "code" | "name">): string {
  return center.name ? `${center.code} · ${center.name}` : center.code;
}

/**
 * An operation center from the platform's master, searchable by code or
 * name. The list is short and stable, so it loads once and stays cached.
 */
export default function BillingCenterSelect({
  id,
  value,
  onChange,
  invalid = false,
  disabled = false,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  const centers = useBillingCenters();
  const options = (centers.data ?? []).map((center) => ({
    value: center.code,
    label: centerLabel(center),
  }));
  return (
    <SearchableDropdown
      id={id}
      value={value}
      options={options}
      onValueChange={onChange}
      placeholder={centers.isPending ? "Cargando los C.O.…" : centers.isError ? "No se pudieron cargar los C.O." : "Código o nombre del C.O."}
      emptyMessage="Ningún C.O. coincide."
      disabled={disabled || centers.isPending || centers.isError}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}
