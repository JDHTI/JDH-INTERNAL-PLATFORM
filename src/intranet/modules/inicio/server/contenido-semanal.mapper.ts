import { mapBlocks, strapiMediaUrl } from "@/intranet/lib/strapi"
import type { StrapiBlock, StrapiEntity, StrapiMedia } from "@/intranet/lib/strapi"

import type { ContenidoSemanal } from "../types"

/**
 * Entidad `contenido-semanal` cruda de Strapi (forma plana v5). Es la entrada
 * del mapper; el resto de la app solo ve el tipo de dominio `ContenidoSemanal`.
 * Mismo patrón que `evento.mapper.ts`: la interfaz cruda vive junto al mapper,
 * no en `types.ts`.
 */
/** Una entrada del componente repetible `contenido.seccion` — solo `texto` (Blocks), sin título propio. */
export interface StrapiSeccion {
  id: number
  texto: StrapiBlock[] | null
}

export interface StrapiContenidoSemanal extends StrapiEntity {
  title: string
  slug: string
  eyebrow: string | null
  secciones: StrapiSeccion[] | null
  image?: StrapiMedia | null
  /** ISO `YYYY-MM-DD`. */
  fechaPublicacion: string
}

export function mapContenidoSemanal(
  entity: StrapiContenidoSemanal
): ContenidoSemanal {
  return {
    id: entity.documentId,
    title: entity.title,
    eyebrow: entity.eyebrow ?? "",
    secciones: (entity.secciones ?? []).map((seccion) =>
      mapBlocks(seccion.texto)
    ),
    image: strapiMediaUrl(entity.image, "medium"),
    fechaPublicacion: entity.fechaPublicacion,
  }
}
