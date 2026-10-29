"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  attachToSelection,
  attachToSupport,
  listAttachments,
  previewSelection,
  unlinkAttachment,
  viewAttachment,
  createSpecialCase,
  createSupport,
  deleteProfile,
  getCommercialSupplier,
  getFormSchema,
  getProfile,
  getSupport,
  getSupportCatalogs,
  getSupportPermissions,
  listFilterFields,
  listProfiles,
  listSpecialCases,
  listSupportConflicts,
  runBulkLoad,
  saveProfile,
  searchSupports,
  updateSpecialCase,
  updateSupport,
  voidSupport,
} from "../services/supports.service";
import type {
  AttachmentSelection,
  AttachmentUpload,
  BulkLoadInput,
  ColumnMap,
  SpecialCaseInput,
  SpecialCaseParams,
  SpecialCasePatch,
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
  cases: (params: SpecialCaseParams) => ["supplier-special-cases", params] as const,
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

export function useCreateSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SupportCreateBody) => createSupport(body),
    onSuccess: () => client.invalidateQueries({ queryKey: supportKeys.all }),
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

export function useSpecialCases(params: SpecialCaseParams) {
  return useQuery({
    queryKey: supportKeys.cases(params),
    queryFn: () => listSpecialCases(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSpecialCase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SpecialCaseInput) => createSpecialCase(input),
    onSettled: () => client.invalidateQueries({ queryKey: ["supplier-special-cases"] }),
  });
}

export function useUpdateSpecialCase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SpecialCasePatch }) => updateSpecialCase(id, patch),
    onSettled: () => client.invalidateQueries({ queryKey: ["supplier-special-cases"] }),
  });
}
