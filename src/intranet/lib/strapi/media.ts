import { strapiConfig } from "./config"
import type { StrapiMedia, StrapiMediaFormatName } from "./types"

/**
 * Resuelve la URL **absoluta** de un campo Media de Strapi, prefiriendo una
 * variante de tamaño y cayendo a la original si no existe. Strapi entrega la
 * `url` relativa (`/uploads/...`); se le antepone `strapiConfig.publicUrl`
 * (la base que ve el navegador, ver `config.ts`) para que pueda cargarla.
 *
 * Devuelve `null` si no hay media (el consumidor decide el fallback).
 */
export function strapiMediaUrl(
  media: StrapiMedia | null | undefined,
  format: StrapiMediaFormatName = "medium"
): string | null {
  if (!media) return null

  const relativeUrl = media.formats?.[format]?.url ?? media.url
  if (!relativeUrl) return null

  // Si ya es absoluta (p. ej. provider externo como S3/Cloudinary), se usa tal cual.
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl

  return `${strapiConfig.publicUrl}${relativeUrl}`
}
