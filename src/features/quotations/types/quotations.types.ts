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
 * it is loaded. In pendiente_carga and cargada nothing changes any more (409).
 * `list_action` says whether the customer's list is written over or a new one
 * created. The offer goes to the customer by hand, from its PDF or Excel.
 */
export type QuotationStatus = "borrador" | "pendiente_validacion" | "pendiente_carga" | "cargada";

/** Validated or loaded: prices, quantities, offer, lines, center and refresh answer 409. */
export const isClosed = (status: QuotationStatus) => status === "pendiente_carga" || status === "cargada";

/**
 * `cotizacion`: a customer quotation (module `cotizador`). `lista`: the update of
 * an existing SIESA price list (module `actualizacion-listas`, BI): same engine,
 * states and files, but no customer offer, quantities or local products, and the
 * lines are compared against the list's price in force.
 */
export type QuotationKind = "cotizacion" | "lista" | "principal";

/**
 * The kinds that update an existing list: `lista` (Actualización de listas)
 * and `principal` (Listas principales, locked to BI: the general, wholesale and
 * Market lists). Reviewed item by item and loaded from the staging.
 */
export type ListKind = Exclude<QuotationKind, "cotizacion">;

export const isListKind = (kind: QuotationKind): kind is ListKind => kind !== "cotizacion";

/** A SIESA price list a list update can start from. */
export interface PriceList {
  code: string;
  name: string | null;
  is_active: boolean;
  /** Active branches assigned to it (SIESA counts branches, not customers). */
  active_branches: number | null;
  /** It belongs to the other module (a main list from Actualización de listas, or the reverse): it cannot be chosen here. */
  restricted: boolean;
  /** One of the main lists. */
  main?: boolean;
}

/** Each item of a list update: marked ready by whoever edits it, validated by BI. */
export type ReviewStatus = "sin_marcar" | "por_validar" | "validada";

