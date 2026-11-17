import type { Decimal } from "@/shared/lib/format";

/**
 * Computed by the API. "anulado" wins over everything; "inactivo" is a manual,
 * reversible switch.
 */
export type SupportState = "vigente" | "vencido" | "programado" | "inactivo" | "anulado";

export type ValueUnit = "caja" | "unidad" | "kg";
export type UnitBasisSource = "hoja" | "inferido_dwh" | "manual" | "desconocido";

/** An amount in both selling units; null when the API cannot convert it. */
export interface PerUnit {
  box: Decimal | null;
  unit: Decimal | null;
}

export type CalcMethod =
  | "pct_costo"
  | "pct_precio_lista"
  | "valor_unidad"
  | "valor_precio_lista"
  | "costo_neto"
  | "precio_neto"
  | "puntos_margen"
  | "pct_ventas"
  | "margen_minimo";

export interface SupportIssue {
  code: string;
  detail: string | null;
  field: string | null;
}

export interface SupportTier {
  threshold_type: "unidades" | "cajas" | "monto_ventas";
  from_value: Decimal;
  /** null means no upper bound. */
  to_value: Decimal | null;
  value: Decimal;
}

export interface SupportDerived {
  supplier_amount: Decimal | null;
  net_cost: Decimal | null;
  pct_on_cost: Decimal | null;
  pct_on_list: Decimal | null;
  suggested_price: Decimal | null;
  margin_order: Decimal | null;
  margin_recomposed: Decimal | null;
  min_margin_pct: Decimal | null;
  cost: PerUnit | null;
  list_price: PerUnit | null;
  supplier_amount_per: PerUnit | null;
  net_cost_per: PerUnit | null;
  suggested_price_per: PerUnit | null;
  /** Which cost the figures use: the DWH's (quoter's rule) or the stored reference; null, none. */
  cost_basis?: "dwh" | "referencia" | null;
  /*
   * Missing on API builds older than the supported margin. The list price is
   * the cost at the product's general margin (margin master).
   */
  /** The product's general margin, from the margin master. */
  product_margin_pct?: Decimal | null;
  /** The margin the supplier's money leaves at the list price. */
  recomposed_list_margin?: Decimal | null;
  supported_margin_pct?: Decimal | null;
  /** Net cost at the supported margin: net cost / (1 - supported margin). */
  supported_price?: Decimal | null;
  supported_price_per?: PerUnit | null;
  /** How far the supported price falls below the list price. */
  customer_discount_pct?: Decimal | null;
}

/** Cost of the support's SKU in the DWH with the quoter's rule, from the daily job. */
export interface SupportDwhCost {
  /** Per inventory unit: the higher of quotation and inventory. */
  unit_cost: Decimal | null;
  /** Which one won: "cotizacion" or "inventario". */
  source: string | null;
  quote_cost: Decimal | null;
  inventory_cost: Decimal | null;
  plan_key: string;
  /** Warehouses used: the customer's price list, or list 1's highest. */
  plan_label: string;
  snapshot_date: string | null;
  computed_at: string | null;
}

/** What wrote a support's current version. */
export type SupportOrigin =
  | "manual"
  | "lote"
  | "carga"
  | "edicion"
  | "anulacion"
  | "vencimiento"
  | "aprobacion_jdh"
  | "cancelacion_jdh"
  | "importacion";

export interface SupplierSupport {
  id: string;
  commercial_supplier_id?: string | null;
  customer_branch_id?: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  kind: string | null;
  funding: string | null;
  program: string | null;
  external_ref: string | null;
  customer_nit: string | null;
  customer_name: string | null;
  customer_group: string | null;
  product_sku: string | null;
  product_description: string | null;
  product_brand: string | null;
  supplier_sku: string | null;
  brand: string | null;
  regionals: string[];
  business_units: string[];
  channels: string[];
  calc_method: CalcMethod | string | null;
  supplier_value: Decimal | null;
  /** Fraction: 0.05 is 5%. */
  jdh_pct: Decimal | null;
  jdh_net_cost?: Decimal | null;
  value_unit: ValueUnit | null;
  /** Units per box. */
  pack_factor: Decimal | null;
  unit_basis_source: UnitBasisSource | null;
  target_margin_pct: Decimal | null;
  min_margin_pct: Decimal | null;
  list_margin_pct: Decimal | null;
  /**
   * "Margen apoyado": how far the product's margin may drop on top of what the
   * supplier's support leaves. Fraction. Missing on older API builds.
   */
  supported_margin_pct?: Decimal | null;
  reference_cost: Decimal | null;
  reference_list_price: Decimal | null;
  valid_from: string | null;
  /** null means open-ended. */
  valid_to: string | null;
  end_condition: string | null;
  state: SupportState;
  /** Flagged for data issues; shown as a badge, never as a state. */
  needs_review: boolean;
  has_conflicts: boolean;
  issues: SupportIssue[];
  tiers: SupportTier[];
  authorized_by: string | null;
  notes: string | null;
  version: number;
  derived: SupportDerived | null;
  /** Supporting documents linked to it. Missing on API builds older than the attachments. */
  attachment_count?: number;
  /** Missing on API builds older than the DWH cost job; null when the job has no cost for it. */
  dwh_cost?: SupportDwhCost | null;
  last_origin?: SupportOrigin | string | null;
  /** The bulk load that wrote the current version, when one did. */
  last_load_id?: string | null;
  /** The support's business group, else the customer's in the master; null, none. */
  business_group?: string | null;
  /** The margin list its prices use: margin_list, margin_wholesale, margin_mass_food or margin_market. */
  margin_list?: string | null;
  /** Also applies in the promotional warehouses (SIESA group 23). Missing on older API builds. */
  promo_warehouses?: boolean;
}

