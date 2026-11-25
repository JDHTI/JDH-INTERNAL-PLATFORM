import type { Decimal } from "@/shared/lib/format";

/** Up, down or flat: the new cost against the old one. */
export type IncreaseStatus = "subio" | "bajo" | "estable";

/**
 * One cost change a supplier notified for a reference (`/commercial/price-increases`).
 * Description, supplier and category come from the product master; the rest is the
 * purchasing area's history.
 */
export interface PriceIncrease {
  id: string;
  sku: string;
  description: string | null;
  supplier_name: string | null;
  category: string | null;
  /** False for a reference the product master no longer has: the history keeps it. */
  is_known_product: boolean;
  notified_on: string | null;
  /** When SIESA got it; null is pending, and the quoter compares its new cost. */
  system_updated_on: string | null;
  increased_on: string | null;
  supplier_sku: string | null;
  ean: string | null;
  regional: string | null;
  icui_pct: Decimal | null;
  ibua: Decimal | null;
  old_cost_with_tax: Decimal | null;
  old_cost: Decimal | null;
  new_cost: Decimal | null;
  new_cost_with_tax: Decimal | null;
  variation_amount: Decimal | null;
  /** A fraction: 0.165 is 16,5 %. */
  variation_pct: Decimal | null;
  status: IncreaseStatus | null;
  status_label: string | null;
  observations: string | null;
  margin_pct: Decimal | null;
  price: Decimal | null;
  notified: boolean;
  siesa_changed: boolean;
  /** Loaded from the purchasing workbook, or approved from a supplier's increase request. */
  source: "libro" | "solicitud";
  request_line_id: string | null;
  /** 1, or 2, 3… for increases chained on the same day. */
  occurrence: number;
  is_pending: boolean;
  /** The number of the SIESA load it is in, generated and not confirmed yet; null otherwise. */
  open_load: number | null;
  updated_by: string;
  updated_at: string;
}

export interface PriceIncreaseCounts {
  subio: number;
  bajo: number;
  estable: number;
  pendientes: number;
}

export interface PriceIncreasePage {
  items: PriceIncrease[];
  total: number;
  page: number;
  size: number;
  /** Counts of the whole filter, not the page. */
  counts: PriceIncreaseCounts;
  /** May upload the workbook and set the system update date. */
  can_manage: boolean;
}

export interface PriceIncreaseParams {
  /** Reference prefix or description. */
  q: string;
  /** A commercial supplier code, picked from the options; never typed. */
  supplier: string;
  status: IncreaseStatus | "";
  /** Only the ones SIESA does not have yet. */
  pending: boolean;
  /** One reference's whole history (the analysis detail). */
  sku?: string;
  co: string;
  installation: string;
  page: number;
  size: number;
}

/** A commercial supplier with references in the history. */
export interface SupplierOption {
  code: string;
  name: string | null;
  references: number;
}

/** A month with increases taking effect, "YYYY-MM". */
export interface MonthOption {
  month: string;
  changes: number;
  references: number;
}

/** A C.O. of SIESA, "003" with its description. */
export interface CoOption {
  code: string;
  name: string | null;
}

/** An installation and the C.O. codes it belongs to. */
export interface InstallationOption {
  code: string;
  name: string | null;
  cos: string[];
}

/** What the dropdowns offer (`/commercial/price-increases/options`). */
export interface IncreaseFilterOptions {
  suppliers: SupplierOption[];
  /** The latest month first. */
  months: MonthOption[];
  /** Empty when the DWH does not answer: the two filters are then off. */
  cos: CoOption[];
  /** By name. */
  installations: InstallationOption[];
}

/**
 * Where the references are active. Each reference then counts its national
 * rows and its C.O.'s regional ones; with both, they cross.
 */
export interface IncreaseScope {
  co: string;
  installation: string;
}

/** The last month, the last year (default), two years or the whole history, by increase date. */
export type AnalysisPeriod = "1m" | "12m" | "24m" | "all";
export type AnalysisSort = "accumulated" | "increases" | "frequency" | "last_change" | "sku";

/**
 * The window the analysis covers: a preset up to the latest row, a calendar
 * month, or a range of days ("YYYY-MM-DD", both included).
 */
export type AnalysisWindow =
  | { kind: "preset"; period: AnalysisPeriod }
  | { kind: "month"; month: string }
  | { kind: "range"; from: string; to: string };

