import type { DocumentoFilters } from "./types"

/** Filas por página, resuelto por Strapi (`pagination[pageSize]`). */
export const PAGE_SIZE = 10

/**
 * Columnas de `DocumentosTable` (ver `src/components/data/data-table.tsx`).
 * Más ancho para "Documento" que el prototipo de `data-table-section.tsx`
 * porque la celda lleva nombre + tipo/peso en dos líneas.
 */
export const GRID_TEMPLATE = "2fr 160px 160px 140px 40px"

/** Espera antes de reflejar el término de búsqueda en la URL. */
export const SEARCH_DEBOUNCE_MS = 300

const BASE_PATH = "/documentos"

/**
 * Construye la URL del listado a partir de filtros parciales, omitiendo los
 * valores por defecto (`categoria: "all"`, `q: ""`, `page: 1`) para no
 * ensuciar la URL. Usado por el toolbar (buscador + chips) y por la
 * paginación para que `q`/`categoria` sobrevivan al cambio de página.
 */
export function documentosHref(
  filters: Partial<DocumentoFilters>
): `/${string}` {
  const params = new URLSearchParams()
  if (filters.categoria && filters.categoria !== "all") {
    params.set("categoria", filters.categoria)
  }
  if (filters.q) params.set("q", filters.q)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))

  const qs = params.toString()
  return (qs ? `${BASE_PATH}?${qs}` : BASE_PATH) as `/${string}`
}

/**
 * "180 KB" / "2,4 MB" — Strapi reporta `file.size` en KILOBYTES (float), no
 * en bytes; ver `src/lib/strapi/types.ts`.
 */
export function formatFileSize(sizeKb: number | null | undefined): string {
  if (sizeKb == null) return ""
  if (sizeKb < 1024) return `${Math.round(sizeKb)} KB`
  return `${(sizeKb / 1024).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`
}

/** "15 jul 2026" — siempre con año: es una fecha de revisión, no un timestamp editorial reciente. */
export function formatDocumentoDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
