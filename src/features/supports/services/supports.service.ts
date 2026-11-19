import { ApiError, apiDownload, apiFetch } from "@/shared/lib/api-client";

import type { SupportPermissions } from "../types/request.types";

import type {
  AttachmentSelection,
  AttachmentUpload,
  AttachmentView,
  AttachResult,
  BulkLoadInput,
  SelectionPreview,
  SupportAttachment,
  BulkReport,
  BusinessGroup,
  FilterField,
  ReplacementAlert,
  RetireBody,
  RetireResult,
  SupplierSupport,
  SupportCatalogs,
  SupportConflict,
  SupportCreateBody,
  SupportFormSchema,
  SupportPage,
  SupportPatch,
  SupportProfile,
  SupportProfileBody,
  SupportSearchBody,
} from "../types/support.types";

export async function searchSupports(body: SupportSearchBody): Promise<SupportPage> {
  return apiFetch<SupportPage>("/supplier-supports/search", { method: "POST", body });
}

export async function listFilterFields(): Promise<FilterField[]> {
  return apiFetch<FilterField[]>("/supplier-supports/search/fields");
}

export async function getSupportPermissions(): Promise<SupportPermissions> {
  return apiFetch<SupportPermissions>("/supplier-supports/permissions");
}

export async function getSupportCatalogs(): Promise<SupportCatalogs> {
  return apiFetch<SupportCatalogs>("/supplier-supports/catalogs");
}

export async function getSupport(id: string): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}`);
}

export async function listSupportConflicts(id: string): Promise<SupportConflict[]> {
  return apiFetch<SupportConflict[]>(`/supplier-supports/${encodeURIComponent(id)}/conflicts`);
}

/** 409 means the row changed since it was read; 403, that the user cannot write. */
export async function updateSupport(id: string, patch: SupportPatch): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function voidSupport(
  id: string,
  body: { version: number; reason: string }
): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}/void`, {
    method: "POST",
    body,
  });
}

export async function getFormSchema(): Promise<SupportFormSchema> {
  return apiFetch<SupportFormSchema>("/supplier-supports/form-schema");
}

/** 409 with `overlaps` when it crosses a live support of the same class and scope. */
export async function createSupport(body: SupportCreateBody): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>("/supplier-supports", { method: "POST", body });
}

/** The figures a support would have, from the create body; nothing is saved. 422 like creating. */
export async function previewSupport(body: SupportCreateBody): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>("/supplier-supports/preview", { method: "POST", body });
}

/** Programmed supports that will replace one in force. Managers only (403 for the rest). */
export async function listReplacementAlerts(): Promise<ReplacementAlert[]> {
  return apiFetch<ReplacementAlert[]>("/supplier-supports/alerts");
}

/** The supplier's supports in force or programmed, with a «Validación» column to upload back. */
export async function downloadBulkExport(supplierCode: string): Promise<void> {
  return apiDownload("/supplier-supports/bulk/export", {
    query: { supplier_code: supplierCode },
    fallbackName: `apoyos-${supplierCode}.xlsx`,
  });
}

/** One support per active customer of `customer_group` (no NIT). All or none; same 409 as one. */
export async function createSupportsByGroup(body: SupportCreateBody): Promise<SupplierSupport[]> {
  return apiFetch<SupplierSupport[]>("/supplier-supports/by-group", { method: "POST", body });
}

export async function listBusinessGroups(q: string): Promise<BusinessGroup[]> {
  return apiFetch<BusinessGroup[]>("/supplier-supports/business-groups", { query: { q } });
}

/** Voids or expires up to 2.000 supports at once. All or none: 409 if one changed or is voided. */
export async function retireSupports(body: RetireBody): Promise<RetireResult> {
  return apiFetch<RetireResult>("/supplier-supports/retire", { method: "POST", body });
}

/** A commercial supplier by its code ("Cod. Proveedor"); 404 if the masters do not have it. */
export async function getCommercialSupplier(code: string): Promise<{ code: string; name: string }> {
  return apiFetch<{ code: string; name: string }>(`/commercial/suppliers/${encodeURIComponent(code)}`);
}

export async function listProfiles(): Promise<SupportProfile[]> {
  return apiFetch<SupportProfile[]>("/supplier-support-profiles");
}