/** A support as a replacement alert shows it. */
export interface AlertSupport {
  id: string;
  version: number;
  kind: string;
  calc_method: string;
  customer_nit: string | null;
  customer_name: string | null;
  product_sku: string | null;
  supplier_sku: string | null;
  supplier_value: Decimal | null;
  valid_from: string | null;
  valid_to: string | null;
}

/** `GET /supplier-supports/alerts`: a programmed support and the one in force it replaces. */
export interface ReplacementAlert {
  programmed: AlertSupport;
  previous: AlertSupport;
  /** The previous one's last day when the programmed one starts. */
  previous_ends: string;
  /** The previous one already ends that day; false, the daily job will cut it. */
  chained: boolean;
}

/** What to do with the live supports a new one crosses (same class and scope, dates that touch). */
export type OnOverlap = "vencer_anterior" | "anular_anterior";

/** A live support a write crosses, as the 409 lists it in `overlaps`. */
export interface SupportOverlap {
  id: string;
  version: number;
  kind: string | null;
  calc_method: string | null;
  customer_nit: string | null;
  customer_branch_id: string | null;
  product_sku: string | null;
  supplier_sku: string | null;
  valid_from: string | null;
  valid_to: string | null;
  program: string | null;
}

/** How a write resolves the crossings: sent again with the same body. */
export interface OverlapChoice {
  on_overlap: OnOverlap;
  overlap_reason?: string;
}

export type RetireAction = "anular" | "vencer";

/** `POST /supplier-supports/retire`: the chosen supports, or every one the filter finds. All or nothing. */
export interface RetireBody {
  action: RetireAction;
  reason: string;
  /** Last day in force of an expiry; the API defaults to yesterday. */
  last_day?: string;
  items: { id: string; version?: number }[];
  filter?: SupportSearchFilters;
}

export interface RetireResult {
  action: RetireAction;
  voided: string[];
  expired: string[];
}

/** A business group of the customer master and how many active customers it has. */
export interface BusinessGroup {
  name: string;
  customers: number;
}

export interface SupportConflict {
  id: string;
  valid_from: string | null;
  valid_to: string | null;
  program: string | null;
  supplier_value: Decimal | null;
  calc_method: string | null;
}

export interface SupportPage {
  items: SupplierSupport[];
  total: number;
  page: number;
  size: number;
}

export type FieldType = "text" | "enum" | "number" | "date" | "bool" | "array" | "uuid" | "issues";

export type FilterOp =
  | "eq"
  | "neq"
  | "in"
  | "nin"
  | "contains"
  | "starts_with"
  | "is_null"
  | "not_null"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "overlaps"
  | "contains_all"
  | "is_empty"
  | "not_empty";

export interface FilterField {
  field: string;
  label: string;
  type: FieldType;
  operators: FilterOp[];
  values?: string[];
  sortable: boolean;
}

export interface FilterCondition {
  field: string;
  op: FilterOp;
  value?: unknown;
}

export interface FilterGroup {
  match: "all" | "any";
  conditions: Array<FilterCondition | FilterGroup>;
}

export interface SupportSearchBody {
  match: "all" | "any";
  conditions: Array<FilterCondition | FilterGroup>;
  q?: string;
  /** Without a state, voided supports are hidden. */
  state?: SupportState;
  needs_review?: boolean;
  /** Base search: each list ANDs with the others and with every other filter. */
  customer_nits?: string[];
  supplier_codes?: string[];
  product_skus?: string[];
  has_issues?: boolean;
  has_conflicts?: boolean;
  has_attachments?: boolean;
  effective_only?: boolean;
  sort: string[];
  page: number;
  size: number;
}

