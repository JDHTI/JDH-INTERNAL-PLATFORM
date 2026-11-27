"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  attachCreditNote,
  detachCreditNote,
  getCostPermissions,
  getEntryOptions,
  getNoveltyOptions,
  getNovelty,
  listCostReasons,
  listEntries,
  listNovelties,
  setEntryReason,
  setNoveltyReason,
} from "../services/costs.service";
import type { CostReason, CreditNoteInput, EntryParams, NoveltyParams } from "../types/costs.types";

export const costKeys = {
  all: ["costs"] as const,
  permissions: () => [...costKeys.all, "permissions"] as const,
  reasons: () => [...costKeys.all, "reasons"] as const,
  entries: (params?: EntryParams) => (params ? ([...costKeys.all, "entries", params] as const) : ([...costKeys.all, "entries"] as const)),
  novelties: (params?: NoveltyParams) =>
    params ? ([...costKeys.all, "novelties", params] as const) : ([...costKeys.all, "novelties"] as const),
  novelty: (id: string) => [...costKeys.all, "novelty", id] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useCostPermissions() {
  return useQuery({
    queryKey: costKeys.permissions(),
    queryFn: getCostPermissions,
    retry: retryTransient,
    staleTime: 5 * 60_000,
  });
}

/** The 26 reasons change only when a manager edits the catalog. */
/** The reason picker's second line: what the reason asks for. Module level, so the selection is kept between renders. */
const withPickerDetail = (reasons: CostReason[]) =>
  reasons.map((reason) => ({ ...reason, detail: reason.requires_credit_note ? "Pide nota crédito" : null }));

export function useCostReasons(enabled = true) {
  return useQuery({
    queryKey: costKeys.reasons(),
    queryFn: listCostReasons,
    select: withPickerDetail,
    retry: retryTransient,
    staleTime: 10 * 60_000,
    enabled,
  });
}

export function useEntries(params: EntryParams, enabled = true) {
  return useQuery({
    queryKey: costKeys.entries(params),
    queryFn: () => listEntries(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * The last day the DWH loaded entries for: the newest line of the API's
 * default period (30 days). Null when that period has none.
 */
export function useLatestEntryDate() {
  return useQuery({
    queryKey: [...costKeys.all, "latest-entry-date"] as const,
    queryFn: async () => {
      const page = await listEntries({
        since: "",
        until: "",
        q: "",
        status: "",
        novelty: false,
        supplier: "",
        co: "",
        warehouse: "",
        reasonId: "",
        sort: "date",
        order: "desc",
        page: 1,
        size: 1,
      });
      return page.items[0]?.entry_date.slice(0, 10) ?? null;
    },
    retry: retryTransient,
    staleTime: 10 * 60_000,
  });
}

/** The period's C.O. and warehouses; they change only when the period does. */
export function useEntryOptions(since: string, until: string, enabled = true) {
  return useQuery({
    queryKey: [...costKeys.all, "entry-options", since, until] as const,
    queryFn: () => getEntryOptions(since, until),
    retry: retryTransient,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The novelties' C.O. and warehouses in the tray's period. */
export function useNoveltyOptions(since: string, until: string) {
  return useQuery({
    queryKey: [...costKeys.all, "novelty-options", since, until] as const,
    queryFn: () => getNoveltyOptions(since, until),
    retry: retryTransient,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useNovelties(params: NoveltyParams) {
  return useQuery({
    queryKey: costKeys.novelties(params),
    queryFn: () => listNovelties(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useNovelty(id: string | null) {
  return useQuery({
    queryKey: costKeys.novelty(id ?? ""),
    queryFn: () => getNovelty(id!),
    enabled: id !== null,
    retry: retryTransient,
  });
}

/** A reason or a credit note moves the line in the analysis, the tray and its detail. */
function useCostMutation<T, R>(mutationFn: (input: T) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: costKeys.entries() }),
        client.invalidateQueries({ queryKey: costKeys.novelties() }),
        client.invalidateQueries({ queryKey: [...costKeys.all, "novelty"] }),
      ]),
  });
}

export function useSetEntryReason() {
  return useCostMutation(({ lineKey, reasonId }: { lineKey: string; reasonId: string | null }) =>
    setEntryReason(lineKey, reasonId)
  );
}

export function useSetNoveltyReason() {
  return useCostMutation(({ id, reasonId }: { id: string; reasonId: string | null }) => setNoveltyReason(id, reasonId));
}

export function useAttachCreditNote() {
  return useCostMutation(({ id, input }: { id: string; input: CreditNoteInput }) => attachCreditNote(id, input));
}

export function useDetachCreditNote() {
  return useCostMutation((id: string) => detachCreditNote(id));
}
