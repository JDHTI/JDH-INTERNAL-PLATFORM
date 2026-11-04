import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type { StrapiListResponse } from "@/intranet/lib/strapi"

import { PAGE_SIZE } from "../noticias.config"
import type { NoticiaTipo, ZonaId } from "../types"
import type { StrapiNoticia } from "./noticia.mapper"

/** Colección REST del CMS y opciones compartidas de las consultas de noticias. */
const COLLECTION = "noticias"
const POPULATE = ["area", "categoria", "zona", "tags", "coverImage"]
/** Reproduce el orden del dominio: fijadas primero, luego fecha desc. */
const SORT = ["pinned:desc", "publishedAt:desc"]
/** Tag de caché de Next para revalidación futura desde Server Actions. */
const CACHE_TAG = "noticias"

interface FindNoticiasArgs {
  tipo: NoticiaTipo | "all"
  zona: ZonaId | "all"
  page: number
  pageSize?: number
}

/** Construye el bloque `filters` omitiendo las dimensiones en `"all"`. */
function buildFilters(
  tipo: NoticiaTipo | "all",
  zona: ZonaId | "all"
): Record<string, unknown> {
  const filters: Record<string, unknown> = {}
  if (tipo !== "all") filters.tipo = { $eq: tipo }
  if (zona !== "all") filters.zona = { code: { $eq: zona } }
  return filters
}

/** Listado paginado y filtrado. */
export function findNoticias({
  tipo,
  zona,
  page,
  pageSize = PAGE_SIZE,
}: FindNoticiasArgs): Promise<StrapiListResponse<StrapiNoticia>> {
  return strapiFindMany<StrapiNoticia>(
    COLLECTION,
    {
      filters: buildFilters(tipo, zona),
      sort: SORT,
      pagination: { page, pageSize },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/** Una noticia por slug (o `null`). */
export async function findNoticiaBySlug(
  slug: string
): Promise<StrapiNoticia | null> {
  const res = await strapiFindMany<StrapiNoticia>(
    COLLECTION,
    {
      filters: { slug: { $eq: slug } },
      populate: POPULATE,
      pagination: { pageSize: 1 },
    },
    { tags: [CACHE_TAG] }
  )
  return res.data[0] ?? null
}

interface FindRelatedArgs {
  slug: string
  category: string
  zona: ZonaId
  limit: number
}

/**
 * Relacionadas automáticas: comparten `category` (por nombre) o `zona` (por
 * code) con la actual, excluyendo la propia, con el mismo orden del listado.
 */
export function findRelated({
  slug,
  category,
  zona,
  limit,
}: FindRelatedArgs): Promise<StrapiListResponse<StrapiNoticia>> {
  return strapiFindMany<StrapiNoticia>(
    COLLECTION,
    {
      filters: {
        $or: [
          { categoria: { name: { $eq: category } } },
          { zona: { code: { $eq: zona } } },
        ],
        slug: { $ne: slug },
      },
      sort: SORT,
      pagination: { pageSize: limit },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/**
 * Pool de candidatas recientes para "destacadas" (ver `getNoticiasDestacadas`
 * en `server/queries.ts`, que muestrea `limit` al azar de este pool). No es
 * un `findDestacados` de tamaño fijo como en documentos porque aquí el
 * criterio es "recientes, en orden aleatorio", no un flag `featured`.
 */
export function findDestacadasPool(
  poolSize: number
): Promise<StrapiListResponse<StrapiNoticia>> {
  return strapiFindMany<StrapiNoticia>(
    COLLECTION,
    {
      sort: SORT,
      pagination: { pageSize: poolSize },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/**
 * Las `limit` más recientes de un tipo, ordenadas ESTRICTAMENTE por fecha de
 * publicación — a diferencia de `SORT`, que antepone las fijadas (`pinned`).
 * La home pide "las últimas publicadas", no "las que el editor fijó arriba":
 * si una fijada antigua se colara en el slider, el bloque dejaría de reflejar
 * lo que su propio título promete.
 */
export function findUltimasPorTipo(
  tipo: NoticiaTipo,
  limit: number
): Promise<StrapiListResponse<StrapiNoticia>> {
  return strapiFindMany<StrapiNoticia>(
    COLLECTION,
    {
      filters: { tipo: { $eq: tipo } },
      sort: ["publishedAt:desc"],
      pagination: { pageSize: limit },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/** Fila mínima para agregación de conteos (sin poblar cuerpo/relaciones pesadas). */
export interface NoticiaFacetRow {
  tipo: NoticiaTipo
  zonaCode: ZonaId
}

interface FacetEntity {
  tipo: NoticiaTipo
  zona?: { code: string } | null
}

/**
 * Trae filas mínimas (`tipo` + `zona.code`) para calcular conteos por faceta,
 * filtrando opcionalmente por una dimensión. Pagina si hay más de una página
 * (el máximo por página del CMS es 100).
 */
export async function findFacetRows(scope: {
  tipo?: NoticiaTipo | "all"
  zona?: ZonaId | "all"
}): Promise<NoticiaFacetRow[]> {
  const filters: Record<string, unknown> = {}
  if (scope.tipo && scope.tipo !== "all") filters.tipo = { $eq: scope.tipo }
  if (scope.zona && scope.zona !== "all")
    filters.zona = { code: { $eq: scope.zona } }

  const rows: NoticiaFacetRow[] = []
  let page = 1
  let pageCount = 1

  do {
    const res = await strapiFindMany<FacetEntity>(
      COLLECTION,
      {
        filters,
        fields: ["id", "tipo"],
        populate: { zona: { fields: ["code"] } },
        pagination: { page, pageSize: 100 },
      },
      { tags: [CACHE_TAG] }
    )
    for (const entity of res.data) {
      rows.push({
        tipo: entity.tipo,
        zonaCode: (entity.zona?.code ?? "nacional") as ZonaId,
      })
    }
    pageCount = res.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount)

  return rows
}
