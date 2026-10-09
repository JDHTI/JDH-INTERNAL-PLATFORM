import type { Decimal } from "@/shared/lib/format";

/**
 * Computed by the API. "anulado" wins over everything; "inactivo" is a manual,
 * reversible switch.
 */
export type SupportState = "vigente" | "vencido" | "programado" | "inactivo" | "anulado";

export type ValueUnit = "caja" | "unidad";
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
}

export interface SupplierSupport {
  id: string;
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
  value_unit: ValueUnit | null;
  /** Units per box. */
  pack_factor: Decimal | null;
  unit_basis_source: UnitBasisSource | null;
  target_margin_pct: Decimal | null;
  min_margin_pct: Decimal | null;
  list_margin_pct: Decimal | null;
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
  effective_only?: boolean;
  sort: string[];
  page: number;
  size: number;
}

/** The API may publish a vocabulary as bare strings or as value/label pairs. */
export type VocabularyEntry = string | { value?: string; code?: string; label?: string; name?: string };

export interface SupportCatalogs {
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
  program?: string | null;
  notes?: string | null;
  authorized_by?: string | null;
  tiers?: SupportTier[];
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
