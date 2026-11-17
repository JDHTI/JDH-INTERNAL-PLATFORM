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
  createCause,
  createDependency,
  createDocumentType,
  createStatus,
  createSubject,
  deleteCase,
  forwardToCustomer,
  getCase,
  generateOm,
  getCaseOpenings,
  getCatalog,
  getOmSettings,
  listOmTemplates,
  listOms,
  listPqrsfSites,
  retryOmPdf,
  setOmNextNumber,
  updatePqrsfSite,
  uploadEditedOm,
  uploadOmTemplate,
  getClientReplies,
  getFeedback,
  getFeedbackSummary,
  getLastSeen,
  listFeedback,
  getNotificationSettings,
  listCaseFiles,
  getSuggestions,
  getSummary,
  listActivity,
  listCases,
  listRequestTypes,
  listSubjects,
  markRead,
  previewForward,
  recordInboxVisit,
  removeItem,
  retryClientReply,
  retrySupplierEmail,
  sendSupplierMessage,
  getSupplierEmails,
  getSupplierContacts,
  searchAssignees,
  searchPeople,
  updateCase,
  updateCause,
  updateDependency,
  updateDocumentType,
  updateItem,
  updateNotificationSettings,
  updateRequestType,
  updateStatus,
  updateSubject,
} from "../services/pqrsf.service";
import type {
  ActivityFilters,
  CaseDetail,
  CaseFilters,
  CaseListParams,
  CauseInput,
  CauseUpdate,
  CommentInput,
  CreateCaseInput,
  FeedbackListParams,
  ItemInput,
  OmInput,
  PqrsfCase,
  PqrsfSiteAdmin,
  StatusChangeInput,
  SubjectUpdate,
  SuggestionField,
  SupplierMessageInput,
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
  people: (q: string) => [...pqrsfKeys.all, "people", q] as const,
  activities: () => [...pqrsfKeys.all, "activity"] as const,
  activity: (filters: ActivityFilters) => [...pqrsfKeys.activities(), filters] as const,
  lastSeen: () => [...pqrsfKeys.all, "last-seen"] as const,
  notificationSettings: () => [...pqrsfKeys.all, "notification-settings"] as const,
  feedback: () => [...pqrsfKeys.all, "feedback"] as const,
  feedbackSummary: () => [...pqrsfKeys.feedback(), "summary"] as const,
  feedbackLists: () => [...pqrsfKeys.feedback(), "list"] as const,
  feedbackList: (params: FeedbackListParams) => [...pqrsfKeys.feedbackLists(), params] as const,
  feedbackDetail: (id: string) => [...pqrsfKeys.feedback(), "detail", id] as const,
  clientReplies: (id: string) => [...pqrsfKeys.detail(id), "client-replies"] as const,
  subjects: () => [...pqrsfKeys.all, "subjects"] as const,
  formTypes: () => [...pqrsfKeys.all, "form-types"] as const,
  supplierEmails: (id: string) => [...pqrsfKeys.detail(id), "supplier-emails"] as const,
};

/** Catalogs change rarely and every screen needs them: loaded once, kept. */
export function useCatalog(includeInactive = false) {
  return useQuery({
    queryKey: pqrsfKeys.catalog(includeInactive),
    queryFn: () => getCatalog(includeInactive),
    staleTime: 5 * 60_000,
  });
}

/**
 * Several people work the same inbox, so its rows and counters poll while the
 * tab is visible and catch up when the tab comes back into focus. A hidden
 * tab asks nothing (refetchIntervalInBackground stays false).
 */
const INBOX_POLLING = {
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
} as const;

export function useCases(params: CaseListParams, enabled = true) {
  return useQuery({
    queryKey: pqrsfKeys.list(params),
    queryFn: () => listCases(params),
    enabled,
    // Keeps the rows on screen while the next page or filter loads, instead
    // of flashing back to the skeleton on every keystroke.
    placeholderData: keepPreviousData,
    ...INBOX_POLLING,
  });
}

export function useSummary(filters: CaseFilters, enabled = true) {
  return useQuery({
    queryKey: pqrsfKeys.summary(filters),
    queryFn: () => getSummary(filters),
    enabled,
    ...INBOX_POLLING,
  });
}

/**
 * The case and its timeline poll like the inbox: an answer by email shows up
 * (the «Novedad» badge and the new entry) without reloading, while the tab is
 * visible and when it comes back into focus.
 */
export function useCaseDetail(id: string) {
  return useQuery({
    queryKey: pqrsfKeys.detail(id),
    queryFn: () => getCase(id),
    // A 403 or 404 will not fix itself on a second try.
    retry: false,
    ...INBOX_POLLING,
  });
}

/** Unread count for the sidebar badge and the list; only managers ask. */
export function useFeedbackSummary(enabled = true) {
  return useQuery({
    queryKey: pqrsfKeys.feedbackSummary(),
    queryFn: getFeedbackSummary,
    enabled,
    retry: false,
    ...INBOX_POLLING,
  });
}

