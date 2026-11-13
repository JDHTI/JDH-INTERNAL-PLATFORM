"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  applyBoardPrices,
  buildBoardList,
  getBoardOverview,
  getBoardRows,
  reviewBoardRows,
  setBoardNote,
  setBoardPrices,
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

export function useBoardOverview() {
  return useQuery({ queryKey: boardKeys.overview(), queryFn: getBoardOverview, retry: retryTransient });
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

export function useBuildBoardList() {
  const refresh = useRefreshBoard();
  return useMutation({ mutationFn: (code: string) => buildBoardList(code), onSuccess: refresh });
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
