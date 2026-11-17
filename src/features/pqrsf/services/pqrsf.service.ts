import { apiBlob, apiDownload, apiFetch, type Query } from "@/shared/lib/api-client";

import type {
  ActivityFilters,
  ActivityPage,
  CaseDetail,
  CaseFile,
  CaseFilters,
  CaseListParams,
  CaseOpenings,
  CasePage,
  CaseStatus,
  CaseSummary,
  CauseAdmin,
  CauseInput,
  CauseUpdate,
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
  ForwardPreview,
  ForwardResult,
  ImprovementOpportunity,
  ItemInput,
  LastSeen,
  NotificationSettings,
  NotificationSettingsInput,
  OmInput,
  OmTemplate,
  Person,
  PqrsfCase,
  PqrsfSiteAdmin,
  RequestType,
  StatusChangeInput,
  SubjectAdmin,
  SubjectInput,
  SubjectUpdate,
  SuggestionField,
  SupplierContact,
  SupplierEmail,
  SupplierMessageInput,
  SupplierMessageResult,
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
    with_news: filters.with_news,
    om_sent: filters.om_sent,
    resolution: filters.resolution,
    internal_failure: filters.internal_failure,
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
  input: Partial<
    Pick<
      RequestType,
      | "prefix"
      | "requires_follow_up"
      | "sla_days"
      | "description"
      | "allows_attachments"
      | "asks_area"
    >
  >
): Promise<RequestType> {
  return apiFetch<RequestType>(`/pqrsf/request-types/${id}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * All five types with their settings (managers). The follow-up catalog leaves
 * out suggestions and compliments, which open no case, but their description
 * and evidence on the form are edited all the same.
 */
export function listRequestTypes(): Promise<RequestType[]> {
  return apiFetch<RequestType[]>("/pqrsf/request-types");
}

// Subjects and causes of the forms. Nothing is deleted: a PATCH with
// `is_active: false` takes it off the forms and old requests keep it.

export function listSubjects(): Promise<SubjectAdmin[]> {
  return apiFetch<SubjectAdmin[]>("/pqrsf/subjects", { query: { include_inactive: true } });
}

export function createSubject(input: SubjectInput): Promise<SubjectAdmin> {
  return apiFetch<SubjectAdmin>("/pqrsf/subjects", { method: "POST", body: input });
}

export function updateSubject(id: string, input: SubjectUpdate): Promise<SubjectAdmin> {
  return apiFetch<SubjectAdmin>(`/pqrsf/subjects/${id}`, { method: "PATCH", body: input });
}

export function createCause(subjectId: string, input: CauseInput): Promise<CauseAdmin> {
  return apiFetch<CauseAdmin>(`/pqrsf/subjects/${subjectId}/causes`, {
    method: "POST",
    body: input,
  });
}

export function updateCause(id: string, input: CauseUpdate): Promise<CauseAdmin> {
  return apiFetch<CauseAdmin>(`/pqrsf/causes/${id}`, { method: "PATCH", body: input });
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

/** Active people of the organization, to copy on an email. Anyone who sees PQRSF can ask. */
export function searchPeople(q: string): Promise<Person[]> {
  return apiFetch<Person[]>("/pqrsf/people", { query: { q, limit: 20 } });
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

export function changeStatus(id: string, input: StatusChangeInput): Promise<PqrsfCase> {
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
  // The copies only travel with a reply to the client; a plain note emails nobody.
  const cc = input.replyToClient ? (input.cc ?? []) : [];
  let body: FormData | { body: string; reply_to_client: boolean; cc?: string[] };
  if (input.files.length > 0) {
    body = new FormData();
    body.append("body", input.body);
    body.append("reply_to_client", String(input.replyToClient));
    for (const address of cc) body.append("cc", address);
    for (const file of input.files) body.append("files", file);
  } else {
    body = {
      body: input.body,
      reply_to_client: input.replyToClient,
      ...(cc.length > 0 && { cc }),
    };
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

/** Who opened the case and when; the timeline no longer carries it (API #55). */
export function getCaseOpenings(id: string): Promise<CaseOpenings> {
  return apiFetch<CaseOpenings>(`${casePath(id)}/openings`);
}

// ── A supplier's answer, passed on to the client (API #54) ──

const forwardPath = (id: string, eventId: string) =>
  `${casePath(id)}/events/${encodeURIComponent(eventId)}/forward-to-customer`;

/** The email as it would leave; nothing is sent. Validates like the send does. */
export function previewForward(id: string, eventId: string, note: string): Promise<ForwardPreview> {
  return apiFetch<ForwardPreview>(`${forwardPath(id, eventId)}/preview`, {
    method: "POST",
    body: { note: note || null },
  });
}

export function forwardToCustomer(id: string, eventId: string, note: string): Promise<ForwardResult> {
  return apiFetch<ForwardResult>(forwardPath(id, eventId), {
    method: "POST",
    body: { note: note || null },
  });
}

// ── Messages to the supplier (docs/pqrsf-proveedor.md) ──

export function sendSupplierMessage(
  id: string,
  input: SupplierMessageInput
): Promise<SupplierMessageResult> {
  const body = new FormData();
  body.append("kind", input.kind);
  for (const address of input.to) body.append("to", address);
  for (const address of input.cc ?? []) body.append("cc", address);
  body.append("body", input.body);
  if (input.supplierCode) body.append("supplier_code", input.supplierCode);
  if (input.supplierName) body.append("supplier_name", input.supplierName);
  body.append("include_case_data", String(input.includeCaseData));
  body.append("include_evidence", String(input.includeEvidence));
  if (input.omId) body.append("om_id", input.omId);
  for (const file of input.files) body.append("files", file);
  return apiFetch<SupplierMessageResult>(`${casePath(id)}/supplier-messages`, {
    method: "POST",
    body,
  });
}

export function getSupplierEmails(id: string): Promise<SupplierEmail[]> {
  return apiFetch<SupplierEmail[]>(`${casePath(id)}/supplier-messages`);
}

export function retrySupplierEmail(id: string, notificationId: string): Promise<SupplierEmail> {
  return apiFetch<SupplierEmail>(`${casePath(id)}/supplier-messages/${notificationId}/retry`, {
    method: "POST",
  });
}

/** Addresses already used for a supplier, the most recent first. */
export function getSupplierContacts(supplierCode: string | null, q: string): Promise<SupplierContact[]> {
  return apiFetch<SupplierContact[]>("/pqrsf/supplier-contacts", {
    query: { supplier_code: supplierCode, q, limit: 10 },
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


// ── Improvement opportunity, the OM of P.06.F.04 (API #80) ──

const omPath = (id: string) => `${casePath(id)}/improvement-opportunities`;

export function listOms(id: string): Promise<ImprovementOpportunity[]> {
  return apiFetch<ImprovementOpportunity[]>(omPath(id));
}

/** Fills the OM for a supplier, or fills it again keeping its number. */
export function generateOm(id: string, input: OmInput): Promise<ImprovementOpportunity> {
  return apiFetch<ImprovementOpportunity>(omPath(id), { method: "POST", body: input });
}

/** The PDF for the in-app preview; the caller owns the object URL. */
export async function getOmPdfBlob(id: string, omId: string): Promise<Blob> {
  const { blob } = await apiBlob(`${omPath(id)}/${encodeURIComponent(omId)}/document`, {
    format: "pdf",
    inline: true,
  });
  return blob;
}

export function downloadOm(
  id: string,
  omId: string,
  format: "pdf" | "docx",
  fallbackName: string
): Promise<void> {
  return apiDownload(`${omPath(id)}/${encodeURIComponent(omId)}/document`, {
    query: { format, inline: false },
    fallbackName,
  });
}

/** A Word edited by hand replaces the generated one; the PDF is made again from it. */
export function uploadEditedOm(id: string, omId: string, file: File): Promise<ImprovementOpportunity> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ImprovementOpportunity>(`${omPath(id)}/${encodeURIComponent(omId)}/document`, {
    method: "PUT",
    body,
  });
}

export function retryOmPdf(id: string, omId: string): Promise<ImprovementOpportunity> {
  return apiFetch<ImprovementOpportunity>(`${omPath(id)}/${encodeURIComponent(omId)}/pdf`, {
    method: "POST",
  });
}

export function listOmTemplates(): Promise<OmTemplate[]> {
  return apiFetch<OmTemplate[]>("/pqrsf/templates/om");
}

export function uploadOmTemplate(file: File, versionLabel: string): Promise<OmTemplate> {
  const body = new FormData();
  body.append("file", file);
  if (versionLabel) body.append("version_label", versionLabel);
  return apiFetch<OmTemplate>("/pqrsf/templates/om", { method: "POST", body });
}

export function downloadOmTemplate(template: OmTemplate): Promise<void> {
  return apiDownload(`/pqrsf/templates/om/${encodeURIComponent(template.id)}/download`, {
    fallbackName: template.filename,
  });
}

export function getOmSettings(): Promise<{ next_number: number }> {
  return apiFetch<{ next_number: number }>("/pqrsf/om/settings");
}

export function setOmNextNumber(nextNumber: number): Promise<{ next_number: number }> {
  return apiFetch<{ next_number: number }>("/pqrsf/om/settings", {
    method: "PUT",
    body: { next_number: nextNumber },
  });
}

// ── The site catalog (platform administrators) ──

export function listPqrsfSites(): Promise<PqrsfSiteAdmin[]> {
  return apiFetch<PqrsfSiteAdmin[]>("/sites", { query: { include_inactive: true } });
}

/** `city`, `address` and `om_code` are what the OM prints; `null` clears them. */
export function updatePqrsfSite(
  id: string,
  input: Partial<Pick<PqrsfSiteAdmin, "city" | "address" | "om_code">>
): Promise<PqrsfSiteAdmin> {
  return apiFetch<PqrsfSiteAdmin>(`/sites/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
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