/** The API may publish a vocabulary as bare strings or as value/label pairs. */
export type VocabularyEntry = string | { value?: string; code?: string; label?: string; name?: string };

export interface SupportCatalogs {
  /** The only classes that can be created or loaded (rules v2). Missing on older API builds. */
  active_kinds?: string[];
  kind_labels?: Record<string, string>;
  calc_method_labels?: Record<string, string>;
  /** The types ("Tipo apoyo") each class admits. */
  methods_by_kind?: Record<string, string[]>;
  /** Every stored class, for reading and filtering. */
  kinds?: VocabularyEntry[];
  calc_methods?: VocabularyEntry[];
  states?: VocabularyEntry[];
  settlement_methods?: VocabularyEntry[];
  issue_codes?: VocabularyEntry[];
  regionals?: VocabularyEntry[];
  business_units?: VocabularyEntry[];
  channels?: VocabularyEntry[];
  programs?: VocabularyEntry[];
}

/** Fields a manager can change; null clears one. Only changed fields are sent. */
export interface SupportPatch {
  version: number;
  is_enabled?: boolean;
  supplier_value?: Decimal | null;
  jdh_pct?: Decimal | null;
  valid_from?: string | null;
  valid_to?: string | null;
  value_unit?: ValueUnit | null;
  pack_factor?: Decimal | null;
  reference_cost?: Decimal | null;
  reference_list_price?: Decimal | null;
  target_margin_pct?: Decimal | null;
  supported_margin_pct?: Decimal | null;
  program?: string | null;
  notes?: string | null;
  authorized_by?: string | null;
  tiers?: SupportTier[];
  promo_warehouses?: boolean;
  /** Only when a change of scope, dates or switch crossed another support (409 with `overlaps`). */
  on_overlap?: OnOverlap;
  overlap_reason?: string;
}

export type SpecialCaseStatus =
  | "pendiente"
  | "en_analisis"
  | "programado"
  | "implementado"
  | "descartado";
export type SpecialCasePriority = "baja" | "media" | "alta";