/** A validated item waiting in its list's staging. */
export interface StagedItem {
  line_id: string;
  quotation_id: string;
  quotation_name: string | null;
  sku: string;
  description: string | null;
  unit: string | null;
  current_price: DecimalText | null;
  new_price: DecimalText;
  variation_pct: DecimalText | null;
  value_tax_key: string | null;
  value_tax_amount: DecimalText | null;
  note: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export interface StagedList {
  price_list_id: string;
  price_list_name: string | null;
  item_count: number;
  items: StagedItem[];
}

/** A load of a list's staging in SIESA. */
export interface PriceListLoad {
  id: string;
  kind: ListKind;
  price_list_id: string;
  price_list_name: string | null;
  activation_date: string;
  line_count: number;
  created_by: string;
  created_at: string;
}

export interface StockRow {
  warehouse: string;
  warehouse_name: string | null;
  center_code: string | null;
  on_hand: DecimalText;
  available: DecimalText | null;
}

export interface PriceVersion {
  valid_from: string;
  valid_to: string | null;
  price: DecimalText;
  value_tax_amount: DecimalText | null;
}

export interface MonthlySale {
  month: string;
  price: DecimalText;
  quantity: DecimalText;
}

/** What an item's detail shows beyond the line. */
export interface LineInsight {
  sku: string;
  warehouses: string[];
  stock: StockRow[];
  stock_at: string | null;
  history: PriceVersion[];
  /** The first version the DWH keeps (the main lists only have them from 2026). */
  history_since: string | null;
  sales: MonthlySale[];
  /** Whose sales: the update's customer, the list's branches, or the whole company. */
  sales_scope: "cliente" | "lista" | "compania";
  sales_read: boolean;
}

export interface StockTotal {
  on_hand: DecimalText;
  available: DecimalText | null;
  warehouses: number;
}

export interface StockTotals {
  warehouses: string[];
  items: Record<string, StockTotal>;
}

/** One warehouse of an operation center, with its units. */
export interface StockWarehouse {
  warehouse: string;
  name: string | null;
  on_hand: DecimalText;
  available: DecimalText | null;
}

export interface StockCenter {
  code: string;
  on_hand: DecimalText;
  available: DecimalText | null;
  warehouses: StockWarehouse[];
}

export interface StockBreakdownItem {
  sku: string;
  on_hand: DecimalText;
  available: DecimalText | null;
  centers: StockCenter[];
}

/**
 * `GET /quotations/{id}/stock-breakdown`: a line's stock is the sum of the saleable warehouses of
 * the chosen centers (Nacional: the 17 main ones). `label` names them, `stock_at` is the morning
 * snapshot from SIESA.
 */
export interface StockBreakdown {
  national: boolean;
  label: string;
  warehouses: string[];
  centers: string[];
  stock_at: string | null;
  items: StockBreakdownItem[];
}

/** The chips of a list update's table: the item's review and where its price leaves the margin. */
export type BoardChip = "sin_marcar" | "por_validar" | "validada" | "cargada" | "alza" | "objetivo" | "encima" | "alerta";

/** A main list on the board of Listas principales, with its update once built. */
export interface BoardList {
  code: string;
  name: string | null;
  quotation_id: string | null;
  built_at: string | null;
  line_count: number;
  /** Rows of each review state: sin_marcar, por_validar, validada, cargada. */
  counts: Record<string, number>;
  warnings: QuotationWarning[];
}

/** The latest sync of the main lists: the background job that builds or refreshes all 14. */
export interface BoardSync {
  id: string;
  status: "queued" | "running" | "success" | "partial" | "failed";
  /** `dwh`: after the day's supply load; `scheduled`: daily fallback; `manual`: someone asked. */
  trigger: string;
  triggered_by: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  lists: { code: string; status: "ok" | "error"; line_count: number | null; error: string | null }[];
}

export interface BoardOverview {
  lists: BoardList[];
  suppliers: string[];
  categories: string[];
  sync: BoardSync | null;
  /** False when the background worker is off: the sync cannot run. */
  sync_enabled: boolean;
}

/** A SKU on one main list, with the update it lives in and its stock in the list's warehouses. */
export interface BoardRow extends QuotationLine {
  quotation_id: string;
  quotation_version: number;
  price_list_id: string;
  price_list_name: string | null;
  stock_on_hand: DecimalText | null;
  stock_available: DecimalText | null;
  stock_warehouses: number;
}

export type BoardSort = "lista" | "sku" | "precio_actual" | "margen_actual" | "precio_nuevo" | "variacion" | "existencia";

export interface BoardFilters {
  lists: string[];
  q: string;
  suppliers: string[];
  categories: string[];
  chip: BoardChip | null;
  sort: BoardSort;
  desc: boolean;
}

export interface BoardPage {
  items: BoardRow[];
  total: number;
  page: number;
  size: number;
  /** Rows of each chip under the other filters, and `todos`: every row under them. */
  counts: Record<string, number>;
  stock_read: boolean;
}

export interface BoardKey {
  quotation_id: string;
  sku: string;
}

export interface BoardActionResult {
  done: number;
  skipped: SkippedLine[];
  /** The rows written, as they are now, without stock (empty for the bulk prices). */
  rows: BoardRow[];
}

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
  /** Its BP, BSP and promotional warehouses, by class and code. Empty when it has none or the DWH master did not answer. */
  warehouses?: CenterWarehouse[];
}

/**
 * A warehouse SIESA groups as main (BP), for one-off requests (BSP) or promotional (PROMO). The
 * promotional ones add to the center's warehouses, ticked or not; the center they come under is the
 * one they belong to, whatever their code says.
 */
export interface CenterWarehouse {
  code: string;
  name: string;
  classification: "BP" | "BSP" | "PROMO";
  classification_label: string;
}

/** Write into the customer's SIESA list, or create a new one. List 1 always creates. */
export type ListAction = "actualizacion" | "creacion";

