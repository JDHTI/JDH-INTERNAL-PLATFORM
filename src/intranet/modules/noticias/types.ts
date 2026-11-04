import type { ArticleBlock } from "@/intranet/lib/strapi"

/** Domain types for the noticias module. */

/**
 * Re-exportado tal cual desde `@/lib/strapi/blocks` (promovido allí porque
 * `modules/inicio` también lo necesita) para no romper importadores
 * existentes de `ArticleBlock` desde este módulo.
 */
export type { ArticleBlock }

export type NoticiaTipo = "noticia" | "comunicado"

export type ZonaId =
  | "nacional"
  | "medellin"
  | "bogota"
  | "armenia"
  | "bucaramanga"
  | "uraba"
  | "cartagena"
  | "barranquilla"

export interface Zona {
  id: ZonaId
  label: string
}

export interface Noticia {
  id: string
  title: string
  slug: string
  excerpt: string
  body: ArticleBlock[]
  /** ISO 8601 timestamp. */
  publishedAt: string
  author: string
  pinned: boolean
  tipo: NoticiaTipo
  zona: ZonaId
  /** Editorial taxonomy, e.g. "Operación", "Seguridad", "Bienestar". */
  category: string
  coverImage: string
  readingTimeMin: number
  tags: string[]
  /** Comunicado obligatorio: requires read confirmation on the detail page. */
  mandatory: boolean
}

export interface NoticiaFilters {
  tipo: NoticiaTipo | "all"
  zona: ZonaId | "all"
  page: number
}

export interface NoticiasPage {
  items: Noticia[]
  total: number
  page: number
  pageSize: number
}
