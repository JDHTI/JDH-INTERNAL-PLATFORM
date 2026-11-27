import { COVER_PLACEHOLDER } from "../noticias.config"
import type { ArticleBlock, Noticia, ZonaId } from "../types"
import { mapBlocks, strapiMediaUrl } from "@/intranet/lib/strapi"
import type { StrapiBlock, StrapiEntity, StrapiMedia } from "@/intranet/lib/strapi"

/**
 * Entidad `Noticia` cruda de Strapi (forma plana v5) con sus relaciones
 * pobladas. Es la entrada del mapper; el resto de la app solo ve el tipo de
 * dominio `Noticia`.
 */
export interface StrapiNoticia extends StrapiEntity {
  title: string
  slug: string
  excerpt: string | null
  body: StrapiBlock[] | null
  tipo: "noticia" | "comunicado"
  mandatory: boolean
  pinned: boolean
  readingTimeMin: number | null
  area?: { name: string } | null
  categoria?: { name: string } | null
  zona?: { code: string } | null
  tags?: Array<{ name: string }> | null
  coverImage?: StrapiMedia | null
}

/** Estimación de tiempo de lectura (≈200 palabras/min, mínimo 1). */
function estimateReadingTime(body: ArticleBlock[]): number {
  const words = body.reduce((acc, block) => {
    if (block.type === "image") return acc
    const text = block.type === "list" ? block.items.join(" ") : block.text
    return acc + text.trim().split(/\s+/).filter(Boolean).length
  }, 0)
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Mapea una entidad `StrapiNoticia` al tipo de dominio `Noticia`. Aquí viven
 * los deltas dominio↔Strapi: `author`←`area.name`, `category`←`categoria.name`,
 * `zona`←`zona.code`, `tags`←`tag.name`, `coverImage` absolutizado.
 */
export function mapNoticia(entity: StrapiNoticia): Noticia {
  const body = mapBlocks(entity.body)

  return {
    id: entity.documentId,
    title: entity.title,
    slug: entity.slug,
    excerpt: entity.excerpt ?? "",
    body,
    publishedAt: entity.publishedAt ?? entity.createdAt,
    author: entity.area?.name ?? "",
    pinned: entity.pinned,
    tipo: entity.tipo,
    zona: (entity.zona?.code ?? "nacional") as ZonaId,
    category: entity.categoria?.name ?? "",
    coverImage:
      strapiMediaUrl(entity.coverImage, "medium") ?? COVER_PLACEHOLDER,
    readingTimeMin: entity.readingTimeMin ?? estimateReadingTime(body),
    tags: entity.tags?.map((tag) => tag.name) ?? [],
    mandatory: entity.mandatory,
  }
}
