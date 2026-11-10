import { apiFetch } from "@/shared/lib/api-client";

import type {
  RequestedProduct,
  RequestedProductChange,
  RequestedProductPage,
  RequestedProductParams,
  RequestedProductPermissions,
} from "../types/requested-products.types";

const BASE = "/requested-products";

export function getRequestedProductPermissions(): Promise<RequestedProductPermissions> {
  return apiFetch<RequestedProductPermissions>(`${BASE}/permissions`);
}

export function listRequestedProducts({ status, q, page, size }: RequestedProductParams): Promise<RequestedProductPage> {
  return apiFetch<RequestedProductPage>(BASE, { query: { status, q, page, size } });
}

/** Only BI and admins; `creado` needs a SIESA reference that exists and is active. */
export function updateRequestedProduct(id: string, change: RequestedProductChange): Promise<RequestedProduct> {
  return apiFetch<RequestedProduct>(`${BASE}/${encodeURIComponent(id)}`, { method: "PATCH", body: change });
}
