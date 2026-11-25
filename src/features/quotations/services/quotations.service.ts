import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  BillingCenter,
  ConfirmOptions,
  LineChange,
  LineImport,
  LineInsight,
  ListKind,
  ListTemplateResult,
  LocalLineInput,
  OfferSettings,
  PriceListLoad,
  Quotation,
  QuotationCustomerBranch,
  QuotationListParams,
  QuotationKind,
  QuotationPage,
  QuotationPermissions,
  QuotationManualSection,
  QuotationRuleSection,
  QuotationWithImport,
  ReviewStatus,
  StagedList,
  StockBreakdown,
  StockTotals,
  TemporaryQuotationInput,
  ValidateOptions,
  WindowMonths,
} from "../types/quotations.types";

export const QUOTATIONS_BASE = "/quotations";
const BASE = QUOTATIONS_BASE;

const one = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

/** `kind=lista` or `principal` asks for a list module instead of the quoter. */
export function getQuotationPermissions(kind: QuotationKind = "cotizacion"): Promise<QuotationPermissions> {
  return apiFetch<QuotationPermissions>(`${BASE}/permissions`, { query: { kind } });
}

/**
 * Starts the update of an existing SIESA list: a customer's assigned list, or
 * the list picked by code or name. Reads the DWH (list, branches, last sales):
 * 404 unknown customer or list, 403 a main list from Actualización de listas,
 * 422 a list that is not a main one from Listas principales.
 */
export function createListUpdate(
  input: ({ customer_nit: string } | { price_list_id: string }) & { kind: ListKind }
): Promise<Quotation> {
  return apiFetch<Quotation>(`${BASE}/list-updates`, { method: "POST", body: input });
}

const UPDATES = "/price-list-updates";
const update = (id: string) => `${UPDATES}/${encodeURIComponent(id)}`;

/**
 * Marks items of a list update. `por_validar` and `sin_marcar`: whoever edits
 * it; `validada`, or taking an item out of it: whoever validates the module.
 * Items that cannot be marked come back in `skipped`; 422 when none could.
 */
export function reviewLines(id: string, version: number, skus: string[], status: ReviewStatus): Promise<QuotationWithImport> {
  return apiFetch<QuotationWithImport>(`${update(id)}/review`, { method: "PUT", body: { version, skus, status } });
}

/** Writes (or clears, with an empty text) the observation of an item. */
export function setLineNote(id: string, version: number, sku: string, note: string): Promise<Quotation> {
  return apiFetch<Quotation>(`${update(id)}/lines/${encodeURIComponent(sku)}/note`, { method: "PUT", body: { version, note } });
}

/** Stock by warehouse, list price history and monthly sale price of one item. */
export function getLineInsight(id: string, sku: string): Promise<LineInsight> {
  return apiFetch<LineInsight>(`${update(id)}/lines/${encodeURIComponent(sku)}/insight`);
}

/**
 * Whether the last sales the DWH did not give in time have been read since (`read`), and
 * whether the API is still retrying (`retrying`). Header only, cheap to ask often (API #100).
 */
export function getLastSalesStatus(id: string): Promise<{ read: boolean; retrying: boolean; version: number }> {
  return apiFetch(`${one(id)}/last-sales`);
}

/** The stock of the given references by center and warehouse; any kind of quotation. */
export function getStockBreakdown(id: string, skus: string[]): Promise<StockBreakdown> {
  return apiFetch<StockBreakdown>(`${one(id)}/stock-breakdown`, { query: { sku: skus } });
}

export function getStockTotals(id: string): Promise<StockTotals> {
  return apiFetch<StockTotals>(`${update(id)}/stock`);
}

/** Every list of the module with validated items not loaded yet. */
export function listStaging(kind: ListKind): Promise<StagedList[]> {
  return apiFetch<StagedList[]>(`${UPDATES}/staging`, { query: { kind } });
}

/** SIESA's two pages of a list's staging: the workbook or the import file. Only who validates. */
export function downloadStagingFile(kind: ListKind, priceListId: string, format: "xlsx" | "txt", activationDate: string): Promise<void> {
  return apiDownload(`${UPDATES}/staging/${encodeURIComponent(priceListId)}/file.${format}`, {
    query: { kind, activation_date: activationDate },
    fallbackName: format === "xlsx" ? `ACTUALIZACION LISTA ${priceListId}.xlsx` : `precios-lista${priceListId}-staging.txt`,
  });
}

/** The items of the downloaded files were loaded in SIESA; 409 when one left the staging. */
export function createLoad(kind: ListKind, priceListId: string, lineIds: string[], activationDate: string): Promise<PriceListLoad> {
  return apiFetch<PriceListLoad>(`${UPDATES}/staging/${encodeURIComponent(priceListId)}/loads`, {
    method: "POST",
    body: { kind, line_ids: lineIds, activation_date: activationDate },
  });
}

