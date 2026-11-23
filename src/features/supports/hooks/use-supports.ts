"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { calcMethodLabel, choiceLabel } from "../lib/format";
import {
  attachToSelection,
  attachToSupport,
  listAttachments,
  listBusinessGroups,
  listReplacementAlerts,
  previewSelection,
  previewSupport,
  retireSupports,
  deleteSupports,
  unlinkAttachment,
  viewAttachment,
  createSupport,
  createSupportsByGroup,
  deleteProfile,
  getCommercialSupplier,
  getFormSchema,
  getProfile,
  getSupport,
  getSupportCatalogs,
  getSupportPermissions,
  listFilterFields,
  listProfiles,
  listSupportConflicts,
  runBulkLoad,
  saveProfile,
  searchSupports,
  summarizeSupports,
  updateSupport,
  voidSupport,
} from "../services/supports.service";
import type {
  AttachmentSelection,
  AttachmentUpload,
  BulkLoadInput,
  ColumnMap,
  DeleteSupportsBody,
  RetireBody,
  SupportCreateBody,
  SupportPatch,
  SupportProfileBody,
  SupportSearchBody,
} from "../types/support.types";

export const supportKeys = {
  all: ["supplier-supports"] as const,
  search: (body: SupportSearchBody) => [...supportKeys.all, "search", body] as const,
  fields: () => [...supportKeys.all, "fields"] as const,
  catalogs: () => [...supportKeys.all, "catalogs"] as const,
  formSchema: () => [...supportKeys.all, "form-schema"] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
  conflicts: (id: string) => [...supportKeys.all, "conflicts", id] as const,
  attachments: (id: string) => [...supportKeys.all, "attachments", id] as const,
  profiles: ["supplier-support-profiles"] as const,
  profile: (code: string) => [...supportKeys.profiles, code] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useSupportSearch(body: SupportSearchBody) {
  return useQuery({
    queryKey: supportKeys.search(body),
    queryFn: () => searchSupports(body),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/**
 * The counts by state behind the KPIs. Page, size and sort never change them, so they are left
 * out of the key: paging the list does not ask again. An API without the endpoint (older than
 * #99) answers 404 and the KPIs stay hidden.
 */
export function useSupportSummary(body: SupportSearchBody, enabled: boolean) {
  // The state is left out too: each count is what its own chip would list.
  const filters: Partial<SupportSearchBody> = { ...body };
  delete filters.page;
  delete filters.size;
  delete filters.sort;
  delete filters.state;
  return useQuery({
    queryKey: [...supportKeys.all, "summary", filters] as const,
    queryFn: () => summarizeSupports({ ...(filters as Omit<SupportSearchBody, "page" | "size" | "sort">), sort: [], page: 1, size: 1 }),
    enabled,
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useFilterFields() {
  return useQuery({
    queryKey: supportKeys.fields(),
    queryFn: listFilterFields,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

/**
 * Whether the user may write supports and special cases. Controls stay hidden
 * until the API confirms permission. Backend authorization remains mandatory.
 */
export function useCanManage(): boolean {
  const permissions = useSupportPermissions();
  return permissions.data?.can_manage === true;
}

export function useSupportPermissions() {
  return useQuery({
    queryKey: [...supportKeys.all, "permissions"],
    queryFn: getSupportPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useFormSchema() {
  return useQuery({
    queryKey: supportKeys.formSchema(),
    queryFn: getFormSchema,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

/**
 * Readable name of a calc method ("Tipo apoyo"): the catalog's labels, then the
 * form schema's, with the built-in ones while they load or on an older API.
 */
export function useCalcMethodLabel(): (code: string | null | undefined) => string {
  const fromCatalogs = useSupportCatalogs().data?.calc_method_labels;
  const fromSchema = useFormSchema().data?.calc_method_labels;
  const labels = fromCatalogs ?? fromSchema;
  return useCallback((code: string | null | undefined) => calcMethodLabel(code, labels), [labels]);
}

/** Readable name of a support class ("Clase apoyo"), the catalog's first. */
export function useKindLabel(): (code: string | null | undefined) => string {
  const labels = useSupportCatalogs().data?.kind_labels;
  return useCallback((code: string | null | undefined) => (code ? choiceLabel("kind", code, labels) : "—"), [labels]);
}

/**
 * Creates one support, or one per customer of a business group (`byGroup`).
 * Always a list back, so both read the same.
 */
export function useCreateSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, byGroup }: { body: SupportCreateBody; byGroup: boolean }) =>
      byGroup ? createSupportsByGroup(body) : [await createSupport(body)],
    onSuccess: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

/** Business groups whose name contains `q` (2 characters at least). */
export function useBusinessGroups(q: string) {
  return useQuery({
    queryKey: [...supportKeys.all, "business-groups", q],
    queryFn: () => listBusinessGroups(q),
    enabled: q.length >= 2,
    staleTime: 5 * 60_000,
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/** The create form's figures for `body`; null waits until the form has enough to price. */
export function useSupportPreview(body: SupportCreateBody | null) {
  return useQuery({
    queryKey: [...supportKeys.all, "preview", body],
    queryFn: () => previewSupport(body!),
    enabled: body !== null,
    retry: retryTransient,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Managers only: `enabled` stays off for the rest, who would get a 403. */
export function useReplacementAlerts(enabled: boolean) {
  return useQuery({
    queryKey: [...supportKeys.all, "alerts"],
    queryFn: listReplacementAlerts,
    enabled,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useRetireSupports() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RetireBody) => retireSupports(body),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useDeleteSupports() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DeleteSupportsBody) => deleteSupports(body),
    // Their requests go with them, so the request trays are refreshed too.
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: supportKeys.all }),
        client.invalidateQueries({ queryKey: ["internal-support-requests"] }),
      ]),
  });
}

export function useCommercialSupplier(code: string) {
  return useQuery({
    queryKey: ["commercial-suppliers", code],
    queryFn: () => getCommercialSupplier(code),
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useProfiles() {
  return useQuery({ queryKey: supportKeys.profiles, queryFn: listProfiles, retry: retryTransient });
}

/** null while no supplier is chosen, and also when the supplier has no profile. */
export function useProfile(supplierCode: string | null) {
  return useQuery({
    queryKey: supportKeys.profile(supplierCode ?? ""),
    queryFn: () => getProfile(supplierCode!),
    enabled: supplierCode !== null,
    retry: retryTransient,
  });
}

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierCode, body }: { supplierCode: string; body: SupportProfileBody }) =>
      saveProfile(supplierCode, body),
    // Seeded right away so a second save in a row already carries the new version.
    onSuccess: (profile) => client.setQueryData(supportKeys.profile(profile.supplier_code), profile),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.profiles }),
  });
}

export function useDeleteProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (supplierCode: string) => deleteProfile(supplierCode),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.profiles }),
  });
}

/**
 * Adds the headers mapped during a bulk load to the supplier's profile. Reads
 * the profile first so the rest of it is kept, and creates it if missing.
 */
export function useAddColumnsToProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierCode, columnMap }: { supplierCode: string; columnMap: ColumnMap }) => {
      const current = await getProfile(supplierCode);
      if (!current) return saveProfile(supplierCode, { defaults: {}, column_map: columnMap, sheet: null, notes: null });
      const merged: ColumnMap = { ...current.column_map };
      for (const [field, headers] of Object.entries(columnMap)) {
        merged[field] = [...new Set([...(merged[field] ?? []), ...headers])];
      }
      return saveProfile(supplierCode, {
        defaults: current.defaults,
        column_map: merged,
        sheet: current.sheet,
        notes: current.notes,
        version: current.version,
      });
    },
    onSuccess: (profile) => client.setQueryData(supportKeys.profile(profile.supplier_code), profile),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.profiles }),
  });
}

