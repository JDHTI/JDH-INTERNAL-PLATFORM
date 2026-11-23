import { apiFetch } from "@/shared/lib/api-client";

import type {
  DirectRequestInput,
  TargetMargins,
  InternalApproval,
  InternalRequestInput,
  InternalRequestPage,
  InternalRequestParams,
  InternalSupportRequest,
} from "../types/internal-request.types";
import type { DeleteResult } from "../types/request.types";

const path = (id: string) => `/internal-support-requests/${encodeURIComponent(id)}`;

export const listInternalRequests = (params: InternalRequestParams) =>
  apiFetch<InternalRequestPage>("/internal-support-requests", { query: { ...params } });

export const getInternalRequest = (id: string, mine = false) =>
  apiFetch<InternalSupportRequest>(path(id), { query: { mine } });

export const createInternalRequest = (quotationId: string, body: InternalRequestInput) =>
  apiFetch<InternalSupportRequest>(`/quotations/${encodeURIComponent(quotationId)}/support-requests`, {
    method: "POST",
    body,
  });

/** No quotation: one customer and SKUs of one supplier, each under its current margin. */
export const createDirectRequest = (body: DirectRequestInput) =>
  apiFetch<InternalSupportRequest>("/internal-support-requests", { method: "POST", body });

/** 422 for an unknown customer (the NIT may carry its check digit); unknown SKUs are left out. */
export const getTargetMargins = (customerNit: string, skus: string[]) =>
  apiFetch<TargetMargins>("/internal-support-requests/target-margins", { query: { customer_nit: customerNit, sku: skus } });

export const approveInternalRequest =(id: string, body: InternalApproval) =>
  apiFetch<InternalSupportRequest>(`${path(id)}/approve`, { method: "POST", body });

/** For good, 1 to 500 at once (`can_delete` only). What was approved stays in the supports. */
export const deleteInternalRequests = (ids: string[]) =>
  apiFetch<DeleteResult>("/internal-support-requests/delete", { method: "POST", body: { ids } });

export const rejectInternalRequest = (id: string, body: { version: number; reason: string }) =>
  apiFetch<InternalSupportRequest>(`${path(id)}/reject`, { method: "POST", body });