export type WindowMonths = 6 | 12;

/** Whether a new price keeps the margin (with support) within the rule. Null without a new price. */
export type Compliance = "cumple" | "bajo_minimo" | "sin_objetivo" | "sin_costo";

/**
 * Which margin the target comes from: the product's margin for the channel, or the support's own.
 * `salsamentarias` is history only: since 2026-11-23 that channel uses the Mayoristas margin and
 * the API no longer sends it; it stays so older records still read with their name.
 */
export type MarginBasis = "lista" | "mayoristas" | "salsamentarias" | "masivo_food" | "market" | "apoyo";

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
  /**
   * An area leader (Call Center's, for one) who reads the team's quotations without validating:
   * the list offers «Todas» (mine=false). Missing on API builds that do not send it.
   */
  can_see_team?: boolean;
  /**
   * Whose «everyone» it is with `mine=false`: `assigned`, a Comercial coordinator's salespeople
   * (or a Call Center leader's operators), labelled «Mi equipo»; `all`, a director, BI or a
   * validator, «Todas». Null or missing: the person only sees their own.
   */
  team_scope?: "all" | "assigned" | null;
  /** The user works as a linked SIESA salesperson, so "mis clientes" has something to list. */
  seller_linked: boolean;
  seller: Seller | null;
  /**
   * What the API lets the person quote: every customer, their team's, their
   * own portfolio, or nothing until TI links them (docs/workspace-access.md).
   */
  sales_scope: SalesScope;
  /** Quotes and is not BI: may ask an internal support for references under the minimum. */
  can_request_support?: boolean;
  /** BI reads the calculation rules; Comercial (false) reads the operating manual. Missing on older API builds. */
  can_see_rules?: boolean;
}

/** `GET /quotations/manual`: how to use the quoter, for Comercial. */
export interface QuotationManualSection {
  code: string;
  title: string;
  steps: { title: string; text: string }[];
}

/** The latest internal support asked for a line of this quotation. */
export interface LineSupportRequest {
  id: string;
  status: "pendiente" | "aprobada" | "rechazada";
  decision: "persistente" | "unica_vez" | null;
  approved_margin_pct: DecimalText | null;
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
  /** The customer's business group; the search finds by it too. */
  business_group?: string | null;
}

export interface QuotationWarning {
  code: string;
  label: string;
}

export interface QuotationSummary {
  /** When SIESA activates the prices; in the list only on API builds that send it (asked with #101). */
  activation_date?: string | null;
  /**
   * "YYYY-MM-DD": a customer quotation still in draft that was never sent to validation is deleted
   * on this day, 30 days after it was created (daily job, 00:15). Null when it does not apply.
   */
  deleted_on?: string | null;
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
  /**
   * Quoted for a whole business group: `customer_name` is the group's name, sales come from every
   * customer in it, and the offer goes out in its name. Null for one customer.
   */
  business_group?: string | null;
  /** How many customers the group had when it was built. */
  group_customers?: number;
  is_temporary_customer: boolean;
  temporary_customer: TemporaryCustomer | null;
  kind: QuotationKind;
  /** A list update: started from a customer's list (`cliente`) or from the list itself. */
  source: "cliente" | "lista" | null;
  price_list_name: string | null;
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
  kind: QuotationKind;
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
  /** JDH's authorized minimum margin (rules v2): when set, the line's minimum price uses it. Fraction. */
  authorized_margin_pct?: DecimalText | null;
  /** «% Margen Garantizado»: the margin the supplier guarantees at any price; `amount` is then at the line's price. */
  guaranteed_margin_pct?: DecimalText | null;
  /**
   * The supplier's minimum margin under a guaranteed one; may be negative. With it the support is
   * fixed (`amount` does not move with the price) and the line's `min_price` is the supported price.
   * Null on supports saved before it: then `amount` still follows the price.
   */
  supplier_min_margin_pct?: DecimalText | null;
  /** The support at the list price; `amount` is at the line's price. Equal except with a guaranteed margin. */
  list_amount?: DecimalText | null;
}

