"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  getSupport,
  getSupportCatalogs,
  listFilterFields,
  listSupportConflicts,
  searchSupports,
} from "../services/supports.service";
import type { SupportSearchBody } from "../types/support.types";

export const supportKeys = {
  all: ["supplier-supports"] as const,
  search: (body: SupportSearchBody) => [...supportKeys.all, "search", body] as const,
  fields: () => [...supportKeys.all, "fields"] as const,
  catalogs: () => [...supportKeys.all, "catalogs"] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
  conflicts: (id: string) => [...supportKeys.all, "conflicts", id] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

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
