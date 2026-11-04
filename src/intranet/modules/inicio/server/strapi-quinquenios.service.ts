import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type { StrapiListResponse } from "@/intranet/lib/strapi"

import type { StrapiQuinquenio } from "./quinquenio.mapper"

/**
 * SEAM STRAPI — acceso a datos server-only del carrusel de "quinquenios" de
 * la home. Mismo patrón que `strapi-contenido-semanal.service.ts`: constantes
 * de colección/orden/tag a nivel de módulo, y la función devuelve la
 * respuesta CRUDA de Strapi, sin mapear — el mapeo a dominio vive en
 * `queries.ts`.
 */
const COLLECTION = "quinquenios" // pluralName del content-type
const CACHE_TAG = "quinquenios"

/**
 * `orden:asc` primero (criterio editorial explícito), `createdAt:desc` como
 * desempate para entradas sin `orden` — más recientes primero en vez de un
 * orden arbitrario de base de datos.
 */
export function findQuinquenios(
  limit: number
): Promise<StrapiListResponse<StrapiQuinquenio>> {
  return strapiFindMany<StrapiQuinquenio>(
    COLLECTION,
    {
      sort: ["orden:asc", "createdAt:desc"],
      pagination: { pageSize: limit },
      // La media NO llega por defecto en Strapi 5 — `image` necesita populate explícito.
      populate: ["image"],
    },
    { tags: [CACHE_TAG] }
  )
}
