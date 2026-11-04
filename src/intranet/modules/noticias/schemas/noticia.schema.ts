import { z } from "zod"

/** Must mirror `NoticiaTipo` / `ZonaId` in `../types.ts`. */
const noticiaTipoValues = ["noticia", "comunicado"] as const
const zonaIdValues = [
  "nacional",
  "medellin",
  "bogota",
  "armenia",
  "bucaramanga",
  "uraba",
  "cartagena",
  "barranquilla",
] as const

const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ type: z.literal("heading"), text: z.string().min(1) }),
  z.object({ type: z.literal("quote"), text: z.string().min(1) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1)) }),
])

/**
 * Validation schema for creating/editing a noticia. Shared by the client
 * (form validation) and the server (Server Action input parsing) so both
 * sides enforce the same contract.
 */
export const noticiaInputSchema = z.object({
  title: z.string().min(3).max(160),
  excerpt: z.string().max(280).optional(),
  body: z.array(articleBlockSchema).min(1),
  pinned: z.boolean().default(false),
  tipo: z.enum(noticiaTipoValues),
  zona: z.enum(zonaIdValues),
  category: z.string().min(1).max(60),
  coverImage: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  mandatory: z.boolean().default(false),
})

export type NoticiaInput = z.infer<typeof noticiaInputSchema>

/**
 * Parses listing filters out of `searchParams` (?tipo=&zona=&page=). Every
 * field falls back to a safe default via `.catch()` so a hand-edited or
 * stale URL never breaks the page — it just resets to "todas/todos".
 */
export const noticiaFiltersSchema = z.object({
  tipo: z.enum(["all", ...noticiaTipoValues]).catch("all"),
  zona: z.enum(["all", ...zonaIdValues]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
})