export interface SpecialCase {
  id: string;
  code: string;
  title: string;
  request: string;
  rule_to_program: string | null;
  status: SpecialCaseStatus;
  priority: SpecialCasePriority;
  assignee: string | null;
  resolution: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  customer_nit: string | null;
  customer_name: string | null;
  support_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialCasePage {
  items: SpecialCase[];
  total: number;
  page: number;
  size: number;
}

export interface SpecialCaseInput {
  title: string;
  request: string;
  rule_to_program?: string | null;
  supplier_code?: string | null;
  customer_nit?: string | null;
  customer_name?: string | null;
  status?: SpecialCaseStatus;
  priority?: SpecialCasePriority;
  assignee?: string | null;
}

export type SpecialCasePatch = Partial<SpecialCaseInput> & {
  version: number;
  resolution?: string | null;
};

export interface SpecialCaseParams {
  q: string;
  status: string;
  page: number;
  size: number;
}

/** How a field is typed in the form and read from a bulk file. */
export type FormFieldType = "text" | "sku" | "nit" | "date" | "number" | "fraction" | "choice" | "list";

export interface FormFieldSpec {
  name: string;
  label: string;
  group: string;
  type: FormFieldType;
  /** Codes of a closed field; empty for the rest. */
  choices: string[];
  help: string;
  max_length: number | null;
}

export interface CalcMethodRule {
  /** How `supplier_value` is typed: a percentage, pesos, or not at all. */
  value_kind: "percent" | "money" | "none";
  requires: string[];
  shows: string[];
  help: string;
}

/** `GET /supplier-supports/form-schema`: the creation form describes itself. */
export interface SupportFormSchema {
  fields: FormFieldSpec[];
  methods: Record<string, CalcMethodRule>;
  required_always: string[];
  tiers: { threshold_types: string[]; max: number };
  /** Readable name of each calc method ("Tipo de apoyo"). Missing on older API builds. */
  calc_method_labels?: Record<string, string>;
}

/** A new support. Percentages are fractions (0.05 = 5%); a missing key is left to the API. */
export type SupportCreateBody = {
  kind: string;
  calc_method: string;
  supplier_code: string;
} & Record<string, string | number | boolean | string[]>;

/**
 * Values of a profile as the API stores them: fractions as text ("0.05"),
 * scopes as upper-case lists, closed fields as codes.
 */
export type ProfileDefaults = Record<string, string | string[]>;

/** Field -> headers of the supplier's own file. */
export type ColumnMap = Record<string, string[]>;

export interface SupportProfile {
  supplier_code: string;
  supplier_name: string;
  defaults: ProfileDefaults;
  column_map: ColumnMap;
  sheet: string | null;
  notes: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

/** The whole profile is replaced. Without `version` it is created; with it, 409 if it changed. */
export interface SupportProfileBody {
  defaults: ProfileDefaults;
  column_map: ColumnMap;
  sheet: string | null;
  notes: string | null;
  version?: number;
}

export interface BulkRowIssue {
  row_number: number;
  field: string | null;
  message: string;
}

export interface BulkPreviewRow {
  row_number: number;
  supplier_code: string | null;
  kind: string;
  calc_method: string;
  program: string | null;
  customer_nit: string | null;
  product_sku: string | null;
  supplier_value: Decimal | null;
  valid_from: string | null;
  valid_to: string | null;
  /** What the row does to the stored supports, matched by key. */
  action: BulkRowAction;
  /** The support it updates or leaves as it is; null when it creates one. */
  support_id: string | null;
}

export type BulkRowAction = "crear" | "actualizar" | "sin_cambio";

/** A stored support of the same supplier and class that the file no longer brings. */
export interface BulkMissingSupport {
  support_id: string;
  customer_nit: string | null;
  product_sku: string | null;
  valid_from: string | null;
  valid_to: string | null;
  /** Whether this load closes it (`expire_missing` and already started). */
  expires: boolean;
}

/** Result of a bulk load. All or nothing: one error sets `blocked` and nothing is saved. */
export interface BulkReport {
  applied: boolean;
  blocked: boolean;
  sheet: string;
  header_row: number;
  rows_read: number;
  valid: number;
  invalid: number;
  errors: BulkRowIssue[];
  errors_truncated: boolean;
  /** The first 50 valid rows. */
  preview: BulkPreviewRow[];
  /** Field -> headers of the file that fed it. */
  mapped_columns: ColumnMap;
  /** Headers no field used: candidates for the column map. */
  ignored_columns: string[];
  profile_used: boolean;
  created: string[];
  with_conflicts: number;
  to_create: number;
  to_update: number;
  unchanged: number;
  /** Stored supports of the same suppliers and classes the file no longer brings. */
  missing: number;
  /** How many of the missing ones this load closes. */
  to_expire: number;
  /** The first 50 missing ones. */
  missing_preview: BulkMissingSupport[];
  updated: string[];
  expired: string[];
  /** Trace id of the applied load (`carga_id` in the DWH). */
  load_id: string | null;
  /** A big load reaches the DWH from this moment (its quiet hours); null, right away. */
  publish_not_before: string | null;
  /*
   * Rules v2; missing on older API builds. Stored supports expired or voided
   * (crossed with `on_overlap`, or «Validación» = No), rows a blank
   * «Validación» skipped, and supports born from business groups.
   */
  to_retire?: number;
  retired?: string[];
  skipped?: number;
  group_supports?: number;
}

/** A document of the document manager backing a support. */
export interface SupportAttachment {
  document_id: string;
  name: string;
  original_filename: string;
  extension: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
  linked_by: string;
  linked_at: string;
  /** How many supports this document backs in all. */
  support_count: number;
}

/** A signed, short-lived link to show (inline) or save a support's document. Never stored. */
export interface AttachmentView {
  url: string;
  filename: string;
  name: string;
  content_type: string;
  extension: string;
  size_bytes: number;
  inline: boolean;
  /** Seconds the link stays valid. */
  expires_in: number;
}

/** The search part takes the list's filters; page, size and sort are ignored. */
export type SupportSearchFilters = Omit<SupportSearchBody, "page" | "size" | "sort">;

/** Supports by id, the ones a search finds, or both (added up without repeats). */
export interface AttachmentSelection {
  support_ids: string[];
  search?: SupportSearchFilters;
}

export interface SelectionPreview {
  total: number;
  /** Over the per-upload limit: the upload would be rejected. */
  capped: boolean;
  limit: number;
  /** The first 20, as a sample. */
  support_ids: string[];
}

export interface AttachResult {
  documents: string[];
  supports: number;
  links_created: number;
}

export interface AttachmentUpload {
  files: File[];
  /** Only with a single file. */
  name?: string;
  description?: string;
  /** Comma-separated. */
  tags?: string;
}

export interface BulkLoadInput {
  file: File;
  apply: boolean;
  supplierCode: string | null;
  sheet: string | null;
  defaults: ProfileDefaults;
  columnMap: ColumnMap;
  /** Close the stored supports the file no longer brings. Not on the group upload. */
  expireMissing: boolean;
  /** What a row does to a stored support it crosses; null makes the crossing an error. */
  onOverlap: OnOverlap | null;
  /** The business-group upload: each row names a group and becomes one support per customer. */
  groups: boolean;
}
