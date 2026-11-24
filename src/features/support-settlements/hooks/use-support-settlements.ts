"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  closeSettlement,
  getSettlementBreakdown,
  getSettlementPermissions,
  getSettlementReferences,
  getSettlementSummary,
  listSettlementLines,
  listSettlementPeriods,
  recalculateSettlement,
  reopenSettlement,
} from "../services/support-settlements.service";
import type { BreakdownBy, LineParams, Period } from "../types/support-settlements.types";

export const settlementKeys = {
  all: ["support-settlements"] as const,
  permissions: () => [...settlementKeys.all, "permissions"] as const,
  periods: () => [...settlementKeys.all, "periods"] as const,
  month: (period: Period) => [...settlementKeys.all, "month", period] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useSettlementPermissions() {
  return useQuery({
    queryKey: settlementKeys.permissions(),
    queryFn: getSettlementPermissions,
    retry: retryTransient,
    staleTime: 5 * 60_000,
  });
}

export function useSettlementPeriods(enabled: boolean) {
  return useQuery({
    queryKey: settlementKeys.periods(),
    queryFn: listSettlementPeriods,
    enabled,
    retry: retryTransient,
  });
}

/** Only for a month the periods list says was calculated: otherwise the API answers 404. */
export function useSettlementSummary(period: Period | null) {
  return useQuery({
    queryKey: [...settlementKeys.month(period ?? ""), "summary"] as const,
    queryFn: () => getSettlementSummary(period!),
    enabled: period !== null,
    retry: retryTransient,
  });
}

export function useSettlementReferences(period: Period, supplierCode: string | null) {
  return useQuery({
    queryKey: [...settlementKeys.month(period), "references", supplierCode] as const,
    queryFn: () => getSettlementReferences(period, supplierCode),
    retry: retryTransient,
  });
}

export function useSettlementLines(period: Period, params: LineParams, enabled = true) {
  return useQuery({
    queryKey: [...settlementKeys.month(period), "lines", params] as const,
    queryFn: () => listSettlementLines(period, params),
    enabled,
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useSettlementBreakdown(period: Period, by: BreakdownBy, supplierCode: string | null) {
  return useQuery({
    queryKey: [...settlementKeys.month(period), "breakdown", by, supplierCode] as const,
    queryFn: () => getSettlementBreakdown(period, by, supplierCode),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export type SettlementAction = "recalculate" | "close" | "reopen";

const ACTIONS = { recalculate: recalculateSettlement, close: closeSettlement, reopen: reopenSettlement };

/** Recalculate, close or reopen a month; every read of the module is refreshed after. */
export function useSettlementAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ action, period }: { action: SettlementAction; period: Period }) => ACTIONS[action](period),
    // Also after a failure: a 504 from the proxy can hide a calculation that finished.
    onSettled: () => client.invalidateQueries({ queryKey: settlementKeys.all }),
  });
}
