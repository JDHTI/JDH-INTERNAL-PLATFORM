/**
 * Tipos genéricos del contrato REST de Strapi 5. La respuesta v5 es **plana**:
 * los campos van directamente sobre la entidad (no hay envoltorio
 * `attributes` como en v4). Reutilizables por cualquier módulo.
 */

/** Campos base que Strapi agrega a toda entidad. */
export interface StrapiEntity {
  id: number
  documentId: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

/** Respuesta de una colección (`find`). */
export interface StrapiListResponse<T> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/** Respuesta de una entrada única (`findOne`, o `find` con un solo match). */
export interface StrapiSingleResponse<T> {
  data: T | null
  meta: Record<string, unknown>
}

/** Variante de tamaño de una imagen en la Media Library. */
export interface StrapiMediaFormat {
  url: string
  width: number
  height: number
}

export type StrapiMediaFormatName = "thumbnail" | "small" | "medium" | "large"

/**
 * Campo de tipo Media poblado. `width`/`height` son `null` para media
 * no-imagen (PDF, docx, ...) — Strapi no calcula dimensiones para esos
 * archivos, así que la firma admite ambos casos en vez de mentir con `number`.
 */
export interface StrapiMedia {
  url: string
  alternativeText: string | null
  width: number | null
  height: number | null
  /** Nombre del archivo tal como quedó en la Media Library, con extensión. */
  name?: string
  /** Extensión CON punto (p. ej. ".pdf"). */
  ext?: string | null
  mime?: string
  /** Tamaño en KILOBYTES (float), NO en bytes — así lo reporta Strapi. */
  size?: number
  formats?: Partial<Record<StrapiMediaFormatName, StrapiMediaFormat>>
}

/**
 * Eventos del ciclo de vida de contenido que Strapi puede emitir a un webhook.
 * Se marcan todos en el panel del CMS: cualquiera de ellos cambia lo que ve
 * (o deja de ver) el usuario final.
 */
export type StrapiWebhookEvent =
  | "entry.create"
  | "entry.update"
  | "entry.delete"
  | "entry.publish"
  | "entry.unpublish"

/**
 * Payload que Strapi envía a un webhook. Se tipan solo los campos que el
 * receptor usa — `entry` llega completo pero no lo tocamos, porque la
 * invalidación es por colección (tag), no por entrada.
 */
export interface StrapiWebhookPayload {
  event: StrapiWebhookEvent
  /** UID del content-type, en singular (p. ej. `noticia`). */
  model: string
  createdAt?: string
}

/**
 * Parámetros de una petición a la REST API. Se serializan a query string con
 * `buildStrapiQuery` (ver `./query`). Los valores anidados (`filters`,
 * `populate` como objeto) se traducen a la notación de brackets de Strapi.
 */
export interface StrapiRequestParams {
  filters?: Record<string, unknown>
  sort?: string | string[]
  populate?: string | string[] | Record<string, unknown>
  fields?: string[]
  pagination?: {
    page?: number
    pageSize?: number
    withCount?: boolean
  }
}
