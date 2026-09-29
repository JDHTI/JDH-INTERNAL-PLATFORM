"use client";

import { useEffect } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addComment,
  addItem,
  assignCase,
  changeStatus,
  createCase,
  createDependency,
  createDocumentType,
  createStatus,
  deleteCase,
  getCase,
  getCatalog,
  getLastSeen,
  getSuggestions,
  getSummary,
  listActivity,
  listCases,
  markRead,
  recordInboxVisit,
  removeItem,
  searchAssignees,
  updateCase,
  updateDependency,
  updateDocumentType,
  updateItem,
  updateRequestType,
  updateStatus,
} from "../services/pqrsf.service";
import type {
  ActivityFilters,
  CaseDetail,
  CaseFilters,
  CaseListParams,
  CreateCaseInput,
  ItemInput,
  PqrsfCase,
  SuggestionField,
  UpdateCaseInput,
  UpdateItemInput,
} from "../types/pqrsf.types";

export const pqrsfKeys = {
  all: ["pqrsf"] as const,
  catalogs: () => [...pqrsfKeys.all, "catalog"] as const,
  catalog: (includeInactive: boolean) => [...pqrsfKeys.catalogs(), includeInactive] as const,
  lists: () => [...pqrsfKeys.all, "cases"] as const,
  list: (params: CaseListParams) => [...pqrsfKeys.lists(), params] as const,
  summaries: () => [...pqrsfKeys.all, "summary"] as const,
  summary: (filters: CaseFilters) => [...pqrsfKeys.summaries(), filters] as const,
  detail: (id: string) => [...pqrsfKeys.all, "case", id] as const,
  suggestions: (field: SuggestionField, q: string) =>
    [...pqrsfKeys.all, "suggestions", field, q] as const,
  assignees: (q: string) => [...pqrsfKeys.all, "assignees", q] as const,
  activities: () => [...pqrsfKeys.all, "activity"] as const,
  activity: (filters: ActivityFilters) => [...pqrsfKeys.activities(), filters] as const,
  lastSeen: () => [...pqrsfKeys.all, "last-seen"] as const,
};

/** Catalogs change rarely and every screen needs them: loaded once, kept. */
export function useCatalog(includeInactive = false) {
  return useQuery({
    queryKey: pqrsfKeys.catalog(includeInactive),
    queryFn: () => getCatalog(includeInactive),
    staleTime: 5 * 60_000,
  });
}

export function useCases(params: CaseListParams, enabled = true) {
  return useQuery({
    queryKey: pqrsfKeys.list(params),
    queryFn: () => listCases(params),
    enabled,
    // Keeps the rows on screen while the next page or filter loads, instead
    // of flashing back to the skeleton on every keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useSummary(filters: CaseFilters, enabled = true) {
  return useQuery({
    queryKey: pqrsfKeys.summary(filters),
    queryFn: () => getSummary(filters),
    enabled,
  });
}

export function useCaseDetail(id: string) {
  return useQuery({
    queryKey: pqrsfKeys.detail(id),
    queryFn: () => getCase(id),
    // A 403 or 404 will not fix itself on a second try.
    retry: false,
  });
}

export function useSuggestions(field: SuggestionField, q: string, enabled: boolean) {
  return useQuery({
    queryKey: pqrsfKeys.suggestions(field, q),
    queryFn: () => getSuggestions(field, q),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAssignees(q: string, enabled: boolean) {
  return useQuery({
    queryKey: pqrsfKeys.assignees(q),
    queryFn: () => searchAssignees(q),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Every case mutation answers with the full case. It replaces the cached
 * case at once, then the detail refetches for the new timeline entries, and
 * the inbox and its counters are marked stale.
 */
function useCaseMutation<TInput>(
  id: string,
  mutationFn: (input: TInput) => Promise<PqrsfCase>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (updated) => {
      queryClient.setQueryData<CaseDetail>(pqrsfKeys.detail(id), (current) =>
        current ? { ...current, case: updated } : current
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.summaries() }),
      ]);
    },
  });
}

export function useUpdateCase(id: string) {
  return useCaseMutation(id, (input: UpdateCaseInput) => updateCase(id, input));
}

export function useAssignCase(id: string) {
  return useCaseMutation(id, (input: { assignee_user_id: string | null; note?: string | null }) =>
    assignCase(id, input)
  );
}

export function useChangeStatus(id: string) {
  return useCaseMutation(id, (input: { status_id: string; note?: string | null }) =>
    changeStatus(id, input)
  );
}

export function useAddItem(id: string) {
  return useCaseMutation(id, (input: ItemInput) => addItem(id, input));
}

export function useUpdateItem(id: string) {
  return useCaseMutation(id, ({ itemId, input }: { itemId: string; input: UpdateItemInput }) =>
    updateItem(id, itemId, input)
  );
}

export function useRemoveItem(id: string) {
  return useCaseMutation(id, (itemId: string) => removeItem(id, itemId));
}

/** Fire-and-forget: the API decides whether opening the case changes anything. */
export function useMarkRead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markRead(id),
    onSuccess: (updated) => {
      const current = queryClient.getQueryData<CaseDetail>(pqrsfKeys.detail(id));
      // Only the assignee's first read changes the case; skip the refetch otherwise.
      if (
        current &&
        current.case.first_read_at === updated.first_read_at &&
        current.case.status.id === updated.status.id
      )
        return;
      queryClient.setQueryData<CaseDetail>(pqrsfKeys.detail(id), (value) =>
        value ? { ...value, case: updated } : value
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.summaries() }),
      ]);
    },
  });
}

