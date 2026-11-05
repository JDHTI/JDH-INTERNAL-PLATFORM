"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  downloadMarginTemplate,
  getProduct,
  listCommercialMaster,
  setProductMargins,
  updateProduct,
  uploadMargins,
} from "../services/commercial-masters.service";
import type { CommercialMasterParams, ProductMarginsInput, ProductPatch } from "../types/commercial-master.types";

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

export function useDownloadMarginTemplate() {
  return useMutation({ mutationFn: (withData: boolean) => downloadMarginTemplate(withData) });
}
