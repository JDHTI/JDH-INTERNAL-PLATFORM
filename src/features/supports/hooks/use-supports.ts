"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  createSpecialCase,
  getSupport,
  getSupportCatalogs,
  listFilterFields,
  listSpecialCases,
  listSupportConflicts,
  searchSupports,
  updateSpecialCase,
  updateSupport,
  voidSupport,
} from "../services/supports.service";
import type {
  SpecialCaseInput,
  SpecialCaseParams,
  SpecialCasePatch,
  SupportPatch,
  SupportSearchBody,
} from "../types/support.types";

export const supportKeys = {
  all: ["supplier-supports"] as const,
  search: (body: SupportSearchBody) => [...supportKeys.all, "search", body] as const,
  fields: () => [...supportKeys.all, "fields"] as const,
  catalogs: () => [...supportKeys.all, "catalogs"] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
  conflicts: (id: string) => [...supportKeys.all, "conflicts", id] as const,
  cases: (params: SpecialCaseParams) => ["supplier-special-cases", params] as const,
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
