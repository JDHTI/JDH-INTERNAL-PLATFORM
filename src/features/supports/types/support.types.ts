import type { Decimal } from "@/shared/lib/format";

export type SupportValidity = "vigente" | "vencido" | "programado";
export type SupportStatus = "activo" | "pendiente_revision" | "anulado";

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
  value_unit: string | null;
  target_margin_pct: Decimal | null;
  min_margin_pct: Decimal | null;
  list_margin_pct: Decimal | null;
  reference_cost: Decimal | null;
  reference_list_price: Decimal | null;
  valid_from: string | null;
  /** null means open-ended. */
  valid_to: string | null;
  end_condition: string | null;
  validity: SupportValidity;
  status: SupportStatus;
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
  status: SupportStatus;
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
  validity?: SupportValidity;
  has_issues?: boolean;
  has_conflicts?: boolean;
  effective_only?: boolean;
  include_voided?: boolean;
  sort: string[];
  page: number;
  size: number;
}

/** The API may publish a vocabulary as bare strings or as value/label pairs. */
export type VocabularyEntry = string | { value?: string; code?: string; label?: string; name?: string };

export interface SupportCatalogs {
  kinds?: VocabularyEntry[];
  calc_methods?: VocabularyEntry[];
  statuses?: VocabularyEntry[];
  settlement_methods?: VocabularyEntry[];
  issue_codes?: VocabularyEntry[];
  regionals?: VocabularyEntry[];
  business_units?: VocabularyEntry[];
  channels?: VocabularyEntry[];
  programs?: VocabularyEntry[];
}
