"use client";

import { useQuery } from "@tanstack/react-query";

import { Dropdown } from "@/shared/components/ui/dropdown";
import { apiFetch } from "@/shared/lib/api-client";

/** A customer branch: one row of the customer master, or of `/quotations/customers/{nit}/branches`. */
export interface CustomerBranch {
  branch_id: string;
  branch_name: string | null;
  establishment_name: string | null;
  city: string | null;
  is_active: boolean;
}

/** "681 · Éxito Laureles · Medellín", and «inactiva» when it is. */
export function branchLabel(branch: CustomerBranch): string {
  const name = branch.establishment_name || branch.branch_name;
  return [branch.branch_id, name, branch.city, !branch.is_active && "inactiva"].filter(Boolean).join(" · ");
}

/**
 * A NIT's branches from the customer master (`GET /commercial/customers?nit=`, one row per
 * branch), active first. The supports module opens that endpoint; the quoter has its own.
 */
export function useCustomerMasterBranches(nit: string | null) {
  return useQuery({
    queryKey: ["customer-branches", nit],
    queryFn: async () => {
      const page = await apiFetch<{ items: CustomerBranch[] }>("/commercial/customers", { query: { nit: nit ?? "", size: 200 } });
      return [...page.items].sort((a, b) => Number(b.is_active) - Number(a.is_active));
    },
    enabled: nit !== null && nit !== "",
    staleTime: 5 * 60_000,
  });
}

/**
 * Chooses one branch of a NIT, or none: the empty value is `allLabel` («Todo el NIT»). While the
 * branches load, or when they cannot be read, the control is disabled and says so.
 */
export default function BranchSelect({
  id,
  branches,
  value,
  onValueChange,
  allLabel = "Todo el NIT",
  isLoading = false,
  isError = false,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id?: string;
  branches: CustomerBranch[];
  value: string;
  onValueChange: (value: string) => void;
  allLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const unavailable = isLoading || isError;
  return (
    <Dropdown
      id={id}
      className={className}
      value={unavailable ? "" : value}
      onValueChange={onValueChange}
      disabled={unavailable}
      options={[{ value: "", label: isLoading ? "Cargando sucursales…" : isError ? "No se pudieron cargar las sucursales" : allLabel }, ...branches.map((branch) => ({ value: branch.branch_id, label: branchLabel(branch) }))]}
      searchable={branches.length > 8}
      searchPlaceholder="Código, nombre o ciudad"
      emptyMessage="Ninguna sucursal coincide."
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-invalid={invalid}
    />
  );
}
