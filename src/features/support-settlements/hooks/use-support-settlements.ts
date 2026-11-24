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
import type { BreakdownBy, CostBasis, LineParams, Period, Settlement } from "../types/support-settlements.types";

/** Every read of a month carries its cost basis: the two bases are two settlements. */
export const settlementKeys = {
  all: ["support-settlements"] as const,
  permissions: () => [...settlementKeys.all, "permissions"] as const,
  periods: (basis: CostBasis) => [...settlementKeys.all, "periods", basis] as const,
  month: (period: Period, basis: CostBasis) => [...settlementKeys.all, period, basis] as const,
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

export function useSettlementPeriods(basis: CostBasis) {
  return useQuery({
    queryKey: settlementKeys.periods(basis),
    queryFn: () => listSettlementPeriods(basis),
    retry: retryTransient,
    // The months stay on screen while the other basis loads: same months, other statuses.
    placeholderData: keepPreviousData,
  });
}

/** Only for a month the periods list says was calculated on that basis: otherwise the API answers 404. */
export function useSettlementSummary(period: Period | null, basis: CostBasis) {
  return useQuery({
    queryKey: [...settlementKeys.month(period ?? "", basis), "summary"] as const,
    queryFn: () => getSettlementSummary(period!, basis),
    enabled: period !== null,
    retry: retryTransient,
  });
}

export function useSettlementReferences(period: Period, basis: CostBasis, supplierCode: string | null) {
  return useQuery({
    queryKey: [...settlementKeys.month(period, basis), "references", supplierCode] as const,
    queryFn: () => getSettlementReferences(period, basis, supplierCode),
    retry: retryTransient,
  });
}

export function useSettlementLines(period: Period, basis: CostBasis, params: LineParams, enabled = true) {
  return useQuery({
    queryKey: [...settlementKeys.month(period, basis), "lines", params] as const,
    queryFn: () => listSettlementLines(period, basis, params),
    enabled,
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useSettlementBreakdown(period: Period, basis: CostBasis, by: BreakdownBy, supplierCode: string | null) {
  return useQuery({
    queryKey: [...settlementKeys.month(period, basis), "breakdown", by, supplierCode] as const,
    queryFn: () => getSettlementBreakdown(period, basis, by, supplierCode),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export type SettlementAction = "recalculate" | "close" | "reopen";

const ACTIONS = { recalculate: recalculateSettlement, close: closeSettlement, reopen: reopenSettlement };

const POLL_MS = 15_000;
/** The calculation takes 1 to 3 minutes; past this the screen stops asking and says so. */
const MAX_WAIT_MS = 8 * 60_000;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * After a 504 the API still finishes and saves the calculation (API #120): ask /periods every
 * 15 seconds until the month shows a `calculated_at` other than the one it had before.
 */
async function waitForCalculation(period: Period, basis: CostBasis, since: string | null, startedAt: number): Promise<Settlement> {
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    await pause(POLL_MS);
    const month = (await listSettlementPeriods(basis).catch(() => [])).find((item) => item.period === period);
    const settlement = month?.settlement ?? null;
    if (settlement && settlement.calculated_at !== since) return settlement;
  }
  throw new ApiError(504, "El mes sigue sin terminar de calcularse. Recarga la página en unos minutos; si no cambia, avísale a TI.");
}

export interface SettlementActionInput {
  action: SettlementAction;
  period: Period;
  /** Close and reopen touch only this basis; recalculate redoes both open ones and returns this one. */
  basis: CostBasis;
  /** The basis' `calculated_at` before the action, to tell when a new calculation landed. */
  since: string | null;
  /** The request was cut (504) and the screen now waits for the calculation to show up. */
  onDetached?: () => void;
}

/**
 * Recalculate, close or reopen a month on one basis. Every read of the module is refreshed after,
 * both bases: a recalculation redoes the two open ones. A calculation the proxy stopped waiting
 * for stays pending until it lands, so nobody starts a second one.
 */
export function useSettlementAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, period, basis, since, onDetached }: SettlementActionInput) => {
      const startedAt = Date.now();
      try {
        return await ACTIONS[action](period, basis);
      } catch (failure) {
        if (!(failure instanceof ApiError && failure.status === 504) || action === "reopen") throw failure;
        onDetached?.();
        return waitForCalculation(period, basis, since, startedAt);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: settlementKeys.all }),
  });
}