/** A supplier without a profile answers 404; that is not an error here. */
export async function getProfile(supplierCode: string): Promise<SupportProfile | null> {
  try {
    return await apiFetch<SupportProfile>(`/supplier-support-profiles/${encodeURIComponent(supplierCode)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function saveProfile(supplierCode: string, body: SupportProfileBody): Promise<SupportProfile> {
  return apiFetch<SupportProfile>(`/supplier-support-profiles/${encodeURIComponent(supplierCode)}`, {
    method: "PUT",
    body,
  });
}

export async function deleteProfile(supplierCode: string): Promise<void> {
  return apiFetch<void>(`/supplier-support-profiles/${encodeURIComponent(supplierCode)}`, { method: "DELETE" });
}

/**
 * The short general template by default, in BI's order with dropdowns; `full`
 * brings every field and `groups` is the business-group upload's. With a
 * supplier, it follows its profile: its headers, without the fixed columns.
 */
export async function downloadBulkTemplate(
  supplierCode: string | null,
  { full = false, groups = false }: { full?: boolean; groups?: boolean } = {}
): Promise<void> {
  const name = ["carga-apoyos", supplierCode, groups ? "grupos" : null, full ? "completa" : null].filter(Boolean).join("-");
  return apiDownload("/supplier-supports/bulk/template", {
    query: { supplier_code: supplierCode, full, groups },
    fallbackName: `${name}.xlsx`,
  });
}

export async function runBulkLoad({
  file,
  apply,
  supplierCode,
  sheet,
  defaults,
  columnMap,
  expireMissing,
  onOverlap,
  groups,
}: BulkLoadInput): Promise<BulkReport> {
  const form = new FormData();
  form.append("file", file);
  if (Object.keys(defaults).length > 0) form.append("defaults", JSON.stringify(defaults));
  if (Object.keys(columnMap).length > 0) form.append("column_map", JSON.stringify(columnMap));
  return apiFetch<BulkReport>(groups ? "/supplier-supports/bulk/groups" : "/supplier-supports/bulk", {
    method: "POST",
    query: {
      apply,
      supplier_code: supplierCode,
      sheet,
      // The group upload has no "close the missing ones".
      expire_missing: groups ? undefined : expireMissing,
      on_overlap: onOverlap,
    },
    body: form,
  });
}

export async function listAttachments(supportId: string): Promise<SupportAttachment[]> {
  return apiFetch<SupportAttachment[]>(`/supplier-supports/${encodeURIComponent(supportId)}/attachments`);
}

/**
 * A link to one document of this support, for anyone who can read the support
 * (no document-manager membership needed). 404 if it is not linked to it.
 */
export async function viewAttachment(supportId: string, documentId: string, download: boolean): Promise<AttachmentView> {
  return apiFetch<AttachmentView>(
    `/supplier-supports/${encodeURIComponent(supportId)}/attachments/${encodeURIComponent(documentId)}/view`,
    { query: { download } }
  );
}

function uploadForm({ files, name, description, tags }: AttachmentUpload): FormData {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  if (name?.trim() && files.length === 1) form.append("name", name.trim());
  if (description?.trim()) form.append("description", description.trim());
  if (tags?.trim()) form.append("tags", tags.trim());
  return form;
}

export async function attachToSupport(supportId: string, upload: AttachmentUpload): Promise<AttachResult> {
  return apiFetch<AttachResult>(`/supplier-supports/${encodeURIComponent(supportId)}/attachments`, {
    method: "POST",
    body: uploadForm(upload),
  });
}

/** Only unlinks: the document stays in the document manager and on its other supports. */
export async function unlinkAttachment(supportId: string, documentId: string): Promise<void> {
  return apiFetch<void>(
    `/supplier-supports/${encodeURIComponent(supportId)}/attachments/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
}

export async function previewSelection(selection: AttachmentSelection): Promise<SelectionPreview> {
  return apiFetch<SelectionPreview>("/supplier-supports/attachments/preview", { method: "POST", body: selection });
}

/** All or nothing: if a file or a link fails, the files this call uploaded are removed. */
export async function attachToSelection(
  selection: AttachmentSelection,
  upload: AttachmentUpload & { documentIds: string[] }
): Promise<AttachResult> {
  const form = uploadForm(upload);
  form.append("selection", JSON.stringify(selection));
  if (upload.documentIds.length > 0) form.append("document_ids", JSON.stringify(upload.documentIds));
  return apiFetch<AttachResult>("/supplier-supports/attachments", { method: "POST", body: form });
}
