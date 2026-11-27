"use client"

import { Pagination } from "@/intranet/components/navigation/pagination"

import { documentosHref } from "../documentos.config"
import type { DocumentoFilters } from "../types"

/**
 * Wrapper delgado sobre `Pagination`: construye `hrefFor` de este lado de la
 * frontera server→client (una función no puede pasarse como prop desde un
 * Server Component, mismo principio que `noticias-pagination.tsx`). Usa
 * `documentosHref` para que `categoria`/`q` sobrevivan al cambio de página.
 */
export function DocumentosPagination({
  filters,
  page,
  totalPages,
}: {
  filters: DocumentoFilters
  page: number
  totalPages: number
}) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      hrefFor={(target) => documentosHref({ ...filters, page: target })}
      className="mt-12"
    />
  )
}
