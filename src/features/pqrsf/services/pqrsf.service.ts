import { apiBlob, apiDownload, apiFetch, type Query } from "@/shared/lib/api-client";

import type {
  CaseDetail,
  CaseEvent,
  CaseFilters,
  CaseListParams,
  CasePage,
  CaseStatus,
  CaseSummary,
  CreateCaseInput,
  Dependency,
  DocumentType,
  ItemInput,
  Person,
  PqrsfCase,
  RequestType,
  SuggestionField,
  TrackingCatalog,
  UpdateCaseInput,
  UpdateItemInput,
} from "../types/pqrsf.types";

const casePath = (id: string) => `/pqrsf/cases/${encodeURIComponent(id)}`;

function filterQuery(filters: CaseFilters): Query {
  return {
    status_id: filters.status_id,
    request_type_id: filters.request_type_id,
    assignee_user_id: filters.assignee_user_id,
    unassigned: filters.unassigned,
    dependency_id: filters.dependency_id,
    site_id: filters.site_id,
    open_only: filters.open_only,
    overdue: filters.overdue,
    due_today: filters.due_today,
    received_from: filters.received_from,
    received_to: filters.received_to,
    q: filters.q,
    mine: filters.mine,
    sort: filters.sort,
  };
}

// ── Catalogs ──

export function getCatalog(includeInactive = false): Promise<TrackingCatalog> {
  return apiFetch<TrackingCatalog>("/pqrsf/tracking/catalogs", {
    query: { include_inactive: includeInactive },
  });
}

export function updateRequestType(
  id: string,
  input: Partial<Pick<RequestType, "prefix" | "requires_follow_up" | "sla_days">>
): Promise<RequestType> {
  return apiFetch<RequestType>(`/pqrsf/request-types/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function createStatus(
  input: Pick<CaseStatus, "code" | "name" | "sort_order" | "is_initial" | "is_terminal">
): Promise<CaseStatus> {
  return apiFetch<CaseStatus>("/pqrsf/statuses", { method: "POST", body: input });
}

export function updateStatus(
  id: string,
  input: Partial<
    Pick<CaseStatus, "name" | "sort_order" | "is_initial" | "is_terminal" | "is_active">
  >
): Promise<CaseStatus> {
  return apiFetch<CaseStatus>(`/pqrsf/statuses/${id}`, { method: "PATCH", body: input });
}

export function createDependency(
  input: Pick<Dependency, "code" | "name" | "sort_order">
): Promise<Dependency> {
  return apiFetch<Dependency>("/pqrsf/dependencies", { method: "POST", body: input });
}

export function updateDependency(
  id: string,
  input: Partial<Pick<Dependency, "name" | "sort_order" | "is_active">>
): Promise<Dependency> {
  return apiFetch<Dependency>(`/pqrsf/dependencies/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function createDocumentType(
  input: Pick<DocumentType, "name" | "sla_days">
): Promise<DocumentType> {
  return apiFetch<DocumentType>("/pqrsf/document-types", { method: "POST", body: input });
}

export function updateDocumentType(
  id: string,
  input: Partial<Pick<DocumentType, "name" | "sla_days" | "is_active">>
): Promise<DocumentType> {
  return apiFetch<DocumentType>(`/pqrsf/document-types/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function searchAssignees(q: string): Promise<Person[]> {
  return apiFetch<Person[]>("/pqrsf/assignees", { query: { q } });
}

// ── Inbox ──

export function listCases(params: CaseListParams): Promise<CasePage> {
  return apiFetch<CasePage>("/pqrsf/cases", {
    query: { ...filterQuery(params), page: params.page, size: params.size },
  });
}

export function getSummary(filters: CaseFilters): Promise<CaseSummary> {
  return apiFetch<CaseSummary>("/pqrsf/cases/summary", {
    query: filterQuery(filters),
  });
}

export function exportCases(filters: CaseFilters): Promise<void> {
  return apiDownload("/pqrsf/cases/export", {
    query: filterQuery(filters),
    // The API's Content-Disposition name wins; this is only the fallback.
    fallbackName: `pqrsf-seguimiento-${new Date().toISOString().slice(0, 10)}.csv`,
  });
}

export function getSuggestions(field: SuggestionField, q: string): Promise<string[]> {
  return apiFetch<string[]>("/pqrsf/cases/suggestions", { query: { field, q } });
}

// ── One case ──

export function createCase(input: CreateCaseInput): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>("/pqrsf/cases", { method: "POST", body: input });
}

export function getCase(id: string): Promise<CaseDetail> {
  return apiFetch<CaseDetail>(casePath(id));
}

export function updateCase(id: string, input: UpdateCaseInput): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(casePath(id), { method: "PATCH", body: input });
}

export function assignCase(
  id: string,
  input: { assignee_user_id: string | null; note?: string | null }
): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/assignment`, {
    method: "POST",
    body: input,
  });
}

export function changeStatus(
  id: string,
  input: { status_id: string; note?: string | null }
): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/status`, { method: "POST", body: input });
}

export function markRead(id: string): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/read`, { method: "POST" });
}

export function addComment(id: string, body: string): Promise<CaseEvent> {
  return apiFetch<CaseEvent>(`${casePath(id)}/comments`, {
    method: "POST",
    body: { body },
  });
}

export function addItem(id: string, input: ItemInput): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/items`, { method: "POST", body: input });
}

export function updateItem(
  id: string,
  itemId: string,
  input: UpdateItemInput
): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/items/${itemId}`, {
    method: "PATCH",
    body: input,
  });
}

export function removeItem(id: string, itemId: string): Promise<PqrsfCase> {
  return apiFetch<PqrsfCase>(`${casePath(id)}/items/${itemId}`, { method: "DELETE" });
}

/** Image bytes for a thumbnail; the caller owns the object URL. */
export async function getAttachmentBlob(id: string, attachmentId: string): Promise<Blob> {
  const { blob } = await apiBlob(`${casePath(id)}/attachments/${attachmentId}/download`);
  return blob;
}

export function downloadAttachment(
  id: string,
  attachmentId: string,
  filename: string
): Promise<void> {
  return apiDownload(`${casePath(id)}/attachments/${attachmentId}/download`, {
    fallbackName: filename,
  });
}
