import { apiFetch } from "@/shared/lib/api-client";

import type {
  BatchPage,
  OrderPage,
  OrderParams,
  ValidationBatch,
  ValidatorCatalogs,
} from "../types/order-validator.types";

const BASE = "/order-validations";

export async function getValidatorPermissions(): Promise<{ can_manage: boolean }> {
  return apiFetch<{ can_manage: boolean }>(`${BASE}/permissions`);
}

export async function getValidatorCatalogs(): Promise<ValidatorCatalogs> {
  return apiFetch<ValidatorCatalogs>(`${BASE}/catalogs`);
}

export async function listBatches(page: number, size: number): Promise<BatchPage> {
  return apiFetch<BatchPage>(BASE, { query: { page, size } });
}

export async function getBatch(id: string): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(id)}`);
}

/** 422 carries a Spanish `detail` about what is wrong with the file; it is shown as is. */
export async function uploadBatch(file: File): Promise<ValidationBatch> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ValidationBatch>(BASE, { method: "POST", body });
}

export async function listOrders({ batchId, status, reason, q, page, size }: OrderParams): Promise<OrderPage> {
  return apiFetch<OrderPage>(`${BASE}/${encodeURIComponent(batchId)}/orders`, {
    query: { status, reason, q, page, size },
  });
}

/** 204 when the file and its decisions are gone. */
export async function deleteBatch(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function revalidateBatch(id: string): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(id)}/revalidate`, { method: "POST" });
}
