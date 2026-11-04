import { z } from "zod"

/** Valida el formulario de "Contacto y sede" antes de guardarlo. */
export const contactoDirectoSchema = z.object({
  /** Vacío = no cambia la sede (quien sigue sin sede puede guardar solo su contacto). */
  sedeId: z.string().trim().optional().default(""),
  telefono: z.string().trim().max(20).optional().default(""),
  celular: z.string().trim().min(1, "Indica tu celular.").max(20),
  celularVisible: z.boolean(),
})

export type ContactoDirectoInput = z.infer<typeof contactoDirectoSchema>
