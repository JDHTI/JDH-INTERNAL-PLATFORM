import "server-only"

import { strapiFindMany } from "@/intranet/lib/strapi"
import type { StrapiListResponse } from "@/intranet/lib/strapi"

import type { StrapiFraseMotivacional } from "./frase-motivacional.mapper"

/**
 * SEAM STRAPI — acceso a datos server-only del pool de frases motivacionales.
 * Mismo patrón que `strapi-eventos.service.ts`: constantes de
 * colección/tag a nivel de módulo, devuelve la respuesta CRUDA de Strapi.
 */
const COLLECTION = "frases-motivacionales" // pluralName del content-type
const CACHE_TAG = "frases-motivacionales"
/** Techo de página del CMS (`config/api.ts`: `maxLimit: 100`) — el pool completo cabe holgado en una sola página. */
const MAX_PAGE_SIZE = 100

/** Todo el pool activo — la elección al azar la hace `getFraseMotivacional`, no esta consulta. */
export function findFrasesMotivacionales(): Promise<
  StrapiListResponse<StrapiFraseMotivacional>
> {
  return strapiFindMany<StrapiFraseMotivacional>(
    COLLECTION,
    { pagination: { pageSize: MAX_PAGE_SIZE } },
    { tags: [CACHE_TAG] }
  )
}
