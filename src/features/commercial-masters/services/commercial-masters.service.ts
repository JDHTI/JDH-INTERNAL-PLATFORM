import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import { findCommercialMaster } from "../config/masters.config";
import type {
  CommercialMasterParams,
  CommercialPage,
  CommercialProduct,
  MarginReport,
  ProductPatch,
} from "../types/commercial-master.types";

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

/** The margin sheet as an .xlsx: every product with its margins, or the headers alone. */
export async function downloadMarginTemplate(withData: boolean): Promise<void> {
  return apiDownload("/commercial/products/margins/template", {
    // The query builder drops a boolean false, so the flag travels as text.
    query: { with_data: withData ? "true" : "false" },
    fallbackName: withData ? "margenes-productos.xlsx" : "plantilla-margenes.xlsx",
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
