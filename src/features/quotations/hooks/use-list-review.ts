"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  cancelLiquorUpdate,
  createLiquorUpdate,
  getLiquorOverview,
  listLiquorUpdates,
  markLiquorUploaded,
} from "../services/liquor.service";
import {
  createLoad,
  getLineInsight,
  getStockTotals,
  listLoads,
  listStaging,
  reviewLines,
  setLineNote,
} from "../services/quotations.service";
import type { LiquorChangeInput, LiquorUpdate } from "../types/liquor.types";
import type { ListKind, Quotation, ReviewStatus } from "../types/quotations.types";
import { quotationKeys } from "./use-quotations";

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429, 503].includes(error.status)) && count < 1;

export const listKeys = {
  staging: (kind: ListKind) => [...quotationKeys.all, "staging", kind] as const,
  loads: (kind: ListKind) => [...quotationKeys.all, "loads", kind] as const,
  insight: (id: string, sku: string) => [...quotationKeys.all, "insight", id, sku] as const,
  stock: (id: string) => [...quotationKeys.all, "stock", id] as const,
  liquor: () => [...quotationKeys.all, "liquor"] as const,
  liquorUpdates: () => [...quotationKeys.all, "liquor-updates"] as const,
};

/** A review or a note answers with the whole update: it goes to the cache, and the staging is read again. */
function useStore() {
  const client = useQueryClient();
  return (quotation: Quotation) => {
    client.setQueryData(quotationKeys.detail(quotation.id), quotation);
    void client.invalidateQueries({ queryKey: [...quotationKeys.all, "staging"] });
  };
}

export function useReviewLines(id: string) {
  const store = useStore();
  return useMutation({
    mutationFn: ({ version, skus, status }: { version: number; skus: string[]; status: ReviewStatus }) =>
      reviewLines(id, version, skus, status),
    onSuccess: store,
  });
}

export function useLineNote(id: string) {
  const store = useStore();
  return useMutation({
    mutationFn: ({ version, sku, note }: { version: number; sku: string; note: string }) => setLineNote(id, version, sku, note),
    onSuccess: store,
  });
}

/** Read when the detail opens; the stock is the morning's photo, so it holds for a while. */
export function useLineInsight(id: string, sku: string | null) {
  return useQuery({
    queryKey: listKeys.insight(id, sku ?? ""),
    queryFn: () => getLineInsight(id, sku ?? ""),
    enabled: sku !== null,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useStockTotals(id: string, enabled: boolean) {
  return useQuery({
    queryKey: listKeys.stock(id),
    queryFn: () => getStockTotals(id),
    enabled,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useStaging(kind: ListKind) {
  return useQuery({ queryKey: listKeys.staging(kind), queryFn: () => listStaging(kind), retry: retryTransient });
}

export function useLoads(kind: ListKind) {
  return useQuery({ queryKey: listKeys.loads(kind), queryFn: () => listLoads(kind), retry: retryTransient });
}

/** A load changes the staging, the loads and the updates whose items it took. */
export function useCreateLoad(kind: ListKind) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ priceListId, lineIds, activationDate }: { priceListId: string; lineIds: string[]; activationDate: string }) =>
      createLoad(kind, priceListId, lineIds, activationDate),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKeys.staging(kind) });
      void client.invalidateQueries({ queryKey: listKeys.loads(kind) });
      void client.invalidateQueries({ queryKey: [...quotationKeys.all, "detail"] });
    },
  });
}

export function useLiquorOverview() {
  return useQuery({ queryKey: listKeys.liquor(), queryFn: getLiquorOverview, staleTime: 5 * 60_000, retry: retryTransient });
}

export function useLiquorUpdates() {
  return useQuery({ queryKey: listKeys.liquorUpdates(), queryFn: listLiquorUpdates, retry: retryTransient });
}

function useStoreLiquor() {
  const client = useQueryClient();
  return (item: LiquorUpdate) => {
    client.setQueryData<LiquorUpdate[]>(listKeys.liquorUpdates(), (current) =>
      current ? [item, ...current.filter((other) => other.id !== item.id)] : [item]
    );
    void client.invalidateQueries({ queryKey: listKeys.liquorUpdates() });
    // Once loaded, the margin master's values change on the screen.
    if (item.status === "cargada") void client.invalidateQueries({ queryKey: listKeys.liquor() });
  };
}

export function useCreateLiquorUpdate() {
  const store = useStoreLiquor();
  return useMutation({
    mutationFn: ({ changes, note, activationDate }: { changes: LiquorChangeInput[]; note: string; activationDate: string }) =>
      createLiquorUpdate(changes, note, activationDate),
    onSuccess: store,
  });
}

/** Cancel a change not loaded, or mark it loaded (the margin master takes the values). */
export function useLiquorReview() {
  const store = useStoreLiquor();
  return useMutation({
    mutationFn: (action: { kind: "cancel"; item: LiquorUpdate; note: string } | { kind: "uploaded"; item: LiquorUpdate }) =>
      action.kind === "cancel"
        ? cancelLiquorUpdate(action.item.id, action.item.version, action.note)
        : markLiquorUploaded(action.item.id, action.item.version),
    onSuccess: store,
  });
}