export function useAddComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(id, body),
    onSuccess: (event) =>
      queryClient.setQueryData<CaseDetail>(pqrsfKeys.detail(id), (current) =>
        current ? { ...current, events: [...current.events, event] } : current
      ),
  });
}

/**
 * The inbox and the history refresh; the case's own entry is left to expire,
 * because removing it while its screen is still mounted refetches a 404.
 */
export function useDeleteCase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string | null) => deleteCase(id, reason),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.summaries() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.activities() }),
      ]);
    },
  });
}

/** Module history, newest first; each page continues from the last entry. */
export function useActivity(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: pqrsfKeys.activity(filters),
    queryFn: ({ pageParam }) => listActivity(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_before,
    retry: false,
  });
}

export function useLastSeen() {
  return useQuery({ queryKey: pqrsfKeys.lastSeen(), queryFn: getLastSeen, retry: false });
}

/**
 * Leaves the «entered the inbox» record once per mount. A failure is not the
 * person's problem, so it stays silent.
 */
export function useRecordInboxVisit() {
  useEffect(() => {
    recordInboxVisit().catch(() => {});
  }, []);
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaseInput) => createCase(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.summaries() }),
        // New free-text values become suggestions for the next case.
        queryClient.invalidateQueries({ queryKey: [...pqrsfKeys.all, "suggestions"] }),
      ]),
  });
}

/** Catalog edits refresh every catalog query, active-only and full. */
function useCatalogMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pqrsfKeys.catalogs() }),
  });
}

export const useUpdateRequestType = () =>
  useCatalogMutation(({ id, input }: { id: string; input: Parameters<typeof updateRequestType>[1] }) =>
    updateRequestType(id, input)
  );
export const useCreateStatus = () => useCatalogMutation(createStatus);
export const useUpdateStatus = () =>
  useCatalogMutation(({ id, input }: { id: string; input: Parameters<typeof updateStatus>[1] }) =>
    updateStatus(id, input)
  );
export const useCreateDependency = () => useCatalogMutation(createDependency);
export const useUpdateDependency = () =>
  useCatalogMutation(
    ({ id, input }: { id: string; input: Parameters<typeof updateDependency>[1] }) =>
      updateDependency(id, input)
  );
export const useCreateDocumentType = () => useCatalogMutation(createDocumentType);
export const useUpdateDocumentType = () =>
  useCatalogMutation(
    ({ id, input }: { id: string; input: Parameters<typeof updateDocumentType>[1] }) =>
      updateDocumentType(id, input)
  );
