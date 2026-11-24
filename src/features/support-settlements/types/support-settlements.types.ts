import type { Decimal } from "@/shared/lib/format";

/** A month as the API names it: "2026-10". */
export type Period = string;

export interface SettlementPermissions {
  can_read: boolean;
  /** Recalculate and close a month. */
  can_manage: boolean;
  /** Reopen a closed month: BI's leader and the platform administrators. */
  can_reopen: boolean;
}

export type SettlementStatus = "borrador" | "cerrado";

/**
 * What the margin is measured against (API #122): the supplier's quotation in SIESA, or the
 * inventory cost invoiced on the line. Each basis is its own settlement, closed on its own.
 */
export type CostBasis = "cotizacion" | "inventario";

/**
 * A stored month. `amount` is what the suppliers owe; `flagged_amount` what was calculated but
 * not claimed. `net` and `cost` are every sale of the supported references in the month; the
 * margins are fractions (0.18 is 18 %).
 */
export interface Settlement {
  period: Period;
  cost_basis: CostBasis;
  cost_basis_label: string;
  status: SettlementStatus;
  status_label: string;
  amount: Decimal;
  flagged_amount: Decimal;
  net: Decimal;
  cost: Decimal;
  margin: Decimal | null;
  recomposed_margin: Decimal | null;
  sales_read: number;
  supported_lines: number;
  suppliers: number;
  calculated_at: string;
  calculated_by: string;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
}

/** The stored months, plus the current one and the last finished one even when not calculated. */
export interface SettlementPeriod {
  period: Period;
  is_finished: boolean;
  is_current: boolean;
  /** The settlement of the basis asked for; null when that one is not calculated. */
  settlement: Settlement | null;
  /** Every basis calculated for the month, each with its own status. */
  settlements?: Settlement[];
}

interface Totals {
  quantity?: Decimal | null;
  net: Decimal;
  cost: Decimal;
  margin: Decimal | null;
  amount: Decimal;
  recomposed_margin: Decimal | null;
}

export interface SupplierRow extends Totals {
  supplier_code: string | null;
  supplier_name: string | null;
  references: number;
  supported_lines: number;
  flagged_amount: Decimal;
}

export interface SettlementSummary {
  settlement: Settlement;
  /** From the largest support to the smallest. */
  suppliers: SupplierRow[];
}

export interface ReferenceRow extends Totals {
  supplier_code: string | null;
  supplier_name: string | null;
  sku: string;
  description: string | null;
  supported_lines: number;
  flagged_amount: Decimal;
}

export interface SettlementReferences {
  settlement: Settlement;
  references: ReferenceRow[];
}

/** Only «liquidado» adds to what the supplier owes. */
export type ItemStatus =
  | "liquidado"
  | "en_revision"
  | "escalas"
  | "minimo_no_cumplido"
  | "descontado_en_factura"
  | "sin_valor";

/** A support applied to the line, as it was when the month was calculated. */
export interface SettlementItem {
  support_id: string;
  support_version: number;
  kind: string;
  calc_method: string;
  status: ItemStatus;
  status_label: string;
  supplier_value: Decimal | null;
  value_unit: string | null;
  valid_from: string | null;
  valid_to: string | null;
  /** % types only: the negotiated % and the one settled after the discount not given. */
  negotiated_pct: Decimal | null;
  settled_pct: Decimal | null;
  unit_amount: Decimal;
  amount: Decimal;
  detail: string;
}

export interface LineFlag {
  code: string;
  label: string;
}

/** A sale line a support covered. A return comes with negative quantity and values. */
export interface SettlementLine {
  id: string;
  line_key: string;
  sale_date: string;
  document: string | null;
  co: string | null;
  co_name: string | null;
  regional: string | null;
  business_unit: string | null;
  channel: string | null;
  city: string | null;
  salesperson: string | null;
  nit: string | null;
  branch_id: string | null;
  customer_name: string | null;
  business_group: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  sku: string;
  description: string | null;
  warehouse: string | null;
  is_return: boolean;
  reason: string | null;
  quantity: Decimal;
  gross: Decimal;
  net: Decimal;
  cost: Decimal;
  base_unit_cost: Decimal | null;
  /** The supplier's quotation in force, or the invoice's cost when there is none. */
  cost_source: "cotizacion" | "factura";
  amount: Decimal;
  margin: Decimal | null;
  recomposed_margin: Decimal | null;
  flags: LineFlag[];
  items: SettlementItem[];
}

export interface SettlementLinePage {
  items: SettlementLine[];
  total: number;
  page: number;
  size: number;
}

export interface LineParams {
  supplierCode?: string | null;
  sku?: string | null;
  status?: ItemStatus | null;
  page: number;
  size: number;
}

export type BreakdownBy = "regional" | "business_unit" | "salesperson" | "customer";

/** Where the supplier's money goes back, by one dimension. */
export interface BreakdownRow {
  key: string | null;
  name: string | null;
  lines: number;
  net: Decimal;
  cost: Decimal;
  amount: Decimal;
  margin: Decimal | null;
  recomposed_margin: Decimal | null;
}
