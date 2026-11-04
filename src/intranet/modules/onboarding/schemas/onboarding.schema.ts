import { z } from "zod"

/** Sección de contacto — solo se valida si la persona no tiene celular. */
export const contactoSchema = z.object({
  mobilePhone: z.string().trim().min(1, "Indica tu celular.").max(20),
  landlinePhone: z.string().trim().max(20).optional().default(""),
})

/** Sección de sede — solo se valida si la persona no tiene sede. */
export const sedeSchema = z.object({
  siteId: z.string().trim().min(1, "Selecciona tu sede."),
})
