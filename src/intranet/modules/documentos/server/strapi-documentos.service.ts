import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type { StrapiListResponse } from "@/intranet/lib/strapi"

import { PAGE_SIZE } from "../documentos.config"
import type { StrapiDocumento } from "./documento.mapper"

/** Colección REST del CMS y opciones compartidas de las consultas de documentos. */
const COLLECTION = "documentos"
const POPULATE = ["file", "area", "categoria"]
const SORT = ["revisionDate:desc"]
/** Tag de caché de Next para revalidación desde el webhook del CMS. */
const CACHE_TAG = "documentos"
const DESTACADOS_LIMIT = 3

interface FindDocumentosArgs {
  categoria: string
  q: string
  page: number
  pageSize?: number
}

/** Construye el bloque `filters`, omitiendo categoría "all" y búsqueda vacía. */
function buildFilters(categoria: string, q: string): Record<string, unknown> {
  const filters: Record<string, unknown> = {}
  if (categoria !== "all") filters.categoria = { slug: { $eq: categoria } }
  if (q) filters.title = { $containsi: q }
  return filters
}

/** Listado paginado, filtrado por categoría y buscado por título. */
export function findDocumentos({
  categoria,
  q,
  page,
  pageSize = PAGE_SIZE,
}: FindDocumentosArgs): Promise<StrapiListResponse<StrapiDocumento>> {
  return strapiFindMany<StrapiDocumento>(
    COLLECTION,
    {
      filters: buildFilters(categoria, q),
      sort: SORT,
      pagination: { page, pageSize },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/** Fila mínima para agregación de conteos por categoría. */
export interface DocumentoFacetRow {
  categoriaSlug: string
  categoriaLabel: string
}

interface FacetEntity {
  categoria?: { slug: string; name: string } | null
}

/**
 * Trae filas mínimas (solo `categoria`) para calcular los conteos de los
 * chips del toolbar. Respeta el término de búsqueda activo (`q`) pero NO el
 * filtro de categoría — es la dimensión que se está facetando, mismo
 * criterio que `findFacetRows` en noticias. Pagina si hay más de una página
 * (el máximo por página del CMS es 100).
 */
export async function findCategoriaFacetRows(
  q: string
): Promise<DocumentoFacetRow[]> {
  const filters: Record<string, unknown> = {}
  if (q) filters.title = { $containsi: q }

  const rows: DocumentoFacetRow[] = []
  let page = 1
  let pageCount = 1

  do {
    const res = await strapiFindMany<FacetEntity>(
      COLLECTION,
      {
        filters,
        fields: ["id"],
        populate: { categoria: { fields: ["slug", "name"] } },
        pagination: { page, pageSize: 100 },
      },
      { tags: [CACHE_TAG] }
    )
    for (const entity of res.data) {
      if (!entity.categoria) continue
      rows.push({
        categoriaSlug: entity.categoria.slug,
        categoriaLabel: entity.categoria.name,
      })
    }
    pageCount = res.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount)

  return rows
}

/**
 * Documentos curados para el bloque de "destacados" al pie de la página
 * (`featured: true` en el schema) — no un slice del listado paginado, ver
 * `.claude/ARCHITECTURE.md`.
 */
export function findDestacados(): Promise<StrapiListResponse<StrapiDocumento>> {
  return strapiFindMany<StrapiDocumento>(
    COLLECTION,
    {
      filters: { featured: { $eq: true } },
      sort: SORT,
      pagination: { pageSize: DESTACADOS_LIMIT },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}
