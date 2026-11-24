import type { Decimal } from "@/shared/lib/format";

/** The four Costos views, by their API permission key. */
export type CostModuleKey = "analisis-entradas" | "novedades-compras" | "alzas-proveedor" | "acumulado-alzas";

export interface CostPermissions {
  modules: Record<CostModuleKey, { can_read: boolean; can_manage: boolean }>;
  /** Manages the entries or the novelties: may give a line its reason. */
  can_set_reasons: boolean;
}

export interface CostReason {
  id: string;
  code: string;
  name: string;
  requires_credit_note: boolean;
  is_active: boolean;
  sort_order: number;
}

export type EntryStatus = "ok" | "novedad" | "sin_cotizacion";
export type NoveltyStatus = "pendiente" | "espera_nota_credito" | "resuelta" | "anulada";
export type NoveltyKind = "diferencia" | "sin_cotizacion" | "sin_novedad";
export type SortOrder = "asc" | "desc";

/** A purchase entry line against the quotation in force on its day. */
export interface EntryLine {
  line_key: string;
  entry_date: string;
  co: string | null;
  regional_code: string | null;
  regional_name: string | null;
  warehouse: string | null;
  document: string | null;
  purchase_order: string | null;
  invoice_ref: string | null;
  sku: string;
  description: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  supplier_nit: string | null;
  quantity: Decimal | null;
  unit: string | null;
  unit_price: Decimal;
  /** What the entry should have cost: the quotation less its Tasa 1. The difference is against it. */
  quotation: Decimal | null;
  /** The quotation's unit price before the Tasa 1. */
  quotation_list_price: Decimal | null;
  quotation_since: string | null;
  /** «Tasa 1»: the quotation's scale discount, as a fraction (0.2 is 20 %). */
  discount_pct: Decimal | null;
  difference: Decimal | null;
  /** A fraction: 0.05 is 5 %. */
  difference_pct: Decimal | null;
  amount: Decimal | null;
  /** The purchase before this one, of the same reference and unit. */
  previous_price: Decimal | null;
  /** The purchase before the previous one. */
  antepenultimate_price: Decimal | null;
  status: EntryStatus;
  status_label: string;
}

export interface NoveltyBrief {
  id: string;
  status: NoveltyStatus;
  status_label: string;
  reason_id: string | null;
  reason_name: string | null;
  credit_note_number: string | null;
  credit_note_amount: Decimal | null;
}

export interface Entry extends EntryLine {
  novelty: NoveltyBrief | null;
}

export interface EntryCounts {
  ok: number;
  novedad: number;
  sin_cotizacion: number;
  total: number;
  with_reason: number;
}

export interface EntryPage {
  items: Entry[];
  total: number;
  page: number;
  size: number;
  since: string;
  until: string;
  counts: EntryCounts;
  fetched_at: string | null;
  /** False while the warehouse lacks its previous prices: they come from the period read. */
  previous_from_warehouse: boolean;
  threshold: Decimal;
}

/** The C.O. and warehouses with entries in a period, for the filter dropdowns. */
export interface EntryOptions {
  cos: { code: string; name: string | null }[];
  warehouses: { code: string; co: string | null }[];
}

export type EntrySort ="date" | "difference" | "difference_pct" | "amount" | "sku" | "supplier";

export interface EntryParams {
  since: string;
  until: string;
  q: string;
  status: EntryStatus | "";
  novelty: boolean;
  supplier: string;
  co: string;
  warehouse: string;
  reasonId: string;
  sort: EntrySort;
  order: SortOrder;
  page: number;
  size: number;
}

export interface CreditNote {
  id: string;
  supplier_nit: string;
  number: string;
  amount: Decimal;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  registered_by: string;
  registered_at: string;
}

export interface NoveltyEvent {
  id: string;
  event_type: string;
  actor: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface Novelty {
  id: string;
  line: EntryLine;
  kind: NoveltyKind;
  kind_label: string;
  status: NoveltyStatus;
  status_label: string;
  voided: boolean;
  reason: CostReason | null;
  reason_by: string | null;
  reason_at: string | null;
  credit_note: CreditNote | null;
  detected_at: string;
  updated_at: string;
}

export interface NoveltyDetail extends Novelty {
  events: NoveltyEvent[];
}

export interface NoveltyPage {
  items: Novelty[];
  total: number;
  page: number;
  size: number;
  counts: Partial<Record<NoveltyStatus, number>>;
}

export type NoveltySort = "date" | "difference" | "difference_pct" | "sku" | "supplier";

export interface NoveltyParams {
  status: NoveltyStatus | "";
  since: string;
  until: string;
  supplier: string;
  co: string;
  reasonId: string;
  kind: NoveltyKind | "";
  q: string;
  sort: NoveltySort;
  order: SortOrder;
  page: number;
  size: number;
}

export interface CreditNoteInput {
  number: string;
  amount: string;
  file: File | null;
}
