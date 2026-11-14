import { apiFetch } from "@/shared/lib/api-client";

import type {
  InternalApproval,
  InternalRequestInput,
  InternalRequestPage,
  InternalRequestParams,
  InternalSupportRequest,
} from "../types/internal-request.types";

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

export const approveInternalRequest = (id: string, body: InternalApproval) =>
  apiFetch<InternalSupportRequest>(`${path(id)}/approve`, { method: "POST", body });

export const rejectInternalRequest = (id: string, body: { version: number; reason: string }) =>
  apiFetch<InternalSupportRequest>(`${path(id)}/reject`, { method: "POST", body });
