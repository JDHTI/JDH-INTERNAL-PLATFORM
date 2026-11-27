import { z } from "zod"

import { SIG_COMPONENTES } from "../sig.config"

const componenteValues = SIG_COMPONENTES.map((c) => c.value) as [
  (typeof SIG_COMPONENTES)[number]["value"],
  ...(typeof SIG_COMPONENTES)[number]["value"][],
]

/**
 * Parses listing filters out of `searchParams` (?categoria=&componente=&q=&page=).
 * Every field falls back to a safe default via `.catch()`, igual que
 * `noticiaFiltersSchema` — una URL manipulada nunca rompe la página.
 *
 * `categoria` valida como slug libre, no como `z.enum(...)`: el catálogo de
 * categorías vive en el CMS y es editable sin desplegar. Un slug desconocido
 * simplemente no matchea ningún documento (cero resultados).
 *
 * `componente` sí es un enum: los cuatro componentes del SIG son fijos en
 * código (`sig.config.ts`), así que un valor desconocido cae a "all".
 */
export const documentoFiltersSchema = z.object({
  categoria: z.string().trim().catch("all"),
  componente: z.enum(componenteValues).or(z.literal("all")).catch("all"),
  q: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
})

export type DocumentoFiltersInput = z.infer<typeof documentoFiltersSchema>
