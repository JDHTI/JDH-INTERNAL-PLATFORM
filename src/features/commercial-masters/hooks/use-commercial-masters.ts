"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  downloadMarginTemplate,
  getPriceIncreaseAnalysis,
  getProduct,
  listCommercialMaster,
  listPriceIncreases,
  setPriceIncreaseDate,
  setProductMargins,
  updateProduct,
  uploadMargins,
  uploadPriceIncreases,
} from "../services/commercial-masters.service";
import type { CommercialMasterParams, ProductMarginsInput, ProductPatch } from "../types/commercial-master.types";
import type { AnalysisParams, PriceIncreaseParams } from "../types/price-increases.types";

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

/** One reference's whole history, for the analysis detail (24 rows at most in the real workbook). */
export function useReferenceIncreases(sku: string | null) {
  return useQuery({
    queryKey: increaseKeys.list({ q: "", status: "", pending: false, sku: sku ?? "", page: 1, size: 100 }),
    queryFn: () => listPriceIncreases({ q: "", status: "", pending: false, sku: sku ?? "", page: 1, size: 100 }),
    enabled: sku !== null,
    retry: retryTransient,
  });
}

/** Simulating writes nothing; applying refreshes the history. */
export function useUploadPriceIncreases() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, apply }: { file: File; apply: boolean }) => uploadPriceIncreases(file, apply),
    onSuccess: (report) => {
      if (report.applied) return client.invalidateQueries({ queryKey: increaseKeys.all });
    },
  });
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
