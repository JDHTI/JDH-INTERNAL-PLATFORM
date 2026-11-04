"use server"

import { noticiaInputSchema } from "../schemas/noticia.schema"

/**
 * Server Action skeleton for creating a noticia.
 *
 * Per the clerk-nextjs-patterns skill: Server Actions are public endpoints,
 * so a real implementation MUST verify auth + permission at the very top,
 * before doing any work:
 *
 *   const user = await requireUser()
 *   if (!(await hasPermissions([PERMISSIONS.noticias.manage]))) throw ...
 *
 * ...then validate input, persist, and `revalidateTag('noticias')`.
 */
export async function createNoticia(input: unknown) {
  const _data = noticiaInputSchema.parse(input)
  // TODO: auth + permission check, persist via CMS, revalidate.
  throw new Error("createNoticia: not implemented")
}

/**
 * Registra la confirmación de lectura de un comunicado obligatorio. Mock por
 * ahora (no persiste) — la implementación real debe, en este orden: verificar
 * auth, registrar `{ userId, slug, confirmedAt }` en el CMS/DB, y revalidar
 * la ruta de detalle para reflejar el estado de confirmación.
 */
export async function confirmarLectura(_slug: string) {
  // TODO: auth check, persist confirmation via CMS, revalidate.
  return { confirmed: true }
}
