import type { Decimal } from "@/shared/lib/format";

/** The six regionals, in the workbook's order. */
export const REGIONALS = ["ANTIOQUIA", "BOGOTA", "PEREIRA", "BUCARAMANGA", "CARTAGENA", "BARRANQUILLA"] as const;
export type Regional = (typeof REGIONALS)[number];

export const NATIONAL = "NACIONAL";
export const REST = "RESTO DE REGIONALES";

/**
 * Where a line's cost holds: the whole country, one regional, or every
 * regional the other lines of the reference do not name.
 */
export const LINE_REGIONALS = [NATIONAL, ...REGIONALS, REST] as const;
export type LineRegional = (typeof LINE_REGIONALS)[number];

/** The MAESTRA's OBSERVACIONES list. */
export const OBSERVATIONS = ["DESCONTINUADO", "CAMBIO_DE_REFERENCIA", "DUPLICADO"] as const;

export type RequestStatus = "en_revision" | "aprobada" | "rechazada";
export type IncreaseChange = "subio" | "bajo" | "estable";

/** An active product of the supplier, as the manual form offers it. */
export interface SupplierItem {
  sku: string;
  supplier_sku: string | null;
  ean: string | null;
  nit: string | null;
  description: string | null;
  pack_factor: Decimal | null;
  category: string | null;
  tax_group: string | null;
  icui_pct: Decimal | null;
  ibua: Decimal | null;
  old_cost: Decimal | null;
  old_cost_with_tax: Decimal | null;
}

export interface RequestLine {
  id: string;
  /** The sheet row, for a request loaded from the workbook. */
  row_number: number | null;
  sku: string;
  supplier_sku: string | null;
  ean: string | null;
  description: string | null;
  pack_factor: Decimal | null;
  category: string | null;
  tax_group: string | null;
  icui_pct: Decimal | null;
  ibua: Decimal | null;
  old_cost: Decimal | null;
  old_cost_with_tax: Decimal | null;
  new_cost: Decimal;
  new_cost_with_tax: Decimal;
  variation_amount: Decimal | null;
  /** A fraction: 0.05 is 5 %. */
  variation_pct: Decimal | null;
  change: IncreaseChange | null;
  change_label: string | null;
  increased_on: string | null;
  /** A fraction: 0.05 is 5 %. */
  regular_discount_pct: Decimal | null;
  regional: LineRegional;
  /** The regionals the line covers: all six for NACIONAL; for RESTO, the ones the other lines do not name. */
  regionals: string[];
  /** Retail price without VAT (PVP). */
  public_price: Decimal | null;
  observation: string | null;
  accepted: boolean;
  ledger_id: string | null;
}

export interface IncreaseRequest {
  id: string;
  supplier_code: string;
  supplier_name: string | null;
  source: "plantilla" | "manual";
  status: RequestStatus;
  status_label: string;
  file_name: string | null;
  has_file: boolean;
  note: string | null;
  created_by: string;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  line_count: number;
  accepted_count: number;
}

export interface IncreaseRequestDetail extends IncreaseRequest {
  lines: RequestLine[];
}

export interface IncreaseRequestPage {
  items: IncreaseRequest[];
  total: number;
  page: number;
  size: number;
  counts: Partial<Record<RequestStatus, number>>;
}

export interface UploadIssue {
  row_number: number;
  sku: string | null;
  problem: string;
}

export interface IncreaseUploadReport {
  applied: boolean;
  /** Any issue blocks the load. */
  blocked: boolean;
  supplier_code: string;
  rows_read: number;
  lines: RequestLine[];
  issues: UploadIssue[];
  request_id: string | null;
}

export interface LineInput {
  sku: string;
  new_cost: string;
  increased_on: string;
  regional: LineRegional;
  public_price?: string | null;
  regular_discount_pct?: string | null;
  observation?: string | null;
}

/** The regional is not edited in review. */
export interface LinePatch {
  accepted?: boolean;
  new_cost?: string;
  increased_on?: string;
  regular_discount_pct?: string | null;
  public_price?: string | null;
  observation?: string | null;
}
