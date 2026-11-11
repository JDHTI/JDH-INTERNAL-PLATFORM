/*
 * Contract of /api/v1/quotations (docs/cotizador.md). Money and margins travel
 * as decimal strings; margins and variation are fractions (0.18 is 18 %).
 * New prices are whole pesos.
 */

/** "123.4500"; never parsed for arithmetic the API already did. */
export type DecimalText = string;

/**
 * borrador: the advisor edits. pendiente_validacion: confirmed, locked until
 * the validating area acts. pendiente_carga: validated, the files are out and
 * the validator has to load them into SIESA. cargada: the validator confirmed
 * it is loaded. Any edit goes back to borrador. `list_action` says whether the
 * customer's list is written over or a new one created.
 */
export type QuotationStatus = "borrador" | "pendiente_validacion" | "pendiente_carga" | "cargada";

/** A customer SIESA does not have yet, registered on the quotation itself to quote from scratch. */
export interface TemporaryCustomer {
  name: string;
  legal_name: string;
  trade_name: string | null;
  nit: string | null;
}

/** An operation center from the platform's master, to quote from. */
export interface BillingCenter {
  code: string;
  name: string;
  regional: string | null;
  regional_label: string | null;
}

/** Write into the customer's SIESA list, or create a new one. List 1 always creates. */
export type ListAction = "actualizacion" | "creacion";

export type WindowMonths = 6 | 12;

/** Whether a new price keeps the margin (with support) within the rule. Null without a new price. */
export type Compliance = "cumple" | "bajo_minimo" | "sin_objetivo" | "sin_costo";

/** Which margin the target comes from: the product's margin for the channel, or the support's own. */
export type MarginBasis = "lista" | "mayoristas" | "salsamentarias" | "apoyo";

export type CustomerScope = "mine" | "all";

export type { SalesScope } from "@/features/salespeople/types/salespeople.types";
import type { SalesScope } from "@/features/salespeople/types/salespeople.types";

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
  /** The user works as a linked SIESA salesperson, so "mis clientes" has something to list. */
  seller_linked: boolean;
  seller: Seller | null;
  /**
   * What the API lets the person quote: every customer, their team's, their
   * own portfolio, or nothing until TI links them (docs/workspace-access.md).
   */
  sales_scope: SalesScope;
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
  /** Active lines with a new price that does not pass the rule: an alert for the validator, it no longer blocks confirming. */
  below_rule_count: number;
  /** Lines whose last price leaves the margin (with support) under the minimum. */
  below_target_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  validated_at: string | null;
  version: number;
  /** How many days the prices hold for the customer, counted from `valid_from`. */
  validity_days: number;
  /** "YYYY-MM-DD", the day the validity was set (Bogotá). */
  valid_from: string;
  /** "YYYY-MM-DD", `valid_from` plus `validity_days`. */
  valid_until: string;
  /** When and by whom the validator confirmed it is loaded in SIESA (`cargada`). */
  uploaded_at: string | null;
  uploaded_by: string | null;
  is_temporary_customer: boolean;
  temporary_customer: TemporaryCustomer | null;
}

/** `changed`: the lines with a new price (local ones included). `all`: every active line with a price to offer. */
export type OfferScope = "changed" | "all";

