"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPlan,
  createPlanFromCase,
  deleteEvidence,
  deletePlan,
  getCatalog,
  getIndicators,
  getPermissions,
  getPlan,
  listPlans,
  markDone,
  openNextAttempt,
  rateActivity,
  replaceActivities,
  replaceCauses,
  replaceCorrections,
  updatePlan,
  uploadEvidence,
} from "../services/action-plans.service";
import type {
  ActivityInput,
  CauseInput,
  CorrectionInput,
  Effective,
  PlanDetail,
  PlanFilters,
  PlanHeaderInput,
} from "../types/action-plans.types";

export const planKeys = {
  all: ["action-plans"] as const,
  permissions: () => [...planKeys.all, "permissions"] as const,
  catalog: () => [...planKeys.all, "catalog"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  list: (filters: PlanFilters, page: number, size: number) =>
    [...planKeys.lists(), filters, page, size] as const,
  indicators: (filters: PlanFilters) => [...planKeys.all, "indicators", filters] as const,
  detail: (id: string) => [...planKeys.all, "detail", id] as const,
};

export function usePlanPermissions() {
  return useQuery({ queryKey: planKeys.permissions(), queryFn: getPermissions, staleTime: 5 * 60_000 });
}

export function usePlanCatalog() {
  return useQuery({ queryKey: planKeys.catalog(), queryFn: getCatalog, staleTime: 5 * 60_000 });
}

export function usePlans(filters: PlanFilters, page: number, size: number, enabled = true) {
  return useQuery({
    queryKey: planKeys.list(filters, page, size),
    queryFn: () => listPlans(filters, page, size),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useIndicators(filters: PlanFilters) {
  return useQuery({
    queryKey: planKeys.indicators(filters),
    queryFn: () => getIndicators(filters),
    placeholderData: keepPreviousData,
  });
}

export function usePlan(id: string) {
  return useQuery({ queryKey: planKeys.detail(id), queryFn: () => getPlan(id) });
}

/** Every write answers with the whole action: it replaces the cached one, and the lists go stale. */
function usePlanMutation<TInput>(id: string, mutationFn: (input: TInput) => Promise<PlanDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(planKeys.detail(id), detail);
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...planKeys.all, "indicators"] });
    },
  });
}

export function useUpdatePlan(id: string) {
  return usePlanMutation(id, (input: PlanHeaderInput) => updatePlan(id, input));
}

export function useReplaceCorrections(id: string) {
  return usePlanMutation(id, (rows: CorrectionInput[]) => replaceCorrections(id, rows));
}

export function useReplaceCauses(id: string) {
  return usePlanMutation(id, (rows: CauseInput[]) => replaceCauses(id, rows));
}

export function useReplaceActivities(id: string) {
  return usePlanMutation(id, (rows: ActivityInput[]) => replaceActivities(id, rows));
}

export function useMarkDone(id: string) {
  return usePlanMutation(id, ({ rowId, done, note }: { rowId: string; done: boolean; note?: string | null }) =>
    markDone(id, rowId, { done, evidence_note: note ?? null })
  );
}

export function useRateActivity(id: string) {
  return usePlanMutation(
    id,
    ({ activityId, effective, note }: { activityId: string; effective: Effective; note?: string | null }) =>
      rateActivity(id, activityId, { effective, note: note ?? null })
  );
}

/** Creating an action (or an attempt) answers with the new action, not the one it came from. */
function useCreateMutation<TInput>(mutationFn: (input: TInput) => Promise<PlanDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(planKeys.detail(detail.plan.id), detail);
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...planKeys.all, "indicators"] });
    },
  });
}

export function useCreatePlan() {
  return useCreateMutation((input: PlanHeaderInput) => createPlan(input));
}

export function useCreatePlanFromCase() {
  return useCreateMutation((caseId: string) => createPlanFromCase(caseId));
}

export function useNextAttempt(id: string) {
  return useCreateMutation(() => openNextAttempt(id));
}

export function useDeletePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deletePlan(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...planKeys.all, "indicators"] });
    },
  });
}

export function useUploadEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, rowId }: { files: File[]; rowId?: string }) => uploadEvidence(id, files, rowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.detail(id) }),
  });
}

export function useDeleteEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteEvidence(id, fileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.detail(id) }),
  });
}
