import "server-only"

import { STRAPI_API_BASE, strapiConfig } from "./config"
import { buildStrapiQuery } from "./query"
import type {
  StrapiListResponse,
  StrapiRequestParams,
  StrapiSingleResponse,
} from "./types"

/** Opciones de caché de Next para una petición. */
export interface StrapiFetchInit {
  /** Segundos de revalidación (default 60, alineado al `staleTime` de TanStack Query). */
  revalidate?: number
  /** Tags para `revalidateTag(...)` desde Server Actions. */
  tags?: string[]
}

async function strapiFetch<T>(
  collection: string,
  params: StrapiRequestParams | undefined,
  init: StrapiFetchInit | undefined
): Promise<T> {
  const query = buildStrapiQuery(params)
  const url = query
    ? `${STRAPI_API_BASE}/${collection}?${query}`
    : `${STRAPI_API_BASE}/${collection}`

  const headers: Record<string, string> = {}
  // El token es opcional: la lectura pública ya está habilitada en el rol
  // `Public`. Solo se envía si está configurado (p. ej. token read-only en prod).
  if (strapiConfig.token) {
    headers.Authorization = `Bearer ${strapiConfig.token}`
  }

  const res = await fetch(url, {
    headers,
    next: {
      revalidate: init?.revalidate ?? 60,
      tags: init?.tags,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `Strapi ${res.status} ${res.statusText} en GET /${collection}: ${body.slice(0, 500)}`
    )
  }

  return res.json() as Promise<T>
}

/**
 * Lee una colección de Strapi (`find`). Genérico: cualquier módulo pasa su
 * nombre de colección, parámetros y opciones de caché.
 */
export function strapiFindMany<T>(
  collection: string,
  params?: StrapiRequestParams,
  init?: StrapiFetchInit
): Promise<StrapiListResponse<T>> {
  return strapiFetch<StrapiListResponse<T>>(collection, params, init)
}

/**
 * Lee una entrada única de Strapi por `documentId` (`findOne`). Para buscar
 * por otro campo (p. ej. `slug`), usar `strapiFindMany` con `filters` y tomar
 * el primer resultado.
 */
export function strapiFindOne<T>(
  collection: string,
  documentId: string,
  params?: StrapiRequestParams,
  init?: StrapiFetchInit
): Promise<StrapiSingleResponse<T>> {
  return strapiFetch<StrapiSingleResponse<T>>(
    `${collection}/${documentId}`,
    params,
    init
  )
}
