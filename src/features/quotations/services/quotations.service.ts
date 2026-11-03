import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  GenerateOptions,
  LinePrice,
  Quotation,
  QuotationListParams,
  QuotationPage,
  QuotationPermissions,
  QuotationRuleSection,
  WindowMonths,
} from "../types/quotations.types";

export const QUOTATIONS_BASE = "/quotations";
const BASE = QUOTATIONS_BASE;

const one = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

export function getQuotationPermissions(): Promise<QuotationPermissions> {
  return apiFetch<QuotationPermissions>(`${BASE}/permissions`);
}

/** Open to every signed-in user, like the validator's rules. */
export function getQuotationRules(): Promise<QuotationRuleSection[]> {
  return apiFetch<QuotationRuleSection[]>(`${BASE}/rules`);
}

export function listQuotations({ mine, status, q, page, size }: QuotationListParams): Promise<QuotationPage> {
  // `mine` defaults to true on the API, so false has to be sent explicitly.
  return apiFetch<QuotationPage>(BASE, { query: { mine: String(mine), status, q, page, size } });
}

export function getQuotation(id: string): Promise<Quotation> {
  return apiFetch<Quotation>(one(id));
}

/**
 * Builds the quotation from the DWH and the masters. 404 unknown customer, 422
 * no sales in the window, 503 DWH unavailable; each with a Spanish `detail`.
 */
export function createQuotation(customerNit: string, windowMonths: WindowMonths): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, { method: "POST", body: { customer_nit: customerNit, window_months: windowMonths } });
}

/** Recalculates and answers with the whole quotation. 409 when `version` is stale. */
export function updateLines(id: string, version: number, lines: LinePrice[]): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/lines`, { method: "PUT", body: { version, lines } });
}

/** Rebuilds from the DWH keeping the new prices by reference; back to draft. */
export function refreshQuotation(id: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/refresh`, { method: "POST", body: { version } });
}

/** 422 when no line has a new price or a changed one breaks the rule. */
export function generateQuotation(id: string, version: number, options: GenerateOptions): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/generate`, { method: "POST", body: { version, ...options } });
}

export function deleteQuotation(id: string): Promise<void> {
  return apiFetch<void>(one(id), { method: "DELETE" });
}

/** Only for a generated quotation; 409 otherwise. The API names the file. */
export function downloadQuotationExcel(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.xlsx`, { fallbackName: "ACTUALIZACION LISTAS PRECIOS.xlsx" });
}

export function downloadQuotationFlatFile(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.txt`, { fallbackName: "actualizacion-listas-precios.txt" });
}
