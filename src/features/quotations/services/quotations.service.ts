import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  ConfirmOptions,
  LineChange,
  LineImport,
  LocalLineInput,
  Quotation,
  QuotationListParams,
  QuotationPage,
  QuotationPermissions,
  QuotationRuleSection,
  QuotationWithImport,
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
 * Builds the quotation from the DWH and the masters. 404 unknown customer,
 * 503 DWH unavailable; each with a Spanish `detail`. A customer with no sales
 * comes back empty with the `sin_ventas` warning.
 */
export function createQuotation(customerNit: string, windowMonths: WindowMonths): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, { method: "POST", body: { customer_nit: customerNit, window_months: windowMonths } });
}

/**
 * Prices in whole pesos, or margins (fractions) the API turns into prices.
 * Lines it cannot price come back in `skipped`; 422 only when none could.
 * 409 when `version` is stale or the quotation is waiting for validation.
 */
export function updateLines(id: string, version: number, lines: LineChange[]): Promise<QuotationWithImport> {
  return apiFetch<QuotationWithImport>(`${one(id)}/lines`, { method: "PUT", body: { version, lines } });
}

/**
 * Adds a pasted list and/or picked SKUs (up to 500). New references go to the
 * end, ones already there are revalidated keeping their new price, and unknown
 * or inactive ones are reported in `import_result` without blocking the rest.
 */
export function addLines(id: string, version: number, { text, skus }: LineImport): Promise<QuotationWithImport> {
  const body: { version: number; text?: string; skus?: string[] } = { version };
  if (text && text.trim() !== "") body.text = text;
  if (skus && skus.length > 0) body.skus = skus;
  return apiFetch<QuotationWithImport>(`${one(id)}/lines`, { method: "POST", body });
}

/**
 * Adds a product that does not exist in SIESA, at an estimated price. The API
 * gives it a `LOC-n` reference, keeps it out of the rule and of every export.
 */
export function addLocalLine(id: string, version: number, input: LocalLineInput): Promise<QuotationWithImport> {
  return apiFetch<QuotationWithImport>(`${one(id)}/local-lines`, { method: "POST", body: { version, ...input } });
}

/** Removes an added, local or inactive reference; 422 for an active one from the sales history. */
export function removeLine(id: string, sku: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/lines/${encodeURIComponent(sku)}`, { method: "DELETE", query: { version } });
}

/** Rebuilds from the DWH keeping the new prices by reference; back to draft. */
export function refreshQuotation(id: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/refresh`, { method: "POST", body: { version } });
}

/**
 * Sends it to validation. 422 when a line breaks the rule, when list 1 is to
 * be updated, or when a creation has no code or the code exists in SIESA.
 */
export function confirmQuotation(id: string, version: number, options: ConfirmOptions): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/confirm`, { method: "POST", body: { version, ...options } });
}

/** Back to draft with a note; the validating area must write one, the advisor may not. */
export function returnQuotation(id: string, version: number, note: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/return`, { method: "POST", body: { version, note } });
}

/** Releases the files: `actualizada` or `creada`. Only the validating area. */
export function validateQuotation(id: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/validate`, { method: "POST", body: { version } });
}

/** The quotation as a workbook to change many prices or margins at once. */
export function downloadQuotationTemplate(id: string): Promise<void> {
  return apiDownload(`${one(id)}/template.xlsx`, { fallbackName: "cotizacion.xlsx" });
}

/** The edited workbook back; `template_result` says what each row did. */
export function uploadQuotationTemplate(id: string, version: number, file: File): Promise<QuotationWithImport> {
  const body = new FormData();
  body.append("file", file);
  body.append("version", String(version));
  return apiFetch<QuotationWithImport>(`${one(id)}/template`, { method: "POST", body });
}

export function deleteQuotation(id: string): Promise<void> {
  return apiFetch<void>(one(id), { method: "DELETE" });
}

/** Only for a validated quotation (`actualizada` or `creada`); 409 otherwise. The API names the file. */
export function downloadQuotationExcel(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.xlsx`, { fallbackName: "ACTUALIZACION LISTAS PRECIOS.xlsx" });
}

export function downloadQuotationFlatFile(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.txt`, { fallbackName: "actualizacion-listas-precios.txt" });
}
