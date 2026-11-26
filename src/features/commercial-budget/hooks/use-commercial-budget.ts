"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  closeBudgetPeriod,
  getBudgetBoard,
  getBudgetPermissions,
  getBudgetSync,
  getVendorMasterStatus,
  listBudgetChanges,
  listBudgetPeriods,
  listVendorMasterUploads,
  reopenBudgetPeriod,
  startBudgetSync,
  updateBudgets,
  uploadBudget,
  uploadVendorMaster,
} from "../services/commercial-budget.service";
import type { BudgetFilters, BudgetItem, Period, SyncRun } from "../types/commercial-budget.types";

export const budgetKeys = {
  all: ["commercial-budget"] as const,
  permissions: () => [...budgetKeys.all, "permissions"] as const,
  periods: () => [...budgetKeys.all, "periods"] as const,
  month: (period: Period) => [...budgetKeys.all, "month", period] as const,
  sync: () => [...budgetKeys.all, "sync"] as const,
};

export const vendorMasterKeys = {
  all: ["vendor-master"] as const,
  status: () => [...vendorMasterKeys.all, "status"] as const,
  uploads: () => [...vendorMasterKeys.all, "uploads"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [400, 401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useBudgetPermissions() {
  return useQuery({ queryKey: budgetKeys.permissions(), queryFn: getBudgetPermissions, retry: retryTransient, staleTime: 5 * 60_000 });
}

export function useBudgetPeriods(enabled: boolean) {
  return useQuery({ queryKey: budgetKeys.periods(), queryFn: listBudgetPeriods, enabled, retry: retryTransient });
}

/** The month with its filters; the previous answer stays on screen while a filter loads. */
export function useBudgetBoard(period: Period, filters: BudgetFilters) {
  return useQuery({
    queryKey: [...budgetKeys.month(period), "board", filters] as const,
    queryFn: () => getBudgetBoard(period, filters),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useBudgetChanges(period: Period, salespersonCode: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...budgetKeys.month(period), "changes", salespersonCode] as const,
    queryFn: () => listBudgetChanges(period, salespersonCode),
    enabled,
    retry: retryTransient,
  });
}

/**
 * One field of one rep. Whatever the answer, the month is read again: a saved value brings the
 * new version and totals, a 409 (month closed, budget changed by someone else) the current ones.
 */
export function useUpdateBudgets(period: Period) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ items, note }: { items: BudgetItem[]; note?: string }) => updateBudgets(period, items, note),
    onSettled: () => client.invalidateQueries({ queryKey: budgetKeys.month(period) }),
  });
}

export function useUploadBudget(period: Period) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, apply, note }: { file: File; apply: boolean; note: string }) => uploadBudget(period, file, apply, note),
    onSuccess: (report) => {
      if (report.applied) void client.invalidateQueries({ queryKey: budgetKeys.month(period) });
    },
  });
}

export type PeriodAction = "close" | "reopen";

export function usePeriodAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ action, period }: { action: PeriodAction; period: Period }) =>
      action === "close" ? closeBudgetPeriod(period) : reopenBudgetPeriod(period),
    onSettled: () => client.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}

export const isSyncing = (status: SyncRun["status"] | undefined) => status === "queued" || status === "running";

/**
 * The latest sync, read again every 5 seconds while it is queued or running. When one ends
 * (started here or by itself), the months and their figures are read again: the copy can
 * bring any of them.
 */
export function useBudgetSync() {
  const client = useQueryClient();
  const [wasSyncing, setWasSyncing] = useState(false);
  const query = useQuery({
    queryKey: budgetKeys.sync(),
    queryFn: getBudgetSync,
    retry: retryTransient,
    refetchInterval: (current) => (isSyncing(current.state.data?.status) ? 5000 : false),
  });
  const now = isSyncing(query.data?.status);
  if (now !== wasSyncing) {
    setWasSyncing(now);
    if (!now) {
      void client.invalidateQueries({ queryKey: [...budgetKeys.all, "month"] });
      void client.invalidateQueries({ queryKey: budgetKeys.periods() });
    }
  }
  return query;
}

/** Queues a sync; its answer seeds the latest run, so the polling starts at once. */
export function useStartSync() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: startBudgetSync,
    onSuccess: (run) => client.setQueryData(budgetKeys.sync(), run),
  });
}

export function useVendorMasterStatus() {
  return useQuery({ queryKey: vendorMasterKeys.status(), queryFn: getVendorMasterStatus, retry: retryTransient, staleTime: 5 * 60_000 });
}

export function useVendorMasterUploads(enabled: boolean) {
  return useQuery({ queryKey: vendorMasterKeys.uploads(), queryFn: () => listVendorMasterUploads(20), enabled, retry: retryTransient });
}

/** The history is read again whatever happens: a rejected file is recorded too. */
export function useUploadVendorMaster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: uploadVendorMaster,
    onSettled: () => client.invalidateQueries({ queryKey: vendorMasterKeys.uploads() }),
  });
}
