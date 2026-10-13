import type { Decimal } from "@/shared/lib/format";

export type ValidationStatus = "listo_para_liberar" | "pendiente_validacion";

export type CheckOutcome = "cumple" | "no_cumple" | "no_evaluable";

export interface StatusEntry {
  value: ValidationStatus;
  label: string;
}

export interface ReasonEntry {
  value: string;
  label: string;
  status: ValidationStatus;
}

/** Labels come from the API so the UI never spells a status or a reason by hand. */
export interface ValidatorCatalogs {
  statuses: StatusEntry[];
  reasons: ReasonEntry[];
}

export interface ValidationBatch {
  id: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  validated_by: string | null;
  validated_at: string | null;
  line_count: number;
  order_count: number;
  ready_line_count: number;
  pending_line_count: number;
  ready_order_count: number;
  pending_order_count: number;
  /**
   * Points of margin a line may fall short and still be released: 19.5% against
   * 20% with a threshold of 0.50 releases. A decimal string such as "0.50".
   */
  margin_threshold_points: Decimal;
}

export interface BatchPage {
  items: ValidationBatch[];
  total: number;
  page: number;
  size: number;
}

export interface SupportCheck {
  support_id: string;
  kind: string | null;
  calc_method: string | null;
  program: string | null;
  valid_from: string | null;
  valid_to: string | null;
  needs_review: boolean;
  outcome: CheckOutcome;
  detail: string | null;
  effective_margin_pct: Decimal | null;
  required_margin_pct: Decimal | null;
  /** The check passed only because of the batch's margin threshold. */
  threshold_applied: boolean;
}

/** Which of the product's margins the line was compared against. */
export type MarginBasis = "lista" | "mayoristas" | "salsamentarias";

export interface OrderLine {
  id: string;
  row_number: number;
  sku: string | null;
  description: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  unit_price: Decimal | null;
  quantity: Decimal | null;
  /** Margin the order carries in SIESA, as a fraction: 0.145 is 14.5%. */
  margin_pct: Decimal | null;
  price_list: string | null;
  warehouse: string | null;
  problems: string[];
  status: ValidationStatus;
  status_label: string;
  reason: string;
  reason_label: string;
  detail: string | null;
  /** The support that decided the line, when one did. */
  support_id: string | null;
  effective_margin_pct: Decimal | null;
  required_margin_pct: Decimal | null;
  /** Null when no product margin was used, e.g. a support decided on its own. */
  margin_basis: MarginBasis | null;
  /** The product carries liquor consumption tax; the order may have been keyed without it. */
  liquor_tax: boolean;
  liquor_tax_amount: Decimal | null;
  checks: SupportCheck[];
}

/**
 * A person moved a pending order to ready. The API keeps who, when and why;
 * while it is set the order's `status` is ready and the lines keep the
 * decision the validation gave them.
 */
export interface ManualApproval {
  approved_by: string;
  approved_at: string;
  note: string | null;
}

export interface ValidationOrder {
  document: string;
  status: ValidationStatus;
  status_label: string;
  /** Absent or null when the order stands on the validation alone. */
  manual_approval?: ManualApproval | null;
  order_date: string | null;
  operation_center: string | null;
  status_text: string | null;
  customer_nit: string | null;
  customer_name: string | null;
  salesperson: string | null;
  channel: string | null;
  line_count: number;
  ready_line_count: number;
  total_amount: Decimal | null;
  /** The order's margin weighted by value, and the target weighted the same way. Informative: the decision is per line. */
  margin_pct: Decimal | null;
  required_margin_pct: Decimal | null;
  has_liquor_tax: boolean;
  lines: OrderLine[];
}

export interface OrderPage {
  items: ValidationOrder[];
  total: number;
  page: number;
  size: number;
  /** Orders per status for the current search, before the status filter is applied. */
  counts: Record<ValidationStatus, number>;
}

/** `attention` lists orders with a line that has no support first, then by margin; `file` keeps the report's order. */
export type OrderSort = "attention" | "file";

export interface OrderParams {
  batchId: string;
  status: ValidationStatus | "";
  reason: string;
  /** "true" or "false" to filter on liquor tax; empty for all. */
  liquorTax: string;
  sort: OrderSort;
  q: string;
  page: number;
  size: number;
}
