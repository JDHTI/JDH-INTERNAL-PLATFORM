import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type {
  StrapiListResponse,
  StrapiRequestParams,
} from "@/intranet/lib/strapi"

import { PAGE_SIZE } from "../documentos.config"
import type { SigComponente, SigSeccionValue } from "../sig.config"
import type { StrapiDocumento } from "./documento.mapper"

/** Colección REST del CMS y opciones compartidas de las consultas de documentos. */
const COLLECTION = "documentos"
const POPULATE = ["file", "area", "categoria"]
const SORT = ["revisionDate:desc"]
/** Tag de caché de Next para revalidación desde el webhook del CMS. */
const CACHE_TAG = "documentos"
const DESTACADOS_LIMIT = 3
/** Máximo por página del CMS (`maxLimit` en su `config/api.ts`). */
const MAX_PAGE_SIZE = 100
/** Tope de páginas al recorrer una colección completa: 1.000 documentos. */
const MAX_PAGES = 10

/**
 * Campos de los listados del SIG. Todos menos `contenido` (Blocks), que solo
 * hace falta al leer un documento o en las secciones de texto. Con
 * `strictParams` en el CMS, pedir un campo que aún no existe responde 400: la
 * capa `queries.ts` lo convierte en lista vacía.
 */
const SIG_LIST_FIELDS = [
  "title",
  "slug",
  "description",
  "revisionDate",
  "featured",
  "seccion",
  "componente",
  "presentacion",
  "obligatorio",
  "evaluacionUrl",
  "codigo",
  "version",
  "orden",
]

const SIG_POPULATE = {
  file: { fields: ["url", "ext", "size", "mime", "name"] },
  area: { fields: ["name"] },
  categoria: { fields: ["name", "slug"] },
}

interface FindDocumentosArgs {
  categoria: string
  componente: SigComponente | "all"
  q: string
  page: number
  pageSize?: number
}

/**
 * Construye el bloque `filters`, omitiendo los valores "all" y la búsqueda
 * vacía. `componente` solo se envía si el usuario lo eligió: así la tabla
 * sigue funcionando contra un CMS que aún no tiene ese campo.
 */
function buildFilters({
  categoria,
  componente,
  q,
}: Pick<FindDocumentosArgs, "categoria" | "componente" | "q">): Record<
  string,
  unknown
> {
  const filters: Record<string, unknown> = {}
  if (categoria !== "all") filters.categoria = { slug: { $eq: categoria } }
  if (componente !== "all") filters.componente = { $eq: componente }
  if (q) filters.title = { $containsi: q }
  return filters
}

/** Listado paginado del control documental. */
export function findDocumentos({
  categoria,
  componente,
  q,
  page,
  pageSize = PAGE_SIZE,
}: FindDocumentosArgs): Promise<StrapiListResponse<StrapiDocumento>> {
  return strapiFindMany<StrapiDocumento>(
    COLLECTION,
    {
      filters: buildFilters({ categoria, componente, q }),
      sort: SORT,
      pagination: { page, pageSize },
      populate: POPULATE,
    },
    { tags: [CACHE_TAG] }
  )
}

/** Recorre todas las páginas de una consulta (hasta `MAX_PAGES`). */
async function findAll<T>(
  params: Omit<StrapiRequestParams, "pagination">
): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  let pageCount = 1

  do {
    const res = await strapiFindMany<T>(
      COLLECTION,
      { ...params, pagination: { page, pageSize: MAX_PAGE_SIZE } },
      { tags: [CACHE_TAG] }
    )
    rows.push(...res.data)
    pageCount = res.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount && page <= MAX_PAGES)

  return rows
}

/** Fila mínima para agregar conteos de un filtro. */
export interface DocumentoFacetRow {
  slug: string
  label: string
}

interface CategoriaFacetEntity {
  categoria?: { slug: string; name: string } | null
}

/**
 * Filas mínimas (solo `categoria`) para los conteos de los chips de
 * categoría. Respeta la búsqueda y el componente activos pero NO el filtro de
 * categoría: es la dimensión que se está facetando.
 */
export async function findCategoriaFacetRows(
  q: string,
  componente: SigComponente | "all"
): Promise<{ total: number; rows: DocumentoFacetRow[] }> {
  const entities = await findAll<CategoriaFacetEntity>({
    filters: buildFilters({ categoria: "all", componente, q }),
    fields: ["id"],
    populate: { categoria: { fields: ["slug", "name"] } },
  })
  // `total` cuenta también los documentos sin categoría (los del SIG suelen
  // no tenerla): es el número del chip «Todas».
  return {
    total: entities.length,
    rows: entities.flatMap((entity) =>
      entity.categoria
        ? [{ slug: entity.categoria.slug, label: entity.categoria.name }]
        : []
    ),
  }
}

/**
 * Valores de `componente` para los chips del mismo nombre, con la búsqueda y
 * la categoría activas. Contra un CMS sin el campo responde 400, y la capa de
 * queries oculta el grupo de chips.
 */
export async function findComponenteRows(
  q: string,
  categoria: string
): Promise<string[]> {
  const entities = await findAll<{ componente?: string | null }>({
    filters: {
      ...buildFilters({ categoria, componente: "all", q }),
      componente: { $notNull: true },
    },
    fields: ["componente"],
  })
  return entities.flatMap((entity) =>
    entity.componente ? [entity.componente] : []
  )
}

/**
 * Documentos curados para el bloque de "destacados" al pie del control
 * documental (`featured: true` en el schema), no un slice del listado.
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

interface FindSigDocumentosArgs {
  /** Secciones a traer; sin valor, cualquier documento con sección. */
  secciones?: SigSeccionValue[]
  soloObligatorios?: boolean
  /** Trae también `contenido` (Blocks), para las secciones de texto. */
  conContenido?: boolean
}

/**
 * Documentos del SIG, ordenados por `orden` y título. Una sola consulta por
 * pantalla: la portada pide los obligatorios, cada módulo sus secciones.
 */
export function findSigDocumentos({
  secciones,
  soloObligatorios = false,
  conContenido = false,
}: FindSigDocumentosArgs): Promise<StrapiDocumento[]> {
  const filters: Record<string, unknown> = {
    seccion: secciones ? { $in: secciones } : { $notNull: true },
  }
  if (soloObligatorios) filters.obligatorio = { $eq: true }

  return findAll<StrapiDocumento>({
    filters,
    fields: conContenido ? [...SIG_LIST_FIELDS, "contenido"] : SIG_LIST_FIELDS,
    populate: SIG_POPULATE,
    sort: ["orden:asc", "title:asc"],
  })
}

/** Un documento por slug, con su texto completo. */
export async function findSigDocumentoBySlug(
  slug: string
): Promise<StrapiDocumento | null> {
  const res = await strapiFindMany<StrapiDocumento>(
    COLLECTION,
    {
      filters: { slug: { $eq: slug } },
      populate: SIG_POPULATE,
      pagination: { pageSize: 1 },
    },
    { tags: [CACHE_TAG] }
  )
  return res.data[0] ?? null
}
