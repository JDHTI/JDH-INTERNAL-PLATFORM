"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  confirmSiesaLoad,
  downloadMarginTemplate,
  downloadSiesaLoadFile,
  generateSiesaLoad,
  getPriceIncreaseAnalysis,
  getPriceIncreaseOptions,
  getCommercialPermissions,
  getProduct,
  getProductFilterOptions,
  getSiesaLoad,
  listCommercialMaster,
  listPriceIncreases,
  listSiesaLoads,
  setPriceIncreaseDate,
  setProductMargins,
  updateProduct,
  uploadMargins,
  voidSiesaLoad,
} from "../services/commercial-masters.service";
import type { CommercialMasterParams, ProductMarginsInput, ProductPatch } from "../types/commercial-master.types";
import type {
  AnalysisParams,
  IncreaseScope,
  PriceIncreaseParams,
  SiesaLoadDetail,
  SiesaLoadSelection,
  SiesaLoadStatus,
} from "../types/price-increases.types";

export const commercialMasterKeys = {
  all: ["commercial-masters"] as const,
  list: (params: CommercialMasterParams) => [...commercialMasterKeys.all, params.master, params] as const,
  product: (sku: string) => [...commercialMasterKeys.all, "product", sku] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

export function useCommercialMaster(params: CommercialMasterParams) {
  return useQuery({
    queryKey: commercialMasterKeys.list(params),
    queryFn: () => listCommercialMaster(params),
    retry: retryTransient,
    // Keeps the previous page on screen while the next loads, but never one
    // master's rows under another master's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === params.master ? keepPreviousData(previous) : undefined,
  });
}

/**
 * Whether the products master offers its edits: the API's own rule (`manage` on `maestros` in BI,
 * or admin). Not the supports' `can_manage`, which is another grant. False while it loads or fails.
 */
export function useCanManageProducts(): boolean {
  const query = useQuery({
    queryKey: [...commercialMasterKeys.all, "permissions"] as const,
    queryFn: getCommercialPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
  return query.data?.can_manage === true;
}

/** The options of the products master's supplier and category dropdowns; they change with the nightly sync. */
export function useProductFilterOptions(enabled: boolean) {
  return useQuery({
    queryKey: [...commercialMasterKeys.all, "product-options"] as const,
    queryFn: getProductFilterOptions,
    enabled,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useProduct(sku: string | null) {
  return useQuery({
    queryKey: commercialMasterKeys.product(sku ?? ""),
    queryFn: () => getProduct(sku!),
    enabled: sku !== null,
    retry: retryTransient,
  });
}

/** A product edit changes the row in every cached list and its own detail. */
export function useUpdateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, patch }: { sku: string; patch: ProductPatch }) => updateProduct(sku, patch),
    onSuccess: () => client.invalidateQueries({ queryKey: commercialMasterKeys.all }),
  });
}

export function useSetProductMargins() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, margins }: { sku: string; margins: ProductMarginsInput }) => setProductMargins(sku, margins),
    onSuccess: () => client.invalidateQueries({ queryKey: commercialMasterKeys.all }),
  });
}

/** Simulating changes nothing, so only applying refreshes what is cached. */
export function useUploadMargins() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, apply }: { file: File; apply: boolean }) => uploadMargins(file, apply),
    onSuccess: (report) => {
      if (report.applied) return client.invalidateQueries({ queryKey: commercialMasterKeys.all });
    },
  });
}

const increaseKeys = {
  all: [...commercialMasterKeys.all, "price-increases"] as const,
  list: (params: PriceIncreaseParams) => [...increaseKeys.all, params] as const,
};

export function usePriceIncreases(params: PriceIncreaseParams) {
  return useQuery({
    queryKey: increaseKeys.list(params),
    queryFn: () => listPriceIncreases(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function usePriceIncreaseAnalysis(params: AnalysisParams) {
  return useQuery({
    queryKey: [...increaseKeys.all, "analysis", params] as const,
    queryFn: () => getPriceIncreaseAnalysis(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/** The supplier and month dropdowns; they move only when the history does. */
export function usePriceIncreaseOptions() {
  return useQuery({
    queryKey: [...increaseKeys.all, "options"] as const,
    queryFn: getPriceIncreaseOptions,
    retry: retryTransient,
    staleTime: 5 * 60_000,
  });
}

/** One reference's whole history, for the analysis detail (24 rows at most in the real workbook). */
export function useReferenceIncreases(sku: string | null, scope: IncreaseScope) {
  const params = { q: "", supplier: "", status: "", pending: false, sku: sku ?? "", ...scope, page: 1, size: 100 } as const;
  return useQuery({
    queryKey: increaseKeys.list(params),
    queryFn: () => listPriceIncreases(params),
    enabled: sku !== null,
    retry: retryTransient,
  });
}

const loadKeys = {
  all: [...increaseKeys.all, "siesa-loads"] as const,
  list: (params: object) => [...loadKeys.all, "list", params] as const,
  detail: (id: string) => [...loadKeys.all, "detail", id] as const,
};

/**
 * The review writes nothing; generating puts the increases in an open load
 * (`open_load` in the history) and adds it to the loads.
 */
export function useGenerateSiesaLoad() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ selection, apply }: { selection: SiesaLoadSelection; apply: boolean }) => generateSiesaLoad(selection, apply),
    onSuccess: (result) => {
      if (result.applied) return client.invalidateQueries({ queryKey: increaseKeys.all });
    },
  });
}

export function useSiesaLoads(params: { status: SiesaLoadStatus | ""; page: number; size: number }) {
  return useQuery({
    queryKey: loadKeys.list(params),
    queryFn: () => listSiesaLoads(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useSiesaLoad(id: string | null) {
  return useQuery({
    queryKey: loadKeys.detail(id ?? ""),
    queryFn: () => getSiesaLoad(id!),
    enabled: id !== null,
    retry: retryTransient,
  });
}

export function useDownloadSiesaLoadFile() {
  return useMutation({
    mutationFn: ({ id, number, kind }: { id: string; number: number; kind: "txt" | "xlsx" }) => downloadSiesaLoadFile(id, number, kind),
  });
}

/**
 * Confirming or voiding answers the load; the history and the analysis read
 * again (confirmed increases stop being pending, voided ones leave the load).
 */
function useLoadDecision<T>(mutationFn: (input: T) => Promise<SiesaLoadDetail>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (load) => {
      client.setQueryData(loadKeys.detail(load.id), load);
      return client.invalidateQueries({ queryKey: increaseKeys.all });
    },
  });
}

export function useConfirmSiesaLoad() {
  return useLoadDecision(({ id, loadedOn }: { id: string; loadedOn: string }) => confirmSiesaLoad(id, loadedOn));
}

export function useVoidSiesaLoad() {
  return useLoadDecision((id: string) => voidSiesaLoad(id));
}

export function useSetPriceIncreaseDate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, day }: { id: string; day: string | null }) => setPriceIncreaseDate(id, day),
    onSuccess: () => client.invalidateQueries({ queryKey: increaseKeys.all }),
  });
}

export function useDownloadMarginTemplate() {
  return useMutation({ mutationFn: (withData: boolean) => downloadMarginTemplate(withData) });
}
