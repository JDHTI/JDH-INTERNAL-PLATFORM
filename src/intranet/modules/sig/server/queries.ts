import "server-only"

import { PAGE_SIZE } from "../documentos.config"
import {
  componenteLabel,
  isSigComponente,
  moduloCmsValues,
  SIG_COMPONENTES,
} from "../sig.config"
import type {
  SigComponente,
  SigModulo,
  SigSeccionValue,
} from "../sig.config"
import type {
  CategoriaFacet,
  Documento,
  DocumentoFilters,
  DocumentosPage,
} from "../types"
import { mapDocumento } from "./documento.mapper"
import {
  findCategoriaFacetRows,
  findComponenteRows,
  findDestacados,
  findDocumentos,
  findSigDocumentoBySlug,
  findSigDocumentos,
} from "./strapi-documentos.service"

/**
 * SEAM STRAPI — acceso a datos server-only del SIG, CONECTADO al CMS.
 * Delega en `strapi-documentos.service` (construcción de peticiones) y en
 * `documento.mapper` (entidad Strapi → dominio). Las firmas son el contrato
 * estable que consumen las rutas de `/sig`.
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
    console.error(`[sig] fallo leyendo Strapi (${context}):`, error)
    return fallback
  }
}

/** `orden` ascendente con los vacíos al final; empates por título. */
function byOrden(a: Documento, b: Documento): number {
  if (a.orden !== b.orden) {
    if (a.orden == null) return 1
    if (b.orden == null) return -1
    return a.orden - b.orden
  }
  return a.title.localeCompare(b.title, "es")
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
  q: string,
  componente: SigComponente | "all"
): Promise<{ all: number; facets: CategoriaFacet[] }> {
  return safe("getCategoriaFacets", { all: 0, facets: [] }, async () => {
    const rows = await findCategoriaFacetRows(q, componente)

    const bySlug = new Map<string, CategoriaFacet>()
    for (const row of rows) {
      const existing = bySlug.get(row.slug)
      if (existing) existing.count += 1
      else bySlug.set(row.slug, { slug: row.slug, label: row.label, count: 1 })
    }

    return {
      all: rows.length,
      facets: [...bySlug.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "es")
      ),
    }
  })
}

/**
 * Conteos por componente del SIG, en el orden fijo de `SIG_COMPONENTES`.
 * Vacío si el CMS aún no tiene el campo o ningún documento lo usa: en ese
 * caso el toolbar no muestra el grupo.
 */
export async function getComponenteFacets(
  q: string,
  categoria: string
): Promise<CategoriaFacet[]> {
  return safe("getComponenteFacets", [], async () => {
    const values = await findComponenteRows(q, categoria)
    const counts = new Map<SigComponente, number>()
    for (const value of values) {
      if (isSigComponente(value)) counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return SIG_COMPONENTES.flatMap(({ value }) => {
      const count = counts.get(value)
      return count ? [{ slug: value, label: componenteLabel(value), count }] : []
    })
  })
}

export async function getDocumentosDestacados(): Promise<Documento[]> {
  return safe("getDocumentosDestacados", [], async () => {
    const res = await findDestacados()
    return res.data.map(mapDocumento)
  })
}

/**
 * Resultado de una lectura del SIG. `disponible: false` distingue un CMS que
 * no respondió (la pantalla lo avisa) de una sección que simplemente aún no
 * tiene documentos (estado vacío).
 */
export interface SigLectura<T> {
  data: T
  disponible: boolean
}

async function lectura<T>(
  context: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<SigLectura<T>> {
  try {
    return { data: await fn(), disponible: true }
  } catch (error) {
    console.error(`[sig] fallo leyendo Strapi (${context}):`, error)
    return { data: fallback, disponible: false }
  }
}

/** Documentos obligatorios de todo el SIG, para la portada. */
export async function getSigObligatorios(): Promise<SigLectura<Documento[]>> {
  return lectura("getSigObligatorios", [], async () => {
    const entities = await findSigDocumentos({ soloObligatorios: true })
    return entities.map(mapDocumento).sort(byOrden)
  })
}

/** Políticas SIG (una por componente), para la portada y el módulo de gestión. */
export async function getSigPoliticas(): Promise<SigLectura<Documento[]>> {
  return lectura("getSigPoliticas", [], async () => {
    const entities = await findSigDocumentos({ secciones: ["sig_politicas"] })
    return entities.map(mapDocumento).sort(byOrden)
  })
}

export type DocumentosPorSeccion = Partial<Record<SigSeccionValue, Documento[]>>

/**
 * Documentos de un módulo agrupados por sección. Trae `contenido` porque las
 * secciones de texto (historia, misión, mapa de procesos) se leen en la
 * misma página.
 */
export async function getSigModulo(
  modulo: SigModulo
): Promise<SigLectura<DocumentosPorSeccion>> {
  return lectura(`getSigModulo:${modulo.slug}`, {}, async () => {
    const entities = await findSigDocumentos({
      secciones: moduloCmsValues(modulo),
      conContenido: true,
    })
    const grouped: DocumentosPorSeccion = {}
    for (const documento of entities.map(mapDocumento).sort(byOrden)) {
      if (!documento.seccion) continue
      ;(grouped[documento.seccion] ??= []).push(documento)
    }
    return grouped
  })
}

export async function getSigDocumento(slug: string): Promise<Documento | null> {
  return safe("getSigDocumento", null, async () => {
    const entity = await findSigDocumentoBySlug(slug)
    return entity ? mapDocumento(entity) : null
  })
}
