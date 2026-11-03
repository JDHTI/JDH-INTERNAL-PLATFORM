/*
 * Contract of /api/v1/quotations (docs/cotizador.md). Money and margins travel
 * as decimal strings; margins and variation are fractions (0.18 is 18 %).
 * New prices are whole pesos.
 */

/** "123.4500"; never parsed for arithmetic the API already did. */
export type DecimalText = string;

/**
 * borrador: the advisor edits. pendiente_validacion: confirmed, locked until
 * the validating area acts. actualizada / creada: validated; the files are out,
 * for the customer's own list or a new one. Any edit goes back to borrador.
 */
export type QuotationStatus = "borrador" | "pendiente_validacion" | "creada" | "actualizada";

/** Write into the customer's SIESA list, or create a new one. List 1 always creates. */
export type ListAction = "actualizacion" | "creacion";

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
  /** Commercial: quotes and edits. */
  can_manage: boolean;
  /** The validating area (BI) or an administrator: validates or returns, reads every quotation. */
  can_validate: boolean;
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
  list_action: ListAction | null;
  list_action_label: string | null;
  /** The list the files write to: the customer's on an update, the new code on a creation. */
  export_price_list_id: string | null;
  line_count: number;
  changed_count: number;
  /** Active lines with a new price that does not pass the rule: what blocks confirming. */
  below_rule_count: number;
  /** Lines whose last price leaves the margin (with support) under the minimum. */
  below_target_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  validated_at: string | null;
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

export type CostSource = "cotizacion" | "inventario";

export interface QuotationLine {
  sku: string;
  description: string | null;
  unit: string | null;
  pack_factor: DecimalText | null;
  /** False when SIESA has it inactive: shown to replace it, never exported. */
  is_active: boolean;
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
  /** The higher of the supplier's quote and the inventory cost, rounded up, times the list family factor. */
  cost: DecimalText | null;
  cost_source: CostSource | null;
  cost_source_label: string | null;
  quote_cost: DecimalText | null;
  inventory_cost: DecimalText | null;
  /** A supplier quote over 3x the median cost: a capture error in SIESA, not used. */
  discarded_quote_cost: DecimalText | null;
  target_margin_pct: DecimalText | null;
  margin_basis: MarginBasis | null;
  /** The API's own words for `margin_basis`, ready to show. */
  margin_basis_label: string | null;
  min_margin_pct: DecimalText | null;
  support: LineSupport | null;
  support_candidates: SupportCandidate[];
  current_margin_pct: DecimalText | null;
  current_margin_with_support_pct: DecimalText | null;
  /** Lowest price that passes the rule, whole pesos. */
  min_price: DecimalText | null;
  /** Price that gives exactly the target margin, whole pesos. */
  optimal_price: DecimalText | null;
  /** The last price leaves the margin (with support) under the minimum: review and update. */
  below_target: boolean;
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
  regional: string | null;
  regional_label: string | null;
  price_family: string | null;
  price_family_label: string | null;
  /** The warehouses the cost comes from, as the API words it. */
  stock_source: string | null;
  salesperson_code: string | null;
  salesperson_name: string | null;
  built_at: string;
  cost_cut_date: string | null;
  activation_date: string | null;
  new_list_name: string | null;
  max_points_below_target: DecimalText | null;
  warnings: QuotationWarning[];
  confirmed_by: string | null;
  validated_by: string | null;
  /** Why the validating area (or the advisor) returned it to draft. */
  review_note: string | null;
  updated_by: string | null;
  lines: QuotationLine[];
}

/**
 * What `POST /lines` did with a pasted list or a selection. Only a list where
 * nothing served is refused (422); otherwise the bad references are reported.
 */
export interface ImportResult {
  added: string[];
  /** Already in the quotation: cost, target, support and liquor tax refreshed, new price kept. */
  revalidated: string[];
  not_found: string[];
  inactive: string[];
  /** How many references appeared more than once in the paste. */
  repeated: number;
}

/** A line the API could not price (no cost, unreadable row), with the template row when there is one. */
export interface SkippedLine {
  sku: string | null;
  reason: string;
  row_number?: number | null;
}

/** What an uploaded template did, reference by reference. */
export interface TemplateResult {
  updated: string[];
  cleared: string[];
  added: string[];
  /** A count, not a list: most rows of a template come back untouched. */
  unchanged: number;
  not_found: string[];
  inactive: string[];
  skipped: SkippedLine[];
}

/** Writes answer with the whole quotation plus what they did. */
export interface QuotationWithImport extends Quotation {
  import_result?: ImportResult;
  skipped?: SkippedLine[];
  template_result?: TemplateResult;
}

export interface LineImport {
  /** What the advisor pasted, as is: the API splits and normalizes it. */
  text?: string;
  skus?: string[];
}

/**
 * One line of `PUT /lines`: a price in whole pesos (null removes it), or a
 * margin as a fraction that the API turns into the price of that margin.
 */
export type LineChange = { sku: string; new_price: DecimalText | null } | { sku: string; margin_pct: DecimalText };

export interface ConfirmOptions {
  list_action?: ListAction;
  /** Only on a creation: the new list's code, 1 to 3 letters or digits. */
  price_list_id?: string;
  /** Only on a creation: up to 40 characters; the API defaults to "COTIZADOR <cliente>". */
  new_list_name?: string;
  activation_date?: string;
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
