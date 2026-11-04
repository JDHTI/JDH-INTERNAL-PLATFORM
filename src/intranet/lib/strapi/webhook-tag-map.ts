import "server-only"

/**
 * Mapa `modelo de Strapi` → `tags de caché de Next` a invalidar cuando ese
 * modelo cambia en el CMS.
 *
 * Existe porque el UID del content-type en Strapi y el tag de caché del módulo
 * **no coinciden necesariamente**: hoy la colección es `noticia` (singular, ver
 * `INTRANET-JDH-CMS/src/api/noticia/`) mientras que el tag usado por
 * `strapi-noticias.service.ts` es `noticias` (plural). Asumir una convención
 * 1:1 rompería silenciosamente la invalidación.
 *
 * El valor es un array porque un mismo modelo puede alimentar más de un tag
 * (p. ej. si un módulo futuro cachea listado y agregados bajo tags distintos).
 *
 * **Al integrar un módulo nuevo con el CMS, añade su entrada aquí** — es el
 * único cambio necesario del lado Next; el endpoint `/api/revalidate` es
 * genérico y no se toca.
 */
const WEBHOOK_TAG_MAP: Record<string, readonly string[]> = {
  noticia: ["noticias"],
  documento: ["documentos"],
  "categoria-documento": ["documentos"],
  // `area` alimenta ambos módulos: renombrar un área cambia la columna
  // "Área" de la tabla de documentos Y el autor de las noticias. Es el caso
  // que justifica que el valor del mapa sea un array.
  area: ["noticias", "documentos"],
  "contenido-semanal": ["contenido-semanal"],
  "frase-motivacional": ["frases-motivacionales"],
  quinquenio: ["quinquenios"],
}

/**
 * Tags a invalidar para un modelo, o `undefined` si el modelo no está mapeado.
 *
 * `undefined` es un resultado esperado, no un error: Strapi emite eventos para
 * content-types que no alimentan ninguna vista cacheada (taxonomías internas,
 * entidades del admin), y el receptor los trata como no-op.
 */
export function resolveTagsForModel(
  model: string
): readonly string[] | undefined {
  return WEBHOOK_TAG_MAP[model]
}