export function useFeedbackList(params: FeedbackListParams) {
  return useQuery({
    queryKey: pqrsfKeys.feedbackList(params),
    queryFn: () => listFeedback(params),
    placeholderData: keepPreviousData,
    ...INBOX_POLLING,
  });
}

/** The API marks it read on this very request, so the list and the badge catch up. */
export function useFeedbackDetail(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: pqrsfKeys.feedbackDetail(id),
    queryFn: async () => {
      const detail = await getFeedback(id);
      void queryClient.invalidateQueries({ queryKey: pqrsfKeys.feedbackLists() });
      void queryClient.invalidateQueries({ queryKey: pqrsfKeys.feedbackSummary() });
      return detail;
    },
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

/** People to copy on an email: open to whoever sees PQRSF, unlike the assignees. */
export function usePeople(q: string, enabled: boolean) {
  return useQuery({
    queryKey: pqrsfKeys.people(q),
    queryFn: () => searchPeople(q),
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

/**
 * Working a case (a comment, an email to the client or a supplier) moves a
 * Recibida or Leída case to En curso on the API (API #55). The response of those
 * calls is the new timeline entry, not the case, so the case is read again for
 * the status chip, and the inbox for its row and counters.
 */
function refreshCase(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: pqrsfKeys.detail(id), exact: true });
  void queryClient.invalidateQueries({ queryKey: pqrsfKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: pqrsfKeys.summaries() });
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
  return useCaseMutation(id, (input: StatusChangeInput) => changeStatus(id, input));
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
      // Only the assignee's first read or clearing the «Novedad» mark changes
      // the case; skip the refetch otherwise. A missing `news_at` (an API that
      // does not send it) counts as none.
      if (
        current &&
        current.case.first_read_at === updated.first_read_at &&
        current.case.status.id === updated.status.id &&
        (current.case.news_at ?? null) === (updated.news_at ?? null)
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
    mutationFn: (input: CommentInput) => addComment(id, input),
    onSuccess: (event) => {
      queryClient.setQueryData<CaseDetail>(pqrsfKeys.detail(id), (current) =>
        current ? { ...current, events: [...current.events, event] } : current
      );
      queryClient.invalidateQueries({ queryKey: [...pqrsfKeys.detail(id), "files"] });
      queryClient.invalidateQueries({ queryKey: pqrsfKeys.clientReplies(id) });
      refreshCase(queryClient, id);
    },
  });
}

/** Sending is queued on the API, so it is polled until nothing is pending. */
export function useClientReplies(id: string) {
  return useQuery({
    queryKey: pqrsfKeys.clientReplies(id),
    queryFn: () => getClientReplies(id),
    refetchInterval: (query) =>
      query.state.data?.some((reply) => reply.status === "pending") ? 5000 : false,
  });
}

export function useRetryClientReply(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => retryClientReply(id, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pqrsfKeys.clientReplies(id) }),
  });
}

const omKeys = {
  list: (id: string) => [...pqrsfKeys.detail(id), "oms"] as const,
  templates: () => [...pqrsfKeys.all, "om-templates"] as const,
  settings: () => [...pqrsfKeys.all, "om-settings"] as const,
};

export function useCaseOms(id: string, enabled = true) {
  return useQuery({ queryKey: omKeys.list(id), queryFn: () => listOms(id), enabled });
}

/** Filling the OM is work on the case: it may move it to En curso and adds a timeline entry. */
function useOmMutation<TInput, TResult>(id: string, mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: omKeys.list(id) });
      refreshCase(queryClient, id);
    },
  });
}

export function useGenerateOm(id: string) {
  return useOmMutation(id, (input: OmInput) => generateOm(id, input));
}

export function useUploadEditedOm(id: string) {
  return useOmMutation(id, ({ omId, file }: { omId: string; file: File }) =>
    uploadEditedOm(id, omId, file)
  );
}

export function useRetryOmPdf(id: string) {
  return useOmMutation(id, (omId: string) => retryOmPdf(id, omId));
}

export function useOmTemplates() {
  return useQuery({ queryKey: omKeys.templates(), queryFn: listOmTemplates });
}

export function useUploadOmTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, versionLabel }: { file: File; versionLabel: string }) =>
      uploadOmTemplate(file, versionLabel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: omKeys.templates() }),
  });
}

export function useOmSettings() {
  return useQuery({ queryKey: omKeys.settings(), queryFn: getOmSettings });
}

export function useSetOmNextNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setOmNextNumber,
    onSuccess: (saved) => queryClient.setQueryData(omKeys.settings(), saved),
  });
}

export function usePqrsfSites() {
  return useQuery({ queryKey: [...pqrsfKeys.all, "sites-admin"] as const, queryFn: listPqrsfSites });
}

export function useUpdatePqrsfSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Pick<PqrsfSiteAdmin, "city" | "address" | "om_code">> }) =>
      updatePqrsfSite(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...pqrsfKeys.all, "sites-admin"] });
      queryClient.invalidateQueries({ queryKey: pqrsfKeys.catalogs() });
    },
  });
}

