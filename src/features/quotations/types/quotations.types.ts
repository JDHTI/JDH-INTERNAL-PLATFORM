/*
 * Contract of /api/v1/quotations (docs/cotizador.md). Money and margins travel
 * as decimal strings; margins and variation are fractions (0.18 is 18 %).
 */

/** "123.4500"; never parsed for arithmetic the API already did. */
export type DecimalText = string;

export type QuotationStatus = "borrador" | "generado";

export type WindowMonths = 6 | 12;

/** Whether a new price keeps the margin (with support) within the rule. Null without a new price. */
export type Compliance = "cumple" | "bajo_minimo" | "sin_objetivo" | "sin_costo";

/** Which margin the target comes from: the product's margin for the channel, or the support's own. */
export type MarginBasis = "lista" | "mayoristas" | "salsamentarias" | "apoyo";

export type CustomerScope = "mine" | "all";

export interface Seller {
  code: string;
  name: string;
  email: string;
}

export interface QuotationPermissions {
  can_manage: boolean;
  /** The user's email matches a seller in the DWH, so "mis clientes" has something to list. */
  seller_linked: boolean;
  seller: Seller | null;
}

export interface QuotationCustomer {
  nit: string;
  name: string;
  channel_code: string | null;
  channel: string | null;
  salesperson_code: string | null;
  salesperson_name: string | null;
  branch_count: number;
  active_branch_count: number;
  is_active: boolean;
}

export interface QuotationWarning {
  code: string;
  label: string;
}

export interface QuotationSummary {
  id: string;
  customer_nit: string;
  customer_name: string;
  channel: string | null;
  price_list_id: string | null;
  window_months: WindowMonths;
  status: QuotationStatus;
  status_label: string;
  line_count: number;
  changed_count: number;
  below_rule_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  version: number;
}

export interface QuotationPage {
  items: QuotationSummary[];
  total: number;
  page: number;
  size: number;
}

export interface QuotationListParams {
  mine: boolean;
  status: QuotationStatus | "";
  q: string;
  page: number;
  size: number;
}

export interface LineSupport {
  support_id: string;
  kind: string | null;
  calc_method: string | null;
  program: string | null;
  /** Support per inventory unit, in pesos. */
  amount: DecimalText | null;
  share_of_cost: DecimalText | null;
  required_margin_pct: DecimalText | null;
  detail: string | null;
  conditions: string | null;
  needs_review: boolean;
  valid_from: string | null;
  valid_to: string | null;
}

/** A support that would cover the line and was not applied, with the reason. */
export interface SupportCandidate {
  support_id: string;
  calc_method: string | null;
  program: string | null;
  reason: string;
}

export interface QuotationLine {
  sku: string;
  description: string | null;
  unit: string | null;
  pack_factor: DecimalText | null;
  supplier_code: string | null;
  supplier_name: string | null;
  /** Net, before VAT, per inventory unit. */
  last_price: DecimalText | null;
  last_gross_price: DecimalText | null;
  last_discount_pct: DecimalText | null;
  last_sale_date: string | null;
  last_document: string | null;
  last_sale_unit: string | null;
  last_quantity: DecimalText | null;
  sales_in_window: number | null;
  list_price: DecimalText | null;
  /** Still sent, never shown: the quotation works before VAT. */
  vat_pct?: DecimalText | null;
  /** Liquor consumption tax only (`0011` imported, `0024` national); null for every other product. */
  value_tax_key: string | null;
  value_tax_name: string | null;
  value_tax_amount: DecimalText | null;
  cost: DecimalText | null;
  cost_is_global: boolean;
  target_margin_pct: DecimalText | null;
  margin_basis: MarginBasis | null;
  /** The API's own words for `margin_basis`, ready to show. */
  margin_basis_label: string | null;
  min_margin_pct: DecimalText | null;
  support: LineSupport | null;
  support_candidates: SupportCandidate[];
  current_margin_pct: DecimalText | null;
  current_margin_with_support_pct: DecimalText | null;
  min_price: DecimalText | null;
  new_price: DecimalText | null;
  new_margin_pct: DecimalText | null;
  new_margin_with_support_pct: DecimalText | null;
  variation_pct: DecimalText | null;
  compliance: Compliance | null;
  compliance_label: string | null;
  /** New (or last) price plus the liquor tax, without VAT; null on an added line with no new price. */
  price_with_taxes: DecimalText | null;
  problems: string[];
  problem_labels: string[];
  /** `historico`: from the sales window. `agregado`: added by the advisor, with `last_*` null. */
  origin: LineOrigin;
  origin_label: string;
}

export type LineOrigin = "historico" | "agregado";

export interface Quotation extends QuotationSummary {
  channel_code: string | null;
  price_list_name: string | null;
  /** Active customers on the same SIESA list: a price written there reaches all of them. */
  price_list_customers: number | null;
  billing_center_code: string | null;
  salesperson_code: string | null;
  salesperson_name: string | null;
  built_at: string;
  cost_cut_date: string | null;
  activation_date: string | null;
  export_price_list_id: string | null;
  max_points_below_target: DecimalText | null;
  warnings: QuotationWarning[];
  generated_by: string | null;
  updated_by: string | null;
  lines: QuotationLine[];
}

export interface LinePrice {
  sku: string;
  /** Null removes the new price; up to 4 decimals. */
  new_price: DecimalText | null;
}

export interface GenerateOptions {
  activation_date?: string;
  price_list_id?: string;
}

/** `/quotations/rules`, shaped like `/order-validations/rules`. */
export interface QuotationRule {
  code: string;
  title: string;
  description: string;
  effect: string;
  /** Values in force, already formatted by the API. */
  parameters: Record<string, string>;
}

export interface QuotationRuleSection {
  code: string;
  title: string;
  rules: QuotationRule[];
}
