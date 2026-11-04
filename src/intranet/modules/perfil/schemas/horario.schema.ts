import { z } from "zod"

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Valida cada franja del editor de "Horarios de contacto" antes de guardar.
 * Mismas reglas que `GuardarHorarioContactoDto` + `validarFranjas` en
 * INTRANET-JDH-API (`src/modules/horarios-contacto`) — la API las vuelve a
 * aplicar; esto solo evita el viaje para errores obvios.
 */
export const franjaHorarioSchema = z
  .object({
    dia: z.enum([
      "LUNES",
      "MARTES",
      "MIERCOLES",
      "JUEVES",
      "VIERNES",
      "SABADO",
      "DOMINGO",
    ]),
    inicio: z.string().regex(HORA, "Indica la hora de inicio."),
    fin: z.string().regex(HORA, "Indica la hora de fin."),
  })
  .refine((franja) => franja.fin > franja.inicio, {
    message: "Cada franja debe terminar después de empezar.",
    path: ["fin"],
  })

/** Lista vacía es válida: deja a la persona sin horario propio (el directorio muestra el corporativo). */
export const franjaHorarioListSchema = z
  .array(franjaHorarioSchema)
  .max(28, "Máximo 28 franjas.")
  .superRefine((franjas, ctx) => {
    const ordenadas = [...franjas].sort((a, b) =>
      a.dia === b.dia
        ? a.inicio.localeCompare(b.inicio)
        : a.dia.localeCompare(b.dia)
    )
    for (let i = 1; i < ordenadas.length; i++) {
      const prev = ordenadas[i - 1]
      const curr = ordenadas[i]
      if (prev.dia === curr.dia && curr.inicio < prev.fin) {
        ctx.addIssue({
          code: "custom",
          message: "Hay franjas que se cruzan el mismo día.",
        })
        return
      }
    }
  })

export type FranjaHorarioInput = z.infer<typeof franjaHorarioSchema>