export function listLoads(kind: ListKind): Promise<PriceListLoad[]> {
  return apiFetch<PriceListLoad[]>(`${UPDATES}/loads`, { query: { kind } });
}

/** BI only (`can_see_rules`); Comercial gets a 403 and reads the manual. */
export function getQuotationRules(): Promise<QuotationRuleSection[]> {
  return apiFetch<QuotationRuleSection[]>(`${BASE}/rules`);
}

/** How to use the quoter, without the calculation rules. */
export function getQuotationManual(): Promise<QuotationManualSection[]> {
  return apiFetch<QuotationManualSection[]>(`${BASE}/manual`);
}

/** The operation centers a quotation can be priced from, from the platform's master. */
export function listBillingCenters(): Promise<BillingCenter[]> {
  return apiFetch<BillingCenter[]>(`${BASE}/billing-centers`);
}

export function listQuotations({ kind, mine, status, q, page, size }: QuotationListParams): Promise<QuotationPage> {
  // `mine` defaults to true on the API, so false has to be sent explicitly.
  return apiFetch<QuotationPage>(BASE, { query: { kind, mine: String(mine), status, q, page, size } });
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
/**
 * `empty`: no lines from the sales history; the advisor adds the references, and a refresh never
 * brings the history in. `branchId`: quoted for that branch of the NIT (422 if it is not the NIT's).
 */
export function createQuotation(customerNit: string, windowMonths: WindowMonths, empty = false, branchId: string | null = null): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, {
    method: "POST",
    body: {
      customer_nit: customerNit,
      ...(branchId ? { customer_branch_id: branchId } : {}),
      window_months: windowMonths,
      with_history: !empty,
    },
  });
}

/** The branches of a customer the person may quote. */
export function listQuotationCustomerBranches(nit: string): Promise<QuotationCustomerBranch[]> {
  return apiFetch<QuotationCustomerBranch[]>(`${BASE}/customers/${encodeURIComponent(nit)}/branches`);
}

/**
 * A whole business group: sales of every customer in it, and the list, channel and center most
 * of its branches have. The quotation and its offer carry the group's name.
 */
export function createGroupQuotation(businessGroup: string, windowMonths: WindowMonths, empty = false): Promise<Quotation> {
  return apiFetch<Quotation>(BASE, {
    method: "POST",
    body: { business_group: businessGroup, window_months: windowMonths, with_history: !empty },
  });
}

/**
 * The 3-character list codes (0-9, A-Z, in order) SIESA does not use yet, from the one after
 * `after`. `free` and `used` count the whole space; `next_after` is null on the last page.
 */
export interface AvailableListCodes {
  items: string[];
  free: number;
  used: number;
  next_after: string | null;
}

export function getAvailableListCodes(after: string, size = 30): Promise<AvailableListCodes> {
  return apiFetch<AvailableListCodes>(`${BASE}/list-codes/available`, { query: { after: after || undefined, size } });
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
/**
 * Which of two or more centers costs the most for the quotation's references
 * (the highest sum of their unit costs), before choosing them. No amounts:
 * the advisors do not see costs. `highest` is null when they cost the same.
 */
export function compareCostCenters(id: string, codes: string[], warehouses: string[]): Promise<{ highest: string | null }> {
  return apiFetch<{ highest: string | null }>(`${one(id)}/cost-centers/compare`, { query: { codes, warehouses } });
}

/** No centers is Nacional, alone. Centers sent without warehouses clear the ticked ones. */
export function updateCostCenters(id: string, version: number, codes: string[], warehouses: string[]): Promise<Quotation> {
  const body = codes.length === 0 ? { version, national: true } : { version, cost_centers: codes, cost_warehouses: warehouses };
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

/**
 * A list update's template: its references, to delete the rows that do not belong and upload it
 * back. No costs, so whoever sees the update may download it. The API names the file.
 */
export function downloadListTemplate(id: string): Promise<void> {
  return apiDownload(`${one(id)}/list-template.xlsx`, { fallbackName: "Plantilla.xlsx" });
}

/**
 * Takes out the references the template no longer has. `apply` false only previews; true removes
 * them (409 if the version changed). Only the «Referencia» column counts; 422 with the reason
 * when the file is not this list's template or leaves nothing.
 */
export function uploadListTemplate(id: string, file: File, version: number, apply: boolean): Promise<ListTemplateResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("version", String(version));
  form.append("apply", String(apply));
  return apiFetch<ListTemplateResult>(`${one(id)}/list-template`, { method: "POST", body: form });
}

export function downloadQuotationFlatFile(id: string): Promise<void> {
  return apiDownload(`${one(id)}/export.txt`, { fallbackName: "actualizacion-listas-precios.txt" });
}
