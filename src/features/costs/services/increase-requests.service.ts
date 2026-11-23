import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  IncreaseRequestDetail,
  IncreaseRequestPage,
  IncreaseUploadReport,
  LineInput,
  LinePatch,
  RequestStatus,
  SupplierItem,
} from "../types/increase-requests.types";

const REQUESTS = "/costs/increase-requests";
const requestPath = (id: string) => `${REQUESTS}/${encodeURIComponent(id)}`;

/** The supplier's active products with their old cost, for the manual form. */
export function listSupplierItems(supplierCode: string, q: string): Promise<SupplierItem[]> {
  return apiFetch<SupplierItem[]>(`${REQUESTS}/items`, { query: { supplier_code: supplierCode, q: q || undefined } });
}

/** The supplier's MAESTRA, saved under the name the API gives it. */
export function downloadTemplate(supplierCode: string): Promise<void> {
  return apiDownload(`${REQUESTS}/template`, {
    query: { supplier_code: supplierCode },
    fallbackName: `MAESTRA ${supplierCode}.xlsx`,
  });
}

/** Without `apply` it only reads the workbook and reports; with it, it creates the request. */
export function uploadIncreaseWorkbook(supplierCode: string, file: File, note: string, apply: boolean): Promise<IncreaseUploadReport> {
  const body = new FormData();
  body.append("file", file);
  if (note.trim()) body.append("note", note.trim());
  return apiFetch<IncreaseUploadReport>(`${REQUESTS}/upload`, {
    method: "POST",
    query: { supplier_code: supplierCode, apply: apply ? "true" : "false" },
    body,
  });
}

export function createIncreaseRequest(supplierCode: string, note: string, lines: LineInput[]): Promise<IncreaseRequestDetail> {
  return apiFetch<IncreaseRequestDetail>(REQUESTS, {
    method: "POST",
    body: { supplier_code: supplierCode, note: note.trim() || null, lines },
  });
}

export function listIncreaseRequests(params: {
  status: RequestStatus | "";
  supplier: string;
  page: number;
  size: number;
}): Promise<IncreaseRequestPage> {
  return apiFetch<IncreaseRequestPage>(REQUESTS, {
    query: { status: params.status || undefined, supplier: params.supplier || undefined, page: params.page, size: params.size },
  });
}

export function getIncreaseRequest(id: string): Promise<IncreaseRequestDetail> {
  return apiFetch<IncreaseRequestDetail>(requestPath(id));
}

export function downloadRequestFile(id: string, fallbackName: string): Promise<void> {
  return apiDownload(`${requestPath(id)}/file`, { fallbackName });
}

export function updateRequestLine(id: string, lineId: string, patch: LinePatch): Promise<IncreaseRequestDetail> {
  return apiFetch<IncreaseRequestDetail>(`${requestPath(id)}/lines/${encodeURIComponent(lineId)}`, { method: "PATCH", body: patch });
}

export function approveIncreaseRequest(id: string, note: string): Promise<IncreaseRequestDetail> {
  return apiFetch<IncreaseRequestDetail>(`${requestPath(id)}/approve`, { method: "POST", body: { note: note.trim() || null } });
}

/** The reason is required. */
export function rejectIncreaseRequest(id: string, note: string): Promise<IncreaseRequestDetail> {
  return apiFetch<IncreaseRequestDetail>(`${requestPath(id)}/reject`, { method: "POST", body: { note: note.trim() } });
}