/** A support that would cover the line and was not applied, with the reason. */
export interface SupportCandidate {
  support_id: string;
  calc_method: string | null;
  program: string | null;
  reason: string;
}

/**
 * A list update: one support of the list's customers on the reference, with the
 * minimum and optimal price it leaves. The one with the lowest minimum is applied.
 */
export interface SupportOption {
  support_id: string;
  kind: string;
  calc_method: string;
  program: string | null;
  detail: string;
  /** Support per inventory unit, in pesos. */
  amount: DecimalText | null;
  required_margin_pct: DecimalText | null;
  min_price: DecimalText | null;
  optimal_price: DecimalText | null;
  applied: boolean;
  /** Why it cannot be applied: in review, one warehouse, a rebate, no value. */
  reason: string | null;
  /** Set when the support is for one customer of the list. */
  customer_nit: string | null;
  /** Set when it is a business group's support, which comes with no NIT; missing on older API builds. */
  customer_group?: string | null;
  valid_to: string | null;
}

/** `alza`: a price increase the product master has and SIESA does not yet (no system update date). */
export type CostSource = "cotizacion" | "inventario" | "alza";

export interface QuotationLine {
  /**
   * Units on hand and available, summed over the saleable warehouses of the chosen centers
   * (Nacional: the 17 main ones); null, unknown. `GET /{id}/stock-breakdown` splits them.
   */
  stock_on_hand?: DecimalText | null;
  stock_available?: DecimalText | null;
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
  /** "YYYY-MM-DD": the SKU's last supplier price increase; null without one or on older API builds. */
  increase_on?: string | null;
  target_margin_pct: DecimalText | null;
  margin_basis: MarginBasis | null;
  /** The API's own words for `margin_basis`, ready to show. */
  margin_basis_label: string | null;
  min_margin_pct: DecimalText | null;
  support: LineSupport | null;
  support_candidates: SupportCandidate[];
  /** A customer quotation: the internal support asked for this reference, if any. */
  support_request?: LineSupportRequest | null;
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
  /** Order in the quotation; a line added later has a higher one. */
  position?: number;
  origin_label: string;
  /** Inventory units the customer would take; only used when the quotation quotes with quantities. */
  quantity: DecimalText | null;
  /** The price the customer sees: the new one, or the last one when there is none. */
  offer_price: DecimalText | null;
  /** Whether the line goes in the customer's offer, per `offer_scope`. */
  in_offer: boolean;
  /**
   * A list update: `last_price` is the list's price in force, and these are the
   * net price and unit cost of goods sold of the last sale (`last_sale_date`).
   */
  last_sale_price?: DecimalText | null;
  last_sale_cost?: DecimalText | null;
  /** A list update: every support of the list's customers, the applied one first. */
  support_options?: SupportOption[];
  /** A list update: the item's review, its observation, and whether a load took it to SIESA. */
  review_status?: ReviewStatus;
  review_label?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  note?: string | null;
  load_id?: string | null;
  loaded?: boolean;
}

/** `lista`: a reference with a price in force on the list a list update starts from. */
export type LineOrigin = "historico" | "agregado" | "local" | "lista";

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
  /**
   * Whether this person may edit it, the API's own rule: its owner, whoever validates its kind,
   * the main lists' managers. False for a coordinator, director or Call Center leader on their
   * team's: they read it. Not about the status. Missing on older API builds.
   */
  can_edit?: boolean;
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
  /** The warehouses ticked inside those centers, in the centers' order. A center with none ticked uses its usual ones. */
  cost_warehouses?: string[];
  /**
   * False when the list has its own warehouses: the centers then change only the liquor tax regional.
   * Ticked warehouses make it true again.
   */
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
