import { apiFetch } from "@/shared/lib/api-client";

import type {
  BoardActionResult,
  BoardFilters,
  BoardKey,
  BoardList,
  BoardOverview,
  BoardPage,
  BoardRow,
  ReviewStatus,
} from "../types/quotations.types";

const BASE = "/price-list-updates/main";

/** Every main list on the board, with its update's counts once built, and the filter options. */
export function getBoardOverview(): Promise<BoardOverview> {
  return apiFetch<BoardOverview>(BASE);
}

/** Builds a main list from the warehouse, or refreshes it keeping new prices, reviews and notes. */
export function buildBoardList(code: string): Promise<BoardList> {
  return apiFetch<BoardList>(`${BASE}/lists/${encodeURIComponent(code)}/build`, { method: "POST" });
}

function filterQuery(filters: BoardFilters) {
  return {
    lists: filters.lists,
    q: filters.q.trim() || undefined,
    suppliers: filters.suppliers,
    categories: filters.categories,
    chip: filters.chip ?? undefined,
  };
}

/** One page of the board: rows of every main list (or the chosen ones), filtered and sorted. */
export function getBoardRows(filters: BoardFilters, page: number, size: number): Promise<BoardPage> {
  return apiFetch<BoardPage>(`${BASE}/rows`, {
    query: { ...filterQuery(filters), sort: filters.sort, desc: filters.desc ? "true" : undefined, page, size },
  });
}

/** Every row of the filter (at most 10,000), to act on all of them. */
export function getBoardKeys(filters: BoardFilters): Promise<BoardKey[]> {
  return apiFetch<BoardKey[]>(`${BASE}/keys`, { query: filterQuery(filters) });
}

/** New prices (whole pesos) or `null` to clear; a new price sends the item back to unmarked. */
export function setBoardPrices(changes: (BoardKey & { new_price: string | null })[]): Promise<BoardActionResult> {
  return apiFetch<BoardActionResult>(`${BASE}/prices`, { method: "PUT", body: { changes } });
}

/** Prices the rows at their optimal or minimum price, or clears them. */
export function applyBoardPrices(keys: BoardKey[], mode: "optimo" | "minimo" | "limpiar"): Promise<BoardActionResult> {
  return apiFetch<BoardActionResult>(`${BASE}/apply`, { method: "POST", body: { keys, mode } });
}

export function reviewBoardRows(keys: BoardKey[], status: ReviewStatus): Promise<BoardActionResult> {
  return apiFetch<BoardActionResult>(`${BASE}/review`, { method: "PUT", body: { keys, status } });
}

export function setBoardNote(key: BoardKey, note: string): Promise<BoardRow> {
  return apiFetch<BoardRow>(`${BASE}/note`, { method: "PUT", body: { ...key, note } });
}
