import type { DropdownOption } from "@/shared/components/ui/dropdown";

import type { SupplierRow } from "../types/support-settlements.types";

/** The month's suppliers with a code, for a filter; the API filters by code. */
export function supplierOptions(rows: SupplierRow[]): DropdownOption[] {
  return rows
    .filter((row): row is SupplierRow & { supplier_code: string } => row.supplier_code !== null)
    .map((row) => ({ value: row.supplier_code, label: row.supplier_name ?? row.supplier_code }));
}
