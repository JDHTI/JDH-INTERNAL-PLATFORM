"use client"

import { Pagination } from "@/intranet/components/navigation/pagination"

import type { NoticiaFilters } from "../types"

/**
 * Thin client wrapper around `Pagination` (a Client Component). `hrefFor` is a
 * plain closure — Server Components cannot pass functions as props to Client
 * Components (only Server Actions), so the closure has to be constructed here,
 * not in `NoticiasView`. Only serializable data (`filters`, `page`,
 * `totalPages`) crosses the RSC boundary.
 */
export function NoticiasPagination({
  filters,
  page,
  totalPages,
}: {
  filters: NoticiaFilters
  page: number
  totalPages: number
}) {
  function hrefFor(target: number): `/${string}` {
    const params = new URLSearchParams()
    if (filters.tipo !== "all") params.set("tipo", filters.tipo)
    if (filters.zona !== "all") params.set("zona", filters.zona)
    if (target > 1) params.set("page", String(target))

    const qs = params.toString()
    return qs ? `/noticias?${qs}` : "/noticias"
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      hrefFor={hrefFor}
      className="mt-12"
    />
  )
}
