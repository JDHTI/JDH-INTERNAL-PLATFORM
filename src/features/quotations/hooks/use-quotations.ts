"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  addLines,
  createQuotation,
  deleteQuotation,
  generateQuotation,
  getQuotation,
  getQuotationPermissions,
  getQuotationRules,
  listQuotations,
  refreshQuotation,
  removeLine,
  updateLines,
} from "../services/quotations.service";
import type {
  GenerateOptions,
  LineImport,
  LinePrice,
  Quotation,
  QuotationListParams,
  WindowMonths,
} from "../types/quotations.types";

export const quotationKeys = {
  all: ["quotations"] as const,
  permissions: () => [...quotationKeys.all, "permissions"] as const,
  rules: () => [...quotationKeys.all, "rules"] as const,
  lists: () => [...quotationKeys.all, "list"] as const,
  list: (params: QuotationListParams) => [...quotationKeys.lists(), params] as const,
  detail: (id: string) => [...quotationKeys.all, "detail", id] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429, 503].includes(error.status)) && count < 1;

export function useQuotationPermissions() {
  return useQuery({
    queryKey: quotationKeys.permissions(),
    queryFn: getQuotationPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useQuotationRules() {
  return useQuery({
    queryKey: quotationKeys.rules(),
    queryFn: getQuotationRules,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useQuotations(params: QuotationListParams) {
  return useQuery({
    queryKey: quotationKeys.list(params),
    queryFn: () => listQuotations(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: () => getQuotation(id),
    retry: retryTransient,
  });
}

/**
 * Every write answers with the whole quotation, so the detail cache takes it
 * as is and only the lists (counts, status, updated_at) are refetched.
 */
function useStoreQuotation() {
  const client = useQueryClient();
  return (quotation: Quotation) => {
    client.setQueryData(quotationKeys.detail(quotation.id), quotation);
    void client.invalidateQueries({ queryKey: quotationKeys.lists() });
  };
}

export function useCreateQuotation() {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ customerNit, windowMonths }: { customerNit: string; windowMonths: WindowMonths }) =>
      createQuotation(customerNit, windowMonths),
    onSuccess: store,
  });
}

export function useUpdateLines(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, lines }: { version: number; lines: LinePrice[] }) => updateLines(id, version, lines),
    onSuccess: store,
  });
}

export function useAddLines(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    // The answer is the whole quotation: it goes to the cache as is, with no GET after it.
    mutationFn: ({ version, ...input }: { version: number } & LineImport) => addLines(id, version, input),
    onSuccess: store,
  });
}

export function useRemoveLine(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, sku }: { version: number; sku: string }) => removeLine(id, sku, version),
    onSuccess: store,
  });
}

export function useRefreshQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: (version: number) => refreshQuotation(id, version),
    onSuccess: store,
  });
}

export function useGenerateQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, options }: { version: number; options: GenerateOptions }) =>
      generateQuotation(id, version, options),
    onSuccess: store,
  });
}

/**
 * Only the lists are refreshed: refetching the deleted quotation would answer
 * 404 and swap its page for an error while the caller is leaving it.
 */
export function useDeleteQuotation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuotation(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}
