import { z } from "zod"

import { SEDE_ALL } from "../directorio.config"

/**
 * Parsea filtros de `searchParams` (?q=&sede=&page=). Cada campo cae a un
 * default seguro vía `.catch()`, igual que `documentoFiltersSchema` — una URL
 * manipulada nunca rompe la página.
 *
 * `sede` valida como slug libre, no `z.enum(...)`: el catálogo de sedes lo
 * traerá la API cuando exista, así que no hay un conjunto cerrado contra el
 * cual validar en build time. Un slug desconocido simplemente no matchea
 * ningún empleado (cero resultados) en vez de caer a "all".
 */
export const empleadoFiltersSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  sede: z.string().trim().catch(SEDE_ALL),
  page: z.coerce.number().int().min(1).catch(1),
})

export type EmpleadoFiltersInput = z.infer<typeof empleadoFiltersSchema>
