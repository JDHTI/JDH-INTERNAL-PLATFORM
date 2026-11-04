import "server-only"

import { PAGE_SIZE, ZONAS } from "../noticias.config"
import type {
  Noticia,
  NoticiaFilters,
  NoticiaTipo,
  NoticiasPage,
  ZonaId,
} from "../types"
import { mapNoticia } from "./noticia.mapper"
import {
  findDestacadasPool,
  findFacetRows,
  findNoticiaBySlug,
  findNoticias,
  findRelated,
  findUltimasPorTipo,
} from "./strapi-noticias.service"

/**
 * SEAM STRAPI — acceso a datos server-only de noticias, ya CONECTADO al CMS.
 * Delega en `strapi-noticias.service` (construcción de peticiones sobre el
 * cliente reutilizable `@/lib/strapi`) y en `noticia.mapper` (entidad Strapi →
 * dominio). Las firmas (parámetros y forma de retorno) son el contrato estable
 * que consumen las páginas y el route handler; el filtrado/orden/paginación los
 * resuelve Strapi. Ver `.claude/STRAPI.md`.
 */

/**
 * El CMS puede estar caído o mal configurado (permisos públicos no
 * otorgados, seed sin correr, red) sin que eso sea culpa del usuario que
 * visita la página. En vez de dejar que ese error de red/config tumbe la
 * página entera (Next.js sin `error.tsx` la vuelve un 500 genérico), se
 * degrada a un resultado vacío: la UI ya sabe renderizar "sin resultados"
 * (`EmptyState` en `NoticiasView`). El error igual queda en los logs del
 * servidor para que no pase desapercibido en desarrollo/monitoreo.
 */
async function safe<T>(
  context: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[noticias] fallo leyendo Strapi (${context}):`, error)
    return fallback
  }
}

export async function getNoticias(
  filters: NoticiaFilters
): Promise<NoticiasPage> {
  return safe(
    "getNoticias",
    { items: [], total: 0, page: filters.page, pageSize: PAGE_SIZE },
    async () => {
      const res = await findNoticias(filters)
      const { pagination } = res.meta

      return {
        items: res.data.map(mapNoticia),
        total: pagination.total,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }
    }
  )
}

export async function getNoticiaBySlug(slug: string): Promise<Noticia | null> {
  return safe("getNoticiaBySlug", null, async () => {
    const entity = await findNoticiaBySlug(slug)
    return entity ? mapNoticia(entity) : null
  })
}

/** Fisher-Yates, sin mutar el arreglo recibido. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Noticias destacadas para incrustar en otras páginas (hoy: pie de
 * `/documentos`, vía `NoticiasDestacadas`): trae un pool de recientes y
 * muestrea `limit` al azar en cada vista, para que la sección no repita
 * siempre las mismas tarjetas.
 */
export async function getNoticiasDestacadas(limit = 3): Promise<Noticia[]> {
  return safe("getNoticiasDestacadas", [], async () => {
    const poolSize = Math.max(limit * 3, 9)
    const res = await findDestacadasPool(poolSize)
    return shuffle(res.data.map(mapNoticia)).slice(0, limit)
  })
}

/**
 * Las últimas `limit` NOTICIAS (tipo `noticia`, sin comunicados) por fecha de
 * publicación — el slider de la home. Deliberadamente no reutiliza
 * `getNoticias`: ese aplica el orden del listado (fijadas primero) y el
 * `PAGE_SIZE` del módulo, y aquí el criterio es solo "lo último publicado".
 */
export async function getUltimasNoticias(limit = 6): Promise<Noticia[]> {
  return safe("getUltimasNoticias", [], async () => {
    const res = await findUltimasPorTipo("noticia", limit)
    return res.data.map(mapNoticia)
  })
}

/**
 * Comunicado a destacar en la home. PROVISIONAL: hoy toma uno al azar de los
 * más recientes (mismo criterio "pool reciente + muestreo" de
 * `getNoticiasDestacadas`), porque todavía no hay forma de marcar cuál
 * destacar. Cuando el CMS gane ese campo — un booleano `destacado` en
 * `noticias`, o un single type "Home" que apunte a una entrada — esta función
 * es el ÚNICO punto que cambia: la firma (`Noticia | null`) ya es la
 * definitiva y `ComunicadoDestacado` no se entera.
 */
export async function getComunicadoDestacado(): Promise<Noticia | null> {
  return safe("getComunicadoDestacado", null, async () => {
    const res = await findUltimasPorTipo("comunicado", 6)
    return shuffle(res.data.map(mapNoticia))[0] ?? null
  })
}

export async function getRelatedNoticias(
  slug: string,
  limit = 3
): Promise<Noticia[]> {
  return safe("getRelatedNoticias", [], async () => {
    const current = await findNoticiaBySlug(slug)
    if (!current) return []

    const res = await findRelated({
      slug,
      category: current.categoria?.name ?? "",
      zona: (current.zona?.code ?? "nacional") as ZonaId,
      limit,
    })

    return res.data.map(mapNoticia)
  })
}

export async function getZonaCounts(
  tipo: NoticiaTipo | "all"
): Promise<Record<ZonaId | "all", number>> {
  const zeroCounts = ZONAS.reduce(
    (acc, z) => {
      acc[z.id] = 0
      return acc
    },
    { all: 0 } as Record<ZonaId | "all", number>
  )

  return safe("getZonaCounts", zeroCounts, async () => {
    const rows = await findFacetRows({ tipo })

    const counts = ZONAS.reduce(
      (acc, z) => {
        acc[z.id] = rows.filter((r) => r.zonaCode === z.id).length
        return acc
      },
      {} as Record<ZonaId, number>
    )

    return { all: rows.length, ...counts }
  })
}

export async function getTipoCounts(
  zona: ZonaId | "all"
): Promise<Record<NoticiaTipo | "all", number>> {
  return safe(
    "getTipoCounts",
    { all: 0, noticia: 0, comunicado: 0 },
    async () => {
      const rows = await findFacetRows({ zona })

      return {
        all: rows.length,
        noticia: rows.filter((r) => r.tipo === "noticia").length,
        comunicado: rows.filter((r) => r.tipo === "comunicado").length,
      }
    }
  )
}
