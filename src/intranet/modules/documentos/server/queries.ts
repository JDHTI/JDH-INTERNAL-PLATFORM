import "server-only"

import { PAGE_SIZE } from "../documentos.config"
import type {
  CategoriaFacet,
  Documento,
  DocumentoFilters,
  DocumentosPage,
} from "../types"
import { mapDocumento } from "./documento.mapper"
import {
  findCategoriaFacetRows,
  findDestacados,
  findDocumentos,
} from "./strapi-documentos.service"

/**
 * SEAM STRAPI — acceso a datos server-only de documentos, CONECTADO al CMS.
 * Delega en `strapi-documentos.service` (construcción de peticiones sobre el
 * cliente reutilizable `@/lib/strapi`) y en `documento.mapper` (entidad
 * Strapi → dominio). Las firmas son el contrato estable que consume la ruta.
 * Ver `.claude/STRAPI.md`.
 */

/**
 * Mismo helper que `noticias/server/queries.ts`: un CMS caído, sin sembrar o
 * sin permisos públicos es un problema de configuración, no del usuario que
 * visita la página — se degrada a resultado vacío (la UI ya sabe renderizar
 * `EmptyState`) en vez de tumbar la página, dejando rastro en los logs.
 */
async function safe<T>(
  context: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[documentos] fallo leyendo Strapi (${context}):`, error)
    return fallback
  }
}

export async function getDocumentos(
  filters: DocumentoFilters
): Promise<DocumentosPage> {
  return safe(
    "getDocumentos",
    { items: [], total: 0, page: filters.page, pageSize: PAGE_SIZE },
    async () => {
      const res = await findDocumentos(filters)
      const { pagination } = res.meta

      return {
        items: res.data.map(mapDocumento),
        total: pagination.total,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
    }
  )
}

/** Conteos por categoría para los chips del toolbar, más el total sin filtrar por categoría. */
export async function getCategoriaFacets(
  q: string
): Promise<{ all: number; facets: CategoriaFacet[] }> {
  return safe("getCategoriaFacets", { all: 0, facets: [] }, async () => {
    const rows = await findCategoriaFacetRows(q)

    const bySlug = new Map<string, CategoriaFacet>()
    for (const row of rows) {
      const existing = bySlug.get(row.categoriaSlug)
      if (existing) {
        existing.count += 1
      } else {
        bySlug.set(row.categoriaSlug, {
          slug: row.categoriaSlug,
          label: row.categoriaLabel,
          count: 1,
        })
      }
    }

    return {
      all: rows.length,
      facets: [...bySlug.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "es")
      ),
    }
  })
}

export async function getDocumentosDestacados(): Promise<Documento[]> {
  return safe("getDocumentosDestacados", [], async () => {
    const res = await findDestacados()
    return res.data.map(mapDocumento)
  })
}