export function useAttachments(supportId: string | null) {
  return useQuery({
    queryKey: supportKeys.attachments(supportId ?? ""),
    queryFn: () => listAttachments(supportId!),
    enabled: supportId !== null,
    retry: retryTransient,
  });
}

/**
 * The viewer's link, asked for when a document is shown. The link expires in
 * minutes, so it is dropped from the cache as soon as the viewer moves on.
 */
export function useAttachmentView(supportId: string, documentId: string | null) {
  return useQuery({
    queryKey: [...supportKeys.attachments(supportId), "view", documentId],
    queryFn: () => viewAttachment(supportId, documentId!, false),
    enabled: documentId !== null,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: retryTransient,
  });
}

/** A link changes the attachment counts in the list, so every cached search is refetched too. */
export function useAttachToSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ supportId, upload }: { supportId: string; upload: AttachmentUpload }) =>
      attachToSupport(supportId, upload),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useUnlinkAttachment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ supportId, documentId }: { supportId: string; documentId: string }) =>
      unlinkAttachment(supportId, documentId),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

/** How many supports a selection reaches; re-asked whenever the selection changes. */
export function useSelectionPreview(selection: AttachmentSelection | null) {
  return useQuery({
    queryKey: [...supportKeys.all, "attach-preview", selection],
    queryFn: () => previewSelection(selection!),
    enabled: selection !== null,
    retry: retryTransient,
  });
}

export function useAttachToSelection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      selection,
      upload,
    }: {
      selection: AttachmentSelection;
      upload: AttachmentUpload & { documentIds: string[] };
    }) => attachToSelection(selection, upload),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

/** Simulates or applies a file; an applied load refreshes every cached search. */
export function useBulkLoad() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkLoadInput) => runBulkLoad(input),
    onSuccess: (report) => {
      if (report.applied) client.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

export function useSupportCatalogs() {
  return useQuery({
    queryKey: supportKeys.catalogs(),
    queryFn: getSupportCatalogs,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useSupport(id: string | null) {
  return useQuery({
    queryKey: supportKeys.detail(id ?? ""),
    queryFn: () => getSupport(id!),
    enabled: id !== null,
    retry: retryTransient,
  });
}

export function useSupportConflicts(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: supportKeys.conflicts(id ?? ""),
    queryFn: () => listSupportConflicts(id!),
    enabled: id !== null && enabled,
    retry: retryTransient,
  });
}

/** Any write to a support can change its state, so every cached search and detail is refetched. */
export function useUpdateSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SupportPatch }) => updateSupport(id, patch),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useVoidSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version, reason }: { id: string; version: number; reason: string }) =>
      voidSupport(id, { version, reason }),
    onSettled: () => client.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