/** The customer's assigned salesperson as SIESA has them, snapshot at build and refresh. */
export interface SellerContact {
  code: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface OfferVatGroup {
  /** Points: 19 is 19 %. */
  vat_pct: DecimalText;
  base: DecimalText;
  vat: DecimalText;
}

/** The invoice-like consolidation of a quotation quoted with quantities; whole pesos. */
export interface OfferSummary {
  item_count: number;
  subtotal: DecimalText;
  vat_groups: OfferVatGroup[];
  liquor_tax: DecimalText;
  total: DecimalText;
}

/** What `PATCH /offer` changes; only the keys sent. */
export interface OfferSettings {
  validity_days?: number;
  conditions?: string[];
  include_seller?: boolean;
  include_variation?: boolean;
  quote_quantities?: boolean;
  offer_scope?: OfferScope;
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

/** `alza`: a price increase the product master has and SIESA does not yet (no system update date). */
export type CostSource = "cotizacion" | "inventario" | "alza";

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
  /** The product's category in the DWH (`consumo.productos.categoria`); null when unknown or local. */
  category: string | null;
  /** Sales VAT in points (19 is 19 %). Prices stay before VAT; this only builds the price with VAT. */
  vat_pct: DecimalText | null;
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
  /** The operation center whose warehouses set `cost`; null for Nacional or a list with its own warehouses. */
  cost_center: string | null;
  /** The new cost of a pending price increase (not loaded in SIESA yet), the third value the rule compares. */
  increase_cost: DecimalText | null;
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
  /**
   * `historico`: from the sales window. `agregado`: added by the advisor, with `last_*` null.
   * `local`: a product that does not exist in SIESA, created to quote it (sku `LOC-n`); no
   * cost, no rule, never exported.
   */
  origin: LineOrigin;
  origin_label: string;
  /** Inventory units the customer would take; only used when the quotation quotes with quantities. */
  quantity: DecimalText | null;
  /** The price the customer sees: the new one, or the last one when there is none. */
  offer_price: DecimalText | null;
  /** Whether the line goes in the customer's offer, per `offer_scope`. */
  in_offer: boolean;
}

export type LineOrigin = "historico" | "agregado" | "local";

/** VAT rates a local product can carry, in points. */
export type LocalVat = 19 | 5 | 0;

/**
 * `POST /local-lines`: a product outside the portfolio, quoted at an estimated
 * price. It lives only in this quotation.
 */
export interface LocalLineInput {
  description: string;
  supplier_name: string | null;
  price: DecimalText;
  vat_pct: LocalVat;
}

export interface Quotation extends QuotationSummary {
  channel_code: string | null;
  price_list_name: string | null;
  /** Active customers on the same SIESA list: a price written there reaches all of them. */
  price_list_customers: number | null;
  billing_center_code: string | null;
  billing_center_name: string | null;
  /**
   * The operation centers the lines are costed from. Empty is Nacional: the highest cost of
   * every warehouse, reference by reference. With several, each line takes the costliest.
   */
  cost_centers: string[];
  /** False when the list has its own warehouses: the centers then change only the liquor tax regional. */
  centers_set_cost: boolean;
  /** False when it started empty: a refresh revalidates its references and never brings the sales history in. */
  with_history: boolean;
  /** `auto`: the customer's branches decided `cost_centers`. `manual`: someone chose them; a refresh keeps them. */
  billing_center_source: "auto" | "manual";
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
  /** What the executive adds to the offer, in order; the validity line is added on top automatically. */
  conditions: string[];
  include_seller: boolean;
  /** Whether the customer's workbook and PDF show the variation against the last price. */
  include_variation: boolean;
  quote_quantities: boolean;
  offer_scope: OfferScope;
  seller_contact: SellerContact | null;
  /** Null unless the quotation quotes with quantities. */
  offer_summary: OfferSummary | null;
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

/** A line the API could not price (no cost, a local product at a margin). */
export interface SkippedLine {
  sku: string | null;
  reason: string;
}

/** Writes answer with the whole quotation plus what they did. */
export interface QuotationWithImport extends Quotation {
  import_result?: ImportResult;
  skipped?: SkippedLine[];
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
export type LineChange =
  | { sku: string; new_price?: DecimalText | null; quantity?: DecimalText | null }
  | { sku: string; margin_pct: DecimalText };

/** The advisor says what happens in SIESA; on a creation the validator names the list. */
export interface ConfirmOptions {
  list_action?: ListAction;
  activation_date?: string;
}

/** Only on a creation: the validator gives the new list its code and description. */
export interface ValidateOptions {
  /** 1 to 3 letters or digits, not taken in SIESA. */
  price_list_id?: string;
  /** Up to 40 characters; the API defaults to "COTIZADOR <cliente>". */
  new_list_name?: string;
}

/** `POST /quotations` for a customer SIESA does not have: empty, priced from the chosen CO. */
export interface TemporaryQuotationInput {
  temporary_customer: { name: string; legal_name: string; trade_name: string | null; nit: string | null };
  billing_center_code: string;
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
