import { strapiMediaUrl } from "@/intranet/lib/strapi"
import type { StrapiEntity, StrapiMedia } from "@/intranet/lib/strapi"

import type { Quinquenio } from "../types"

/**
 * Entidad `quinquenio` cruda de Strapi (forma plana v5). Mismo patrón que
 * `contenido-semanal.mapper.ts`: la interfaz cruda vive junto al mapper, no
 * en `types.ts`.
 */
export interface StrapiQuinquenio extends StrapiEntity {
  title: string
  image: StrapiMedia | null
  orden: number | null
}

/**
 * `image` devuelve `null` si `strapiMediaUrl` no resuelve nada (media
 * borrada del CMS pero la entrada sigue publicada) — el componente filtra
 * esas entradas, ver `getQuinquenios`.
 */
export function mapQuinquenio(entity: StrapiQuinquenio): Quinquenio {
  return {
    id: entity.documentId,
    title: entity.title,
    image: strapiMediaUrl(entity.image, "medium") ?? "",
    orden: entity.orden,
  }
}
