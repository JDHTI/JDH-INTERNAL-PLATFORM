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
import type { BoardActionResult, BoardFilters, BoardKey, BoardPage, BoardRow, ReviewStatus } from "../types/quotations.types";
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

export const boardRowKey = (key: BoardKey) => `${key.quotation_id}|${key.sku}`;
const ROWS = [...boardKeys.all, "rows"] as const;
// Every edit of the board shares this key, so the board is read again only after the last one.
const EDIT = [...boardKeys.all, "edit"] as const;
type Snapshot = [readonly unknown[], BoardPage | undefined][];

/**
 * Edits show at once: the cached pages change before the API answers, take
 * the rows it sends back (margins, variation, who reviewed), and go back to
 * what they were when it fails. The counts and the staging are read again in
 * the background once no edit is pending, so a refetch never overwrites a
 * price still being saved.
 */
function useOptimisticRows() {
  const client = useQueryClient();
  const patch = (rows: Map<string, (row: BoardRow) => BoardRow>) =>
    client.setQueriesData<BoardPage>({ queryKey: ROWS }, (page) =>
      page ? { ...page, items: page.items.map((row) => rows.get(boardRowKey(row))?.(row) ?? row) } : page
    );
  return {
    /** Stops the reads in flight and changes the rows; returns what to undo. */
    begin: async (rows: Map<string, (row: BoardRow) => BoardRow>): Promise<Snapshot> => {
      await client.cancelQueries({ queryKey: ROWS });
      const before = client.getQueriesData<BoardPage>({ queryKey: ROWS });
      patch(rows);
      return before;
    },
    /** The rows as the API stored them; the stock stays the page's (an edit does not read it). */
    settle: (saved: BoardRow[] | undefined) =>
      patch(
        new Map(
          (saved ?? []).map((next) => [
            boardRowKey(next),
            (row: BoardRow) => ({ ...next, stock_on_hand: row.stock_on_hand, stock_available: row.stock_available, stock_warehouses: row.stock_warehouses }),
          ])
        )
      ),
    /** Back to what the pages had; with `only`, just those rows (the ones the API skipped). */
    undo: (before: Snapshot | undefined, only?: Set<string>) => {
      if (!only) {
        before?.forEach(([key, data]) => client.setQueryData(key, data));
        return;
      }
      const old = new Map<string, (row: BoardRow) => BoardRow>();
      for (const [, data] of before ?? []) {
        for (const row of data?.items ?? []) if (only.has(boardRowKey(row))) old.set(boardRowKey(row), () => row);
      }
      if (old.size > 0) patch(old);
    },
    refreshWhenIdle: () => {
      if (client.isMutating({ mutationKey: EDIT }) > 1) return;
      void client.invalidateQueries({ queryKey: boardKeys.all });
      void client.invalidateQueries({ queryKey: [...quotationKeys.all, "staging"] });
      void client.invalidateQueries({ queryKey: [...quotationKeys.all, "detail"] });
    },
  };
}

/**
 * A price changed: it waits for validation (active and with a unit); cleared,
 * it is unmarked. Its margins and variation come with the API's answer: until
 * then they are blank rather than the old price's.
 */
function priced(row: BoardRow, price: string | null): BoardRow {
  const ready = price !== null && row.is_active && !!row.unit;
  return {
    ...row,
    new_price: price,
    new_margin_pct: null,
    new_margin_with_support_pct: null,
    variation_pct: null,
    compliance: null,
    review_status: ready ? "por_validar" : "sin_marcar",
    load_id: null,
    loaded: false,
  };
}

/** The rows the API did not write (it names them by SKU). */
const skippedOf = (keys: BoardKey[], result: BoardActionResult) =>
  new Set(keys.filter((key) => result.skipped.some((item) => item.sku === key.sku)).map(boardRowKey));

export function useBoardPrices() {
  const rows = useOptimisticRows();
  return useMutation({
    mutationKey: EDIT,
    mutationFn: (changes: (BoardKey & { new_price: string | null })[]) => setBoardPrices(changes),
    onMutate: (changes) =>
      rows.begin(new Map(changes.map((change) => [boardRowKey(change), (row: BoardRow) => priced(row, change.new_price)]))),
    onSuccess: (result, changes, before) => {
      rows.undo(before, skippedOf(changes, result));
      rows.settle(result.rows);
    },
    onError: (_failure, _changes, before) => rows.undo(before),
    onSettled: rows.refreshWhenIdle,
  });
}

/** Up to 10,000 rows: the board is read again when it ends. */
export function useBoardApply() {
  const rows = useOptimisticRows();
  return useMutation({
    mutationKey: EDIT,
    mutationFn: ({ keys, mode }: { keys: BoardKey[]; mode: "optimo" | "minimo" | "limpiar" }) => applyBoardPrices(keys, mode),
    onSettled: rows.refreshWhenIdle,
  });
}

export function useBoardReview() {
  const rows = useOptimisticRows();
  return useMutation({
    mutationKey: EDIT,
    mutationFn: ({ keys, status }: { keys: BoardKey[]; status: ReviewStatus }) => reviewBoardRows(keys, status),
    onMutate: ({ keys, status }) =>
      rows.begin(new Map(keys.map((key) => [boardRowKey(key), (row: BoardRow) => ({ ...row, review_status: status })]))),
    onSuccess: (result, { keys }, before) => {
      rows.undo(before, skippedOf(keys, result));
      rows.settle(result.rows);
    },
    onError: (_failure, _variables, before) => rows.undo(before),
    onSettled: rows.refreshWhenIdle,
  });
}

export function useBoardNote() {
  const rows = useOptimisticRows();
  return useMutation({
    mutationKey: EDIT,
    mutationFn: ({ key, note }: { key: BoardKey; note: string }) => setBoardNote(key, note),
    onSuccess: (row) => rows.settle([row]),
    onSettled: rows.refreshWhenIdle,
  });
}