/** Asked for only when the popover opens, never with the case. */
export function useCaseOpenings(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...pqrsfKeys.detail(id), "openings"] as const,
    queryFn: () => getCaseOpenings(id),
    enabled,
    // Someone may have opened the case since the last time: look again each time it opens.
    staleTime: 0,
  });
}

/**
 * The email as the client would get it. It is a POST on the API but changes
 * nothing, so it reads as a query; the same checks as the send run on it, so a
 * 409 or 422 shows up here before anyone confirms.
 */
export function useForwardPreview(id: string, eventId: string, note: string) {
  return useQuery({
    queryKey: [...pqrsfKeys.detail(id), "forward-preview", eventId, note] as const,
    queryFn: () => previewForward(id, eventId, note),
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useForwardToCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, note }: { eventId: string; note: string }) =>
      forwardToCustomer(id, eventId, note),
    onSuccess: () => {
      // The original email now carries who sent it and when, and the timeline a new entry.
      queryClient.invalidateQueries({ queryKey: pqrsfKeys.activities() });
      refreshCase(queryClient, id);
    },
  });
}

export function useSendSupplierMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierMessageInput) => sendSupplierMessage(id, input),
    onSuccess: (result) => {
      // The response is the new timeline entry (with its files and emails on top).
      queryClient.setQueryData<CaseDetail>(pqrsfKeys.detail(id), (current) =>
        current ? { ...current, events: [...current.events, result] } : current
      );
      queryClient.invalidateQueries({ queryKey: [...pqrsfKeys.detail(id), "files"] });
      queryClient.invalidateQueries({ queryKey: pqrsfKeys.supplierEmails(id) });
      queryClient.invalidateQueries({ queryKey: [...pqrsfKeys.all, "supplier-contacts"] });
      // An improvement opportunity sent with it turns «sent» and the case gets its mark.
      queryClient.invalidateQueries({ queryKey: omKeys.list(id) });
      refreshCase(queryClient, id);
    },
  });
}

/** Like the client replies: queued on the API, polled while any is pending. */
export function useSupplierEmails(id: string) {
  return useQuery({
    queryKey: pqrsfKeys.supplierEmails(id),
    queryFn: () => getSupplierEmails(id),
    refetchInterval: (query) =>
      query.state.data?.some((email) => email.status === "pending") ? 5000 : false,
  });
}

export function useRetrySupplierEmail(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => retrySupplierEmail(id, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pqrsfKeys.supplierEmails(id) }),
  });
}

export function useSupplierContacts(supplierCode: string | null, q: string) {
  return useQuery({
    queryKey: [...pqrsfKeys.all, "supplier-contacts", supplierCode, q] as const,
    queryFn: () => getSupplierContacts(supplierCode, q),
    staleTime: 60_000,
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

export const useUpdateRequestType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRequestType>[1] }) =>
      updateRequestType(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.catalogs() }),
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.formTypes() }),
      ]),
  });
};

/** All five types, suggestions and compliments included (see listRequestTypes). */
export function useFormTypes() {
  return useQuery({
    queryKey: pqrsfKeys.formTypes(),
    queryFn: listRequestTypes,
    staleTime: 5 * 60_000,
  });
}
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
/** Subjects with their causes, inactive ones included: only managers ask for them. */
export function useSubjects() {
  return useQuery({
    queryKey: pqrsfKeys.subjects(),
    queryFn: listSubjects,
    staleTime: 5 * 60_000,
  });
}

function useSubjectMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pqrsfKeys.subjects() }),
  });
}

export const useCreateSubject = () => useSubjectMutation(createSubject);
export const useUpdateSubject = () =>
  useSubjectMutation(({ id, input }: { id: string; input: SubjectUpdate }) => updateSubject(id, input));
export const useCreateCause = () =>
  useSubjectMutation(({ subjectId, input }: { subjectId: string; input: CauseInput }) =>
    createCause(subjectId, input)
  );
export const useUpdateCause = () =>
  useSubjectMutation(({ id, input }: { id: string; input: CauseUpdate }) => updateCause(id, input));

export const useCreateDocumentType = () => useCatalogMutation(createDocumentType);
export const useUpdateDocumentType = () =>
  useCatalogMutation(
    ({ id, input }: { id: string; input: Parameters<typeof updateDocumentType>[1] }) =>
      updateDocumentType(id, input)
  );

// Files that came with the case's emails. They sit under the detail key, so
// refreshing the case refreshes them too.
export function useCaseFiles(caseId: string) {
  return useQuery({
    queryKey: [...pqrsfKeys.detail(caseId), "files"] as const,
    queryFn: () => listCaseFiles(caseId),
    staleTime: 30_000,
    // The attachments of an email that just arrived come with its entry.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** The organization timers (end-of-day summary, overdue reminder). */
export function useNotificationSettings() {
  return useQuery({
    queryKey: pqrsfKeys.notificationSettings(),
    queryFn: getNotificationSettings,
    retry: false,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (saved) => queryClient.setQueryData(pqrsfKeys.notificationSettings(), saved),
  });
}