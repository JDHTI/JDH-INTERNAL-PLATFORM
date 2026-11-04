import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type { StrapiListResponse } from "@/intranet/lib/strapi"

import type { StrapiContenidoSemanal } from "./contenido-semanal.mapper"

/**
 * SEAM STRAPI — acceso a datos server-only del bloque "contenido semanal" de
 * la home. Mismo patrón que `strapi-eventos.service.ts`: constantes de
 * colección/orden/tag a nivel de módulo, y la función devuelve la respuesta
 * CRUDA de Strapi (`StrapiListResponse<StrapiContenidoSemanal>`), sin mapear
 * — el mapeo a dominio vive en `queries.ts`.
 */
const COLLECTION = "contenidos-semanales" // pluralName del content-type
const CACHE_TAG = "contenido-semanal"

/**
 * La entrada vigente: la de `fechaPublicacion` más reciente que ya pasó
 * (`<= hoy`), no la última creada — un editor puede programar la del mes
 * siguiente con antelación sin que se muestre antes de tiempo.
 */
export function findContenidoSemanalVigente(
  hoy: string
): Promise<StrapiListResponse<StrapiContenidoSemanal>> {
  return strapiFindMany<StrapiContenidoSemanal>(
    COLLECTION,
    {
      filters: { fechaPublicacion: { $lte: hoy } },
      sort: ["fechaPublicacion:desc"],
      pagination: { pageSize: 1 },
      // Los componentes NO llegan por defecto en Strapi 5, igual que
      // relaciones/media — `secciones` necesita `populate` explícito.
      populate: ["image", "secciones"],
    },
    { tags: [CACHE_TAG] }
  )
}
