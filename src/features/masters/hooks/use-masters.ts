"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { getMaster, listMasterRecords, listMasters } from "../services/masters.service";
import type { MasterRecordParams } from "../types/master.types";

export const masterKeys = {
  all: ["masters"] as const,
  list: (area?: string) => [...masterKeys.all, "list", area ?? null] as const,
  detail: (slug: string) => [...masterKeys.all, "detail", slug] as const,
  records: (params: MasterRecordParams) => [...masterKeys.all, "records", params] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422].includes(error.status)) && count < 1;

/** Without `area`, every master the person may read (all of them for an admin). */
export function useMasters(area?: string, enabled = true) {
  return useQuery({
    queryKey: masterKeys.list(area),
    queryFn: () => listMasters(area),
    enabled,
    retry: retryTransient,
  });
}

export function useMaster(slug: string | undefined) {
  return useQuery({
    queryKey: masterKeys.detail(slug ?? ""),
    queryFn: () => getMaster(slug!),
    enabled: Boolean(slug),
    retry: retryTransient,
  });
}

export function useMasterRecords(params: MasterRecordParams) {
  return useQuery({
    queryKey: masterKeys.records(params),
    queryFn: () => listMasterRecords(params),
    enabled: Boolean(params.slug),
    retry: retryTransient,
    // Keeps the page on screen while the next one loads, but never shows one
    // master's records under another's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2]?.slug === params.slug
        ? keepPreviousData(previous)
        : undefined,
  });
}
