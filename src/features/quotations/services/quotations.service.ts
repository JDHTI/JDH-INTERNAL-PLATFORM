import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  BillingCenter,
  ConfirmOptions,
  LineChange,
  LineImport,
  LocalLineInput,
  OfferSettings,
  Quotation,
  QuotationListParams,
  QuotationPage,
  QuotationPermissions,
  QuotationRuleSection,
  QuotationWithImport,
  TemporaryQuotationInput,
  ValidateOptions,
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

/** The operation centers a quotation can be priced from, from the platform's master. */
export function listBillingCenters(): Promise<BillingCenter[]> {
  return apiFetch<BillingCenter[]>(`${BASE}/billing-centers`);
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
 * comes back empty with the `sin_ventas` warning. The validity starts at the
 * API's default and is set while confirming.
 */
export function createQuotation(customerNit: string, windowMonths: WindowMonths): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, { method: "POST", body: { customer_nit: customerNit, window_months: windowMonths } });
}

/** A customer SIESA does not have: an empty quotation, priced from the chosen operation center. */
export function createTemporaryQuotation(input: TemporaryQuotationInput): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, { method: "POST", body: input });
}

/**
 * Costs the quotation from Nacional (no codes: the highest cost of every
 * warehouse, reference by reference) or from one or more operation centers
 * (each line takes the costliest). Cost, regional, liquor tax and suggested
 * prices change for every line; the new prices stay. Back to draft, like a refresh.
 */
export function updateCostCenters(id: string, version: number, codes: string[]): Promise<Quotation> {
  const body = codes.length === 0 ? { version, national: true } : { version, cost_centers: codes };
  return apiFetch<Quotation>(`${one(id)}/billing-center`, { method: "PATCH", body });
}

/**
 * What the customer's offer says and shows: validity, conditions, seller,
 * variation, quantities and which lines go in. Any status; never changes it.
 */
export function updateOffer(id: string, version: number, settings: OfferSettings): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/offer`, { method: "PATCH", body: { version, ...settings } });
}

/** The offer for the customer as a workbook: prices with and without VAT, consumption tax, conditions; never cost or margins. */
export function downloadOfferExcel(id: string): Promise<void> {
  return apiDownload(`${one(id)}/offer.xlsx`, { fallbackName: "cotizacion.xlsx" });
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
 * gives it a `LOC-n` reference, keeps it out of the rule and of every SIESA file.
 */
export function addLocalLine(id: string, version: number, input: LocalLineInput): Promise<QuotationWithImport> {
  return apiFetch<QuotationWithImport>(`${one(id)}/local-lines`, { method: "POST", body: { version, ...input } });
}

/** Removes an added, local or inactive reference; 422 for an active one from the sales history. */
export function removeLine(id: string, sku: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/lines/${encodeURIComponent(sku)}`, { method: "DELETE", query: { version } });
}

/** Rebuilds from the DWH keeping the new prices by reference and a CO chosen by hand; back to draft. */
export function refreshQuotation(id: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/refresh`, { method: "POST", body: { version } });
}

/**
 * Sends it to validation, with lines under the rule too: the validator sees
 * them. 422 when nothing is priced or list 1 is to be updated.
 */
export function confirmQuotation(id: string, version: number, options: ConfirmOptions): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/confirm`, { method: "POST", body: { version, ...options } });
}

/** Back to draft with a note; the validating area must write one, the advisor may not. */
export function returnQuotation(id: string, version: number, note: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/return`, { method: "POST", body: { version, note } });
}

/**
 * Releases the files: `pendiente_carga`. Only the validating area, who names
 * the new list on a creation (422 when the code is missing or taken in SIESA).
 */
export function validateQuotation(id: string, version: number, options: ValidateOptions): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/validate`, { method: "POST", body: { version, ...options } });
}

/** The validator confirms the files are loaded in SIESA: `cargada`. */
export function markUploaded(id: string, version: number): Promise<Quotation> {
  return apiFetch<Quotation>(`${one(id)}/uploaded`, { method: "POST", body: { version } });
}

export function deleteQuotation(id: string): Promise<void> {
  return apiFetch<void>(one(id), { method: "DELETE" });
}

/** Only once validated (`pendiente_carga` or `cargada`); 409 otherwise. The API names the file. */
export function downloadQuotationExcel(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.xlsx`, { fallbackName: "ACTUALIZACION LISTAS PRECIOS.xlsx" });
}

/**
 * BI's template: every line with the table's data and its costs (supplier's
 * quote, inventory, the center that set each one), in any status. 403 for
 * anyone who does not validate.
 */
export function downloadLinesTemplate(id: string): Promise<void> {
  return apiDownload(`${one(id)}/lines.xlsx`, { fallbackName: "plantilla-cotizacion.xlsx" });
}

export function downloadQuotationFlatFile(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.txt`, { fallbackName: "actualizacion-listas-precios.txt" });
}
