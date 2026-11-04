"use client"

import { Pagination } from "@/intranet/components/navigation/pagination"

import { directorioHref } from "../directorio.config"
import type { EmpleadoFilters } from "../types"

/**
 * Wrapper delgado sobre `Pagination`: construye `hrefFor` de este lado de la
 * frontera server→client (una función no puede pasarse como prop desde un
 * Server Component). Usa `directorioHref` para que `q`/`sede` sobrevivan al
 * cambio de página.
 */
export function DirectorioPagination({
  filters,
  page,
  totalPages,
}: {
  filters: EmpleadoFilters
  page: number
  totalPages: number
}) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      hrefFor={(target) => directorioHref({ ...filters, page: target })}
      className="mt-12"
    />
  )
}
