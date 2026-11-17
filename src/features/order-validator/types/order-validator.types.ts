import type { Decimal } from "@/shared/lib/format";

/** A line is ready or pending; an order can also be `liberado`, once a person marks it. */
export type ValidationStatus = "listo_para_liberar" | "pendiente_validacion" | "liberado";

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

/** A warning on an order or a line. Older API builds send none. */
export type AlertCode = "margen_100" | "bajo_objetivo" | "falta_impuesto_licor";

/** Labels come from the API so the UI never spells a status, a reason or an alert by hand. */
export interface ValidatorCatalogs {
  statuses: StatusEntry[];
  reasons: ReasonEntry[];
  alerts?: { value: AlertCode; label: string }[];
}

/** An order's warning, with the file rows (`row_number` of its lines) behind it. */
export interface OrderAlert {
  code: AlertCode;
  label: string;
  message: string;
  row_numbers: number[];
}

/** What a rule does: releases, holds, warns, or only explains how something is computed. */
export type RuleEffect = "libera" | "retiene" | "alerta" | "informa";

export interface ValidatorRule {
  code: string;
  title: string;
  description: string;
  effect: RuleEffect;
  /** The values in force, already formatted by the API ("18 %", "2", "4"). */
  parameters: Record<string, string>;
}

/** `linea`, `pedido`, `aprobacion`, in the order the validator applies them. */
export interface RuleSection {
  code: string;
  title: string;
  rules: ValidatorRule[];
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
  /** Orders a person marked as released; counted in neither ready nor pending. Older API builds send none. */
  released_order_count?: number;
  /**
   * Points added to each order's margin before it is compared with its target:
   * an order at 19.5% against 20% with a threshold of 0.50 is released. It acts
   * on the order, never on a line. A decimal string such as "0.50", 0 to 20.
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
}

export type ReleaseBasis = "lineas" | "manual" | "margen" | "tolerancia";

/** Which of the product's margins the line was compared against. */
export type MarginBasis = "lista" | "mayoristas" | "salsamentarias" | "masivo_food" | "market";

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
  /**
   * True only when the product has liquor tax in the master and the line came
   * without it (empty or 0). Absent or false means there is nothing to flag.
   */
  liquor_tax?: boolean;
  /** What the line should have carried per unit; only with `liquor_tax`. */
  liquor_tax_amount?: Decimal | null;
  /** What the file carried in "Vlr. imp. IMPTOLIC" per unit; null when the file has no such column. */
  liquor_tax_value?: Decimal | null;
  /**
   * The margin this line brings to the order's margin: with its support when an
   * active support with money decided it, otherwise the file's `margin_pct`.
   */
  order_margin_pct?: Decimal | null;
  /** Points (as a fraction, 0.05 is 5 points) below its target with its support; null when not below. */
  points_below_target?: Decimal | null;
  alerts?: AlertCode[];
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
  /** The order's margin weighted by value, and the target weighted the same way. */
  margin_pct: Decimal | null;
  required_margin_pct: Decimal | null;
  /** `margin_pct` plus the file's threshold; only present when the threshold is above zero. */
  margin_with_threshold_pct?: Decimal | null;
  /**
   * Why the order is ready: all its lines are, a person approved it, its margin
   * reaches the target, or it falls within the tolerance. Null while pending.
   */
  release_basis?: ReleaseBasis | null;
  /**
   * True when the order is ready only because the threshold was added to its
   * margin: without it the margin alone would not release it. It follows the
   * threshold being tried or the saved one.
   */
  released_by_threshold?: boolean;
  /** Lines of the order with no support at all. */
  without_support_line_count?: number;
  /** True when some line is missing its liquor tax; the rest leave it out. */
  has_liquor_tax?: boolean;
  alerts?: OrderAlert[];
  lines: OrderLine[];
}

export interface OrderPage {
  items: ValidationOrder[];
  total: number;
  page: number;
  size: number;
  /** Orders per status for the current search, before the status filter is applied. */
  counts: Partial<Record<ValidationStatus, number>>;
  /** Every operation center (C.O. factura) of the file, by code, whatever the filters. Older API builds send none. */
  operation_centers?: OperationCenterCount[];
}

export interface OperationCenterCount {
  code: string;
  order_count: number;
}

export interface OrderParams {
  batchId: string;
  status: ValidationStatus | "";
  /** Points of a threshold to try without saving it; empty uses the saved one. */
  thresholdPreview: string;
  q: string;
  /** One operation center's orders; empty for all. */
  operationCenter: string;
  page: number;
  size: number;
}
