import type { StrapiEntity } from "@/intranet/lib/strapi"

import type { FraseMotivacional } from "../types"

/**
 * Entidad `frase-motivacional` cruda de Strapi (forma plana v5). Es la
 * entrada del mapper; el resto de la app solo ve el tipo de dominio
 * `FraseMotivacional`. Mismo patrón que `evento.mapper.ts`.
 */
export interface StrapiFraseMotivacional extends StrapiEntity {
  texto: string
}

export function mapFraseMotivacional(
  entity: StrapiFraseMotivacional
): FraseMotivacional {
  return {
    id: entity.documentId,
    texto: entity.texto,
  }
}
