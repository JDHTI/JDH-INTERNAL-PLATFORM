import { apiBlob, apiDownload, apiFetch, type Query } from "@/shared/lib/api-client";

import type {
  ActivityFilters,
  ActivityPage,
  CaseDetail,
  CaseFile,
  CaseFilters,
  CaseListParams,
  CasePage,
  CaseStatus,
  CertificateDocument,
  CertificateInput,
  CertificateItem,
  DeliveryListParams,
  DeliveryPage,
  DeliverySummary,
  DocumentDeliveryDetail,
  ItemDeliveryInput,
  ItemDeliveryResult,
  CaseSummary,
  ClientReply,
  CommentInput,
  CommentResult,
  CreateCaseInput,
  Dependency,
  DocumentType,
  FeedbackDetail,
  FeedbackFilters,
  FeedbackListParams,
  FeedbackPage,
  FeedbackSummary,
  ItemInput,
  LastSeen,
  NotificationSettings,
  NotificationSettingsInput,
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
  input: Partial<Pick<DocumentType, "name" | "sla_days" | "is_active" | "allows_direct_upload">>
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

export function deleteCase(id: string, reason: string | null): Promise<void> {
  return apiFetch<void>(casePath(id), { method: "DELETE", body: { reason } });
}

// ── History ──

/** Fire-and-forget: the API skips repeats within 30 minutes. */
export function recordInboxVisit(): Promise<void> {
  return apiFetch<void>("/pqrsf/activity/visits", { method: "POST" });
}

export function listActivity(
  filters: ActivityFilters,
  before: string | null,
  limit = 50
): Promise<ActivityPage> {
  return apiFetch<ActivityPage>("/pqrsf/activity", {
    query: {
      before: before ?? undefined,
      limit,
      event_type: filters.event_type,
      actor_user_id: filters.actor_user_id,
      case_code: filters.case_code,
      include_access: filters.include_access,
    },
  });
}

export function getLastSeen(): Promise<LastSeen[]> {
  return apiFetch<LastSeen[]>("/pqrsf/activity/last-seen");
}

/** Multipart only when files go along; a plain note stays JSON. */
export function addComment(id: string, input: CommentInput): Promise<CommentResult> {
  let body: FormData | { body: string; reply_to_client: boolean };
  if (input.files.length > 0) {
    body = new FormData();
    body.append("body", input.body);
    body.append("reply_to_client", String(input.replyToClient));
    for (const file of input.files) body.append("files", file);
  } else {
    body = { body: input.body, reply_to_client: input.replyToClient };
  }
  return apiFetch<CommentResult>(`${casePath(id)}/comments`, { method: "POST", body });
}

export function getClientReplies(id: string): Promise<ClientReply[]> {
  return apiFetch<ClientReply[]>(`${casePath(id)}/client-replies`);
}

export function retryClientReply(id: string, notificationId: string): Promise<ClientReply> {
  return apiFetch<ClientReply>(`${casePath(id)}/client-replies/${notificationId}/retry`, {
    method: "POST",
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


// ── Files received by email ──

const filePath = (id: string, fileId: string) =>
  `${casePath(id)}/files/${encodeURIComponent(fileId)}/download`;

export function listCaseFiles(id: string): Promise<CaseFile[]> {
  return apiFetch<CaseFile[]>(`${casePath(id)}/files`);
}

// Bytes for the in-app preview (images, PDF); the caller owns the object URL.
export async function getCaseFileBlob(id: string, fileId: string): Promise<Blob> {
  const { blob } = await apiBlob(filePath(id, fileId));
  return blob;
}

export function downloadCaseFile(id: string, fileId: string, filename: string): Promise<void> {
  return apiDownload(filePath(id, fileId), { fallbackName: filename });
}

// ── Manual answer to a requested document ──

/** Files of Calidad's document manager that whoever works the case may link. */
export function searchCaseDocuments(caseId: string, q: string): Promise<CertificateDocument[]> {
  return apiFetch<CertificateDocument[]>(`${casePath(caseId)}/documents/search`, {
    query: { q: q || undefined },
  });
}

/**
 * Answers one requested document with a file: linked from the manager (JSON) or
 * attached for one time (multipart). The API marks the item answered and, when
 * asked, emails the customer; nothing is saved if anything fails.
 */
export function deliverItem(
  caseId: string,
  itemId: string,
  input: ItemDeliveryInput
): Promise<ItemDeliveryResult> {
  const cause = { delay_cause: input.delayCause ?? null, delay_detail: input.delayDetail ?? null };
  let body: FormData | Record<string, unknown>;
  if (input.source === "upload") {
    body = new FormData();
    body.append("source", "upload");
    body.append("file", input.file);
    body.append("send_to_client", String(input.sendToClient));
    if (cause.delay_cause) body.append("delay_cause", cause.delay_cause);
    if (cause.delay_detail) body.append("delay_detail", cause.delay_detail);
  } else {
    body = {
      source: "vault",
      document_id: input.documentId,
      send_to_client: input.sendToClient,
      ...cause,
    };
  }
  return apiFetch<ItemDeliveryResult>(`${casePath(caseId)}/items/${itemId}/delivery`, {
    method: "POST",
    body,
  });
}

// ── Certificates and document deliveries (managers only) ──

export function listCertificates(): Promise<CertificateItem[]> {
  return apiFetch<CertificateItem[]>("/pqrsf/certificates");
}

export function searchCertificateDocuments(q: string): Promise<CertificateDocument[]> {
  return apiFetch<CertificateDocument[]>("/pqrsf/certificates/documents", {
    query: { q: q || undefined },
  });
}

export function saveCertificate(
  documentTypeId: string,
  input: CertificateInput
): Promise<CertificateItem> {
  return apiFetch<CertificateItem>(`/pqrsf/certificates/${encodeURIComponent(documentTypeId)}`, {
    method: "PUT",
    body: input,
  });
}

export function removeCertificate(documentTypeId: string): Promise<void> {
  return apiFetch<void>(`/pqrsf/certificates/${encodeURIComponent(documentTypeId)}`, {
    method: "DELETE",
  });
}

const deliveryPath = (id: string) => `/pqrsf/document-deliveries/${encodeURIComponent(id)}`;

export function getDeliverySummary(): Promise<DeliverySummary> {
  return apiFetch<DeliverySummary>("/pqrsf/document-deliveries/summary");
}

export function listDeliveries(params: DeliveryListParams): Promise<DeliveryPage> {
  return apiFetch<DeliveryPage>("/pqrsf/document-deliveries", {
    query: {
      q: params.q,
      unread: params.unread,
      from: params.from,
      to: params.to,
      page: params.page,
      size: params.size,
    },
  });
}

/** Opening it marks it as read. */
export function getDelivery(id: string): Promise<DocumentDeliveryDetail> {
  return apiFetch<DocumentDeliveryDetail>(deliveryPath(id));
}

export function retryDelivery(id: string): Promise<DocumentDeliveryDetail> {
  return apiFetch<DocumentDeliveryDetail>(`${deliveryPath(id)}/retry`, { method: "POST" });
}

// ── Suggestions and compliments (managers only) ──

const feedbackPath = (id: string) => `/pqrsf/feedback/${encodeURIComponent(id)}`;
const feedbackFilePath = (id: string, fileId: string) =>
  `${feedbackPath(id)}/files/${encodeURIComponent(fileId)}/download`;

function feedbackQuery(filters: FeedbackFilters): Query {
  return {
    kind: filters.kind,
    q: filters.q,
    unread: filters.unread,
    from: filters.from,
    to: filters.to,
  };
}

export function getFeedbackSummary(): Promise<FeedbackSummary> {
  return apiFetch<FeedbackSummary>("/pqrsf/feedback/summary");
}

export function listFeedback(params: FeedbackListParams): Promise<FeedbackPage> {
  return apiFetch<FeedbackPage>("/pqrsf/feedback", {
    query: { ...feedbackQuery(params), page: params.page, size: params.size },
  });
}

/** Opening it marks it as read, like opening a case. */
export function getFeedback(id: string): Promise<FeedbackDetail> {
  return apiFetch<FeedbackDetail>(feedbackPath(id));
}

export async function getFeedbackFileBlob(id: string, fileId: string): Promise<Blob> {
  const { blob } = await apiBlob(feedbackFilePath(id, fileId));
  return blob;
}

export function downloadFeedbackFile(id: string, fileId: string, filename: string): Promise<void> {
  return apiDownload(feedbackFilePath(id, fileId), { fallbackName: filename });
}

export function getNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>("/pqrsf/settings/notifications");
}

export function updateNotificationSettings(
  input: NotificationSettingsInput
): Promise<NotificationSettings> {
  return apiFetch<NotificationSettings>("/pqrsf/settings/notifications", {
    method: "PUT",
    body: input,
  });
}