/** One reference over the period (`/commercial/price-increases/analysis`). */
export interface ReferenceAnalysis {
  sku: string;
  description: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  category: string | null;
  changes: number;
  increases: number;
  decreases: number;
  /** Cost just before the period and at its end, without the healthy-food tax when known. */
  start_cost: Decimal | null;
  end_cost: Decimal | null;
  /** `end_cost` against `start_cost`, a fraction: 0.1025 is 10,25 %. */
  accumulated_pct: Decimal | null;
  /** Up, down or flat by the sign of `accumulated_pct`. */
  movement: IncreaseStatus | null;
  /** Median days between consecutive increases; null with fewer than two. */
  frequency_days: number | null;
  last_increased_on: string;
  last_status: IncreaseStatus | null;
  last_change_pct: Decimal | null;
  is_pending: boolean;
}

export interface AnalysisSummary {
  references: number;
  increases: number;
  /** Median change of the period's increases. */
  typical_increase_pct: Decimal | null;
  pending: number;
  movements: Record<IncreaseStatus, number>;
}

export interface AnalysisPage {
  items: ReferenceAnalysis[];
  total: number;
  page: number;
  size: number;
  /** Counts of the search, before the movement filter. */
  summary: AnalysisSummary;
  /** First and last day of the period; null is an open end (both for the whole history). */
  since: string | null;
  until: string | null;
}

export interface AnalysisParams {
  window: AnalysisWindow;
  movement: IncreaseStatus | "";
  q: string;
  supplier: string;
  co: string;
  installation: string;
  sort: AnalysisSort;
  order: "asc" | "desc";
  page: number;
  size: number;
}

/** What reading (or applying) the area's «Acumulado Alza Precios» workbook did. */
export interface PriceIncreaseReport {
  applied: boolean;
  rows_read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicated: number;
  /** References the product master does not have (kept anyway). */
  unknown_skus: number;
  /** Rows without a system update date: the quoter compares them. */
  pending: number;
  issues: { row_number: number; sku: string | null; problem: string }[];
  issues_truncated: boolean;
}

/** The history's filters, as the export takes them. */
export interface PriceIncreaseFilters {
  q: string;
  supplier: string;
  status: IncreaseStatus | "";
  pending: boolean;
  co: string;
  installation: string;
}

/** Generated (its files can be loaded), loaded in SIESA (confirmed) or voided. */
export type SiesaLoadStatus = "generado" | "cargado" | "anulado";

/**
 * Which pending increases go into a SIESA load: picked one by one, or every
 * pending one of the history's filters (the API forces `pending`; 2.000 at most).
 */
export type SiesaLoadSelection =
  | { increase_ids: string[] }
  | {
      all: true;
      filters: { q?: string; status?: IncreaseStatus; sku?: string; supplier?: string; co?: string; installation?: string };
    };

/** One supplier quotation the load writes into SIESA (Impodatos 0212). */
export interface SiesaLoadRow {
  increase_id: string;
  sku: string;
  description: string | null;
  /** The supplier and branch of the reference's quotation in force, in its inventory unit. */
  nit: string;
  branch: string;
  currency: string;
  unit: string;
  /** The new cost without the healthy-food tax. */
  price: Decimal;
  /** The increase date, or the day the load was generated when that already passed. */
  activation_date: string;
  delivery_days: number;
  increased_on: string | null;
  /** Other suppliers with a quotation in force for the reference. */
  other_nits: string[];
}

export interface SiesaLoad {
  id: string;
  number: number;
  status: SiesaLoadStatus;
  status_label: string;
  row_count: number;
  created_by: string;
  created_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  /** The day it was loaded in SIESA: its increases' system update date. */
  loaded_on: string | null;
  voided_by: string | null;
  voided_at: string | null;
}

export interface SiesaLoadDetail extends SiesaLoad {
  rows: SiesaLoadRow[];
}

/** What a selection loads and leaves out; `load` once it is generated (`apply`). */
export interface SiesaLoadResult {
  applied: boolean;
  rows: SiesaLoadRow[];
  excluded: { increase_id: string; sku: string; reason: string }[];
  load: SiesaLoadDetail | null;
}

export interface SiesaLoadPage {
  items: SiesaLoad[];
  total: number;
  page: number;
  size: number;
  counts: Partial<Record<SiesaLoadStatus, number>>;
  can_manage: boolean;
}
