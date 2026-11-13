"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  applyBoardPrices,
  getBoardOverview,
  getBoardRows,
  reviewBoardRows,
  setBoardNote,
  setBoardPrices,
  syncBoard,
} from "../services/board.service";
import type { BoardFilters, BoardKey, ReviewStatus } from "../types/quotations.types";
import { quotationKeys } from "./use-quotations";

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429, 503].includes(error.status)) && count < 1;

export const boardKeys = {
  all: [...quotationKeys.all, "board"] as const,
  overview: () => [...boardKeys.all, "overview"] as const,
  rows: (filters: BoardFilters, page: number, size: number) => [...boardKeys.all, "rows", filters, page, size] as const,
};

const syncing = (status: string | undefined) => status === "queued" || status === "running";

/** While a sync is queued or running, the overview is read again every few seconds. */
export function useBoardOverview() {
  const client = useQueryClient();
  const [wasSyncing, setWasSyncing] = useState(false);
  const query = useQuery({
    queryKey: boardKeys.overview(),
    queryFn: getBoardOverview,
    retry: retryTransient,
    refetchInterval: (current) => (syncing(current.state.data?.sync?.status) ? 5000 : false),
  });
  const now = syncing(query.data?.sync?.status);
  if (now !== wasSyncing) {
    setWasSyncing(now);
    // The sync just finished: the rows changed under the table.
    if (!now) void client.invalidateQueries({ queryKey: [...boardKeys.all, "rows"] });
  }
  return query;
}

export function useSyncBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: syncBoard,
    onSuccess: () => void client.invalidateQueries({ queryKey: boardKeys.overview() }),
  });
}

export function useBoardRows(filters: BoardFilters, page: number, size: number, enabled = true) {
  return useQuery({
    queryKey: boardKeys.rows(filters, page, size),
    queryFn: () => getBoardRows(filters, page, size),
    placeholderData: keepPreviousData,
    retry: retryTransient,
    enabled,
  });
}

/** Any write changes rows, counts and the staging: the board is read again. */
function useRefreshBoard() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: boardKeys.all });
    void client.invalidateQueries({ queryKey: [...quotationKeys.all, "staging"] });
    void client.invalidateQueries({ queryKey: [...quotationKeys.all, "detail"] });
  };
}

export function useBoardPrices() {
  const refresh = useRefreshBoard();
  return useMutation({
    mutationFn: (changes: (BoardKey & { new_price: string | null })[]) => setBoardPrices(changes),
    onSuccess: refresh,
  });
}

export function useBoardApply() {
  const refresh = useRefreshBoard();
  return useMutation({
    mutationFn: ({ keys, mode }: { keys: BoardKey[]; mode: "optimo" | "minimo" | "limpiar" }) => applyBoardPrices(keys, mode),
    onSuccess: refresh,
  });
}

export function useBoardReview() {
  const refresh = useRefreshBoard();
  return useMutation({
    mutationFn: ({ keys, status }: { keys: BoardKey[]; status: ReviewStatus }) => reviewBoardRows(keys, status),
    onSuccess: refresh,
  });
}

export function useBoardNote() {
  const refresh = useRefreshBoard();
  return useMutation({
    mutationFn: ({ key, note }: { key: BoardKey; note: string }) => setBoardNote(key, note),
    onSuccess: refresh,
  });
}
