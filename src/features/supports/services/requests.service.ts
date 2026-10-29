import { apiFetch } from "@/shared/lib/api-client";
import type { RequestDetail, RequestPage, RequestParams, SupportEvent, SupportRequest } from "../types/request.types";
import type { SupplierSupport } from "../types/support.types";

const supportPath = (id: string) => `/supplier-supports/${encodeURIComponent(id)}`;
const requestPath = (id: string) => `/supplier-support-requests/${encodeURIComponent(id)}`;
export const listRequests = (params: RequestParams) => apiFetch<RequestPage>("/supplier-support-requests", { query: { ...params } });
export const getRequest = (id: string, mine = false) => apiFetch<RequestDetail>(requestPath(id), { query: { mine } });
export const createRequest = (id: string, body: { version: number; value: number; reason: string }) => apiFetch<SupportRequest>(`${supportPath(id)}/requests`, { method: "POST", body });
export const approveRequest = (id: string, body: { version: number; support_version: number }) => apiFetch<SupportRequest>(`${requestPath(id)}/approve`, { method: "POST", body });
export const rejectRequest = (id: string, body: { version: number; reason: string }) => apiFetch<SupportRequest>(`${requestPath(id)}/reject`, { method: "POST", body });
export const getJdhHistory = (id: string) => apiFetch<SupportEvent[]>(`${supportPath(id)}/jdh-history`);
export const cancelJdh = (id: string, body: { version: number; reason: string }) => apiFetch<SupplierSupport>(`${supportPath(id)}/jdh-support`, { method: "DELETE", body });
