import { z } from "zod"

/**
 * Parses listing filters out of `searchParams` (?categoria=&q=&page=). Every
 * field falls back to a safe default via `.catch()`, igual que
 * `noticiaFiltersSchema` — una URL manipulada nunca rompe la página.
 *
 * `categoria` valida como slug libre, no como `z.enum(...)`: el catálogo de
 * categorías vive en el CMS y es editable sin desplegar, así que no hay un
 * conjunto cerrado de valores contra el cual validar en build time. Un slug
 * desconocido simplemente no matchea ningún documento (cero resultados), en
 * vez de caer a "all" como pasaría con un enum — asimetría aceptada, ver
 * `.claude/STRAPI.md` § Módulo: documentos.
 */
export const documentoFiltersSchema = z.object({
  categoria: z.string().trim().catch("all"),
  q: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
})

export type DocumentoFiltersInput = z.infer<typeof documentoFiltersSchema>
