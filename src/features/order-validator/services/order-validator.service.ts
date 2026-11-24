import { apiFetch } from "@/shared/lib/api-client";

import type {
  BatchPage,
  OrderPage,
  OrderParams,
  RuleSection,
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

/** The rules the validator applies, with the values in force. Open to every signed-in user. */
export async function getValidatorRules(): Promise<RuleSection[]> {
  return apiFetch<RuleSection[]>(`${BASE}/rules`);
}

export async function listBatches(page: number, size: number): Promise<BatchPage> {
  return apiFetch<BatchPage>(BASE, { query: { page, size } });
}

export async function getBatch(id: string): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(id)}`);
}

/** 422 carries a Spanish `detail` about what is wrong with the file; it is shown as is. */
export async function uploadBatch(file: File, thresholdPoints: string | null): Promise<ValidationBatch> {
  const body = new FormData();
  body.append("file", file);
  // Left out, the API uses its default threshold.
  if (thresholdPoints) body.append("margin_threshold_points", thresholdPoints);
  return apiFetch<ValidationBatch>(BASE, { method: "POST", body });
}

/**
 * The API orders the rows (`sort`, `attention` by default: no support first,
 * then by margin); the screen never re-sorts a page. `thresholdPreview` tries a
 * threshold without saving it: statuses, counts and margins come back as if the
 * file had it.
 */
export async function listOrders({
  batchId,
  sort,
  status,
  thresholdPreview,
  q,
  operationCenter,
  salesperson,
  page,
  size,
}: OrderParams): Promise<OrderPage> {
  return apiFetch<OrderPage>(`${BASE}/${encodeURIComponent(batchId)}/orders`, {
    query: {
      sort,
      status,
      margin_threshold_points: thresholdPreview,
      q,
      operation_center: operationCenter,
      salesperson,
      page,
      size,
    },
  });
}

/**
 * Saves the file's margin threshold and recalculates which orders it releases.
 * The lines are not validated again, and manual approvals stay. 422 when it is
 * outside 0 to 20.
 */
export async function setMarginThreshold(id: string, thresholdPoints: number): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(id)}/margin-threshold`, {
    method: "PUT",
    body: { margin_threshold_points: thresholdPoints },
  });
}

/**
 * Moves pending orders to ready by hand, all or none. 409 means one of them is
 * no longer pending. Answers with the batch, whose totals have changed.
 */
export async function approveOrders(batchId: string, documents: string[], note: string | null): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(batchId)}/approvals`, {
    method: "POST",
    body: { documents, note },
  });
}

/** Takes a manual approval back; the order returns to what the validation decided. 204. */
export async function revokeOrderApproval(batchId: string, document: string): Promise<void> {
  return apiFetch<void>(
    `${BASE}/${encodeURIComponent(batchId)}/orders/${encodeURIComponent(document)}/approval`,
    { method: "DELETE" }
  );
}

/** 204 when the file and its decisions are gone. */
export async function deleteBatch(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Validates the file again against the supports as they are now. Without a
 * threshold the saved one is kept; either way manual approvals are kept. 422
 * when the threshold is outside 0 to 20.
 */
export async function revalidateBatch(id: string, thresholdPoints?: number): Promise<ValidationBatch> {
  return apiFetch<ValidationBatch>(`${BASE}/${encodeURIComponent(id)}/revalidate`, {
    method: "POST",
    body: thresholdPoints === undefined ? undefined : { margin_threshold_points: thresholdPoints },
  });
}
