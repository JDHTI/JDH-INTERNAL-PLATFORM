import type { DropdownOption } from "@/shared/components/ui/dropdown";

import type { SupplierRow } from "../types/support-settlements.types";

/** What the API takes as `supplier_code` for the rows without a supplier code in the masters. */
export const NO_SUPPLIER_CODE = "__none__";

/** The supplier filter value of a row: its code, or the API's marker when it has none. */
export const supplierFilterCode = (row: { supplier_code: string | null }) => row.supplier_code ?? NO_SUPPLIER_CODE;

export const supplierLabel = (row: { supplier_name: string | null; supplier_code: string | null }) =>
  row.supplier_name ?? row.supplier_code ?? "Sin proveedor en el maestro";

/** The month's suppliers for a filter, the one without a code included. */
export function supplierOptions(rows: SupplierRow[]): DropdownOption[] {
  return rows.map((row) => ({ value: supplierFilterCode(row), label: supplierLabel(row) }));
}
