import type { Decimal } from "@/shared/lib/format";

/** Up, down or flat: the new cost against the old one. */
export type IncreaseStatus = "subio" | "bajo" | "estable";

/**
 * One cost change a supplier notified for a reference (`/commercial/price-increases`).
 * Description, supplier and category come from the product master; the rest is the
 * purchasing area's history.
 */
export interface PriceIncrease {
  id: string;
  sku: string;
  description: string | null;
  supplier_name: string | null;
  category: string | null;
  /** False for a reference the product master no longer has: the history keeps it. */
  is_known_product: boolean;
  notified_on: string | null;
  /** When SIESA got it; null is pending, and the quoter compares its new cost. */
  system_updated_on: string | null;
  increased_on: string | null;
  supplier_sku: string | null;
  ean: string | null;
  regional: string | null;
  icui_pct: Decimal | null;
  ibua: Decimal | null;
  old_cost_with_tax: Decimal | null;
  old_cost: Decimal | null;
  new_cost: Decimal | null;
  new_cost_with_tax: Decimal | null;
  variation_amount: Decimal | null;
  /** A fraction: 0.165 is 16,5 %. */
  variation_pct: Decimal | null;
  status: IncreaseStatus | null;
  status_label: string | null;
  observations: string | null;
  margin_pct: Decimal | null;
  price: Decimal | null;
  notified: boolean;
  siesa_changed: boolean;
  is_pending: boolean;
  updated_by: string;
  updated_at: string;
}

export interface PriceIncreaseCounts {
  subio: number;
  bajo: number;
  estable: number;
  pendientes: number;
}

export interface PriceIncreasePage {
  items: PriceIncrease[];
  total: number;
  page: number;
  size: number;
  /** Counts of the whole filter, not the page. */
  counts: PriceIncreaseCounts;
  /** May upload the workbook and set the system update date. */
  can_manage: boolean;
}

export interface PriceIncreaseParams {
  q: string;
  status: IncreaseStatus | "";
  /** Only the ones SIESA does not have yet. */
  pending: boolean;
  page: number;
  size: number;
}

export interface PriceIncreaseReport {
  applied: boolean;
  rows_read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicated: number;
  /** References the product master does not have (kept anyway). */
  unknown_skus: number;
  /** Rows without a system update date: the quoter compares them. */
  pending: number;
  issues: { row_number: number; sku: string | null; problem: string }[];
  issues_truncated: boolean;
}
