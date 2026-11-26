"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  createReason,
  getBreakdown,
  getClassStatus,
  getDashboard,
  getPareto,
  getServiceLevelOptions,
  getServiceLevelPermissions,
  listLines,
  listReasons,
  recomputeClasses,
  setLineReason,
  setLinesReason,
  updateReason,
} from "../services/service-level.service";
import type { BreakdownParams, LineParams, ParetoKind, ServiceLevelFilters, ServiceLevelReason } from "../types/service-level.types";

const keys = {
  all: ["service-level"] as const,
  permissions: () => [...keys.all, "permissions"] as const,
  reasons: () => [...keys.all, "reasons"] as const,
  data: () => [...keys.all, "data"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

export function useServiceLevelPermissions() {
  return useQuery({
    queryKey: keys.permissions(),
    queryFn: getServiceLevelPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useServiceLevelOptions(since: string, until: string) {
  return useQuery({
    queryKey: [...keys.data(), "options", since, until] as const,
    queryFn: () => getServiceLevelOptions(since, until),
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

/** The reason picker's second line: who answers for it. Module level, so the selection is kept between renders. */
const withResponsible = (reasons: ServiceLevelReason[]) => reasons.map((reason) => ({ ...reason, detail: reason.responsible }));

/** Every reason, switched-off ones included: the picker shows a line's old reason, the catalog lists them all. */
export function useServiceLevelReasons() {
  return useQuery({
    queryKey: keys.reasons(),
    queryFn: () => listReasons(true),
    select: withResponsible,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useLines(params: LineParams) {
  return useQuery({
    queryKey: [...keys.data(), "lines", params] as const,
    queryFn: () => listLines(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/** A reason moves the KPIs by responsible and the breakdowns: everything read again. */
function useInvalidateData() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: keys.data() });
}

export function useSetLineReason() {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ lineKey, reasonId, note }: { lineKey: string; reasonId: string | null; note: string | null }) =>
      setLineReason(lineKey, reasonId, note),
    onSuccess: invalidate,
  });
}

export function useSetLinesReason() {
  const invalidate = useInvalidateData();
  return useMutation({
    mutationFn: ({ lineKeys, reasonId, note }: { lineKeys: string[]; reasonId: string | null; note: string | null }) =>
      setLinesReason(lineKeys, reasonId, note),
    onSuccess: invalidate,
  });
}

export function useDashboard(filters: ServiceLevelFilters) {
  return useQuery({
    queryKey: [...keys.data(), "dashboard", filters] as const,
    queryFn: () => getDashboard(filters),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useBreakdown(params: BreakdownParams) {
  return useQuery({
    queryKey: [...keys.data(), "breakdown", params] as const,
    queryFn: () => getBreakdown(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function usePareto(kind: ParetoKind, co: string) {
  return useQuery({
    queryKey: [...keys.data(), "pareto", kind, co] as const,
    queryFn: () => getPareto(kind, co),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useClassStatus() {
  return useQuery({
    queryKey: [...keys.data(), "classes"] as const,
    queryFn: getClassStatus,
    retry: retryTransient,
  });
}

/** New classes change the class filters' results, the Pareto and the board. */
export function useRecomputeClasses() {
  const invalidate = useInvalidateData();
  return useMutation({ mutationFn: recomputeClasses, onSuccess: invalidate });
}

/** A renamed reason shows in the lines too, so both the catalog and the data read again. */
function useReasonMutation<T>(mutationFn: (input: T) => Promise<ServiceLevelReason>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.all, predicate: (query) => query.queryKey[1] !== "permissions" }),
  });
}

export function useCreateReason() {
  return useReasonMutation(({ name, responsible }: { name: string; responsible: string }) => createReason(name, responsible));
}

export function useUpdateReason() {
  return useReasonMutation(({ id, patch }: { id: string; patch: { name?: string; responsible?: string; is_active?: boolean } }) =>
    updateReason(id, patch)
  );
}
