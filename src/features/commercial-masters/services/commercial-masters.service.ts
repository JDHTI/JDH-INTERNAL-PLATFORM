import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import { findCommercialMaster } from "../config/masters.config";
import type {
  CommercialMasterParams,
  CommercialPage,
  CommercialProduct,
  MarginReport,
  ProductMarginsInput,
  ProductPatch,
} from "../types/commercial-master.types";
import type { PriceIncrease, PriceIncreasePage, PriceIncreaseParams, PriceIncreaseReport } from "../types/price-increases.types";

/** Rows stay untyped here: the table is driven by each master's column list. */
export type MasterRow = Record<string, unknown>;

export async function listCommercialMaster({
  master,
  q,
  filters,
  page,
  size,
}: CommercialMasterParams): Promise<CommercialPage<MasterRow>> {
  const def = findCommercialMaster(master);
  if (!def) throw new Error(`Maestro desconocido: ${master}`);
  return apiFetch<CommercialPage<MasterRow>>(def.endpoint, { query: { ...filters, q, page, size } });
}

const productPath = (sku: string) => `/commercial/products/${encodeURIComponent(sku)}`;

export async function getProduct(sku: string): Promise<CommercialProduct> {
  return apiFetch<CommercialProduct>(productPath(sku));
}

/** Managers only (403 otherwise); 422 names the field that was rejected. */
export async function updateProduct(sku: string, patch: ProductPatch): Promise<CommercialProduct> {
  return apiFetch<CommercialProduct>(productPath(sku), { method: "PATCH", body: patch });
}

/** Sets every margin of one product by hand. Managers only (403); 422 carries a readable `detail`. */
export async function setProductMargins(sku: string, margins: ProductMarginsInput): Promise<CommercialProduct> {
  return apiFetch<CommercialProduct>(`${productPath(sku)}/margins`, { method: "PUT", body: margins });
}

/** The margin sheet as an .xlsx: every product with its margins, or the headers alone. */
export async function downloadMarginTemplate(withData: boolean): Promise<void> {
  return apiDownload("/commercial/products/margins/template", {
    // The query builder drops a boolean false, so the flag travels as text.
    query: { with_data: withData ? "true" : "false" },
    fallbackName: withData ? "margenes-productos.xlsx" : "plantilla-margenes.xlsx",
  });
}

const INCREASES = "/commercial/price-increases";

/** The price increase history, the latest first, with the counts of the filter. */
export async function listPriceIncreases({ q, status, pending, page, size }: PriceIncreaseParams): Promise<PriceIncreasePage> {
  return apiFetch<PriceIncreasePage>(INCREASES, {
    query: { q: q || undefined, status: status || undefined, pending: pending ? "true" : undefined, page, size },
  });
}

/**
 * The purchasing area's `Acumulado Alza Precios`, upserted by reference,
 * increase date and notification date. Without `apply` it only simulates.
 * Masters managers only.
 */
export async function uploadPriceIncreases(file: File, apply: boolean): Promise<PriceIncreaseReport> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<PriceIncreaseReport>(`${INCREASES}/upload`, {
    method: "POST",
    query: { apply: apply ? "true" : "false" },
    body,
  });
}

/** The day SIESA got the increase; null marks it pending again (the quoter compares it). */
export async function setPriceIncreaseDate(id: string, day: string | null): Promise<PriceIncrease> {
  return apiFetch<PriceIncrease>(`${INCREASES}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { system_updated_on: day },
  });
}

/**
 * Sends a margin file. Without `apply` it only simulates and reports; with it
 * the same file is applied. 422 carries a Spanish `detail` when the file is no use.
 */
export async function uploadMargins(file: File, apply: boolean): Promise<MarginReport> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<MarginReport>("/commercial/products/margins", {
    method: "POST",
    query: { apply: apply ? "true" : "false" },
    body,
  });
}
