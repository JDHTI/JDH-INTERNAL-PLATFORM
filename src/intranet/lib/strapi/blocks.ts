/**
 * Rich Text Blocks de Strapi 5 → union de dominio `ArticleBlock`. Vivía
 * originalmente en `modules/noticias` (único consumidor hasta ahora); se
 * promovió aquí porque `modules/inicio` (bloque de contenido semanal) también
 * lo necesita y un helper compartido no puede vivir dentro de un módulo
 * vertical. `noticias/types.ts` y `noticias/server/noticia.mapper.ts`
 * re-exportan estos mismos símbolos bajo los mismos nombres para no romper
 * nada — mismo patrón que la promoción de los helpers de fecha a
 * `src/lib/date.ts` (ver `.claude/ARCHITECTURE.md`, 2026-07-29).
 */

import { strapiConfig } from "./config"

/** Nodo de texto dentro de un bloque de Strapi (Rich Text Blocks). */
interface StrapiTextNode {
  type: "text"
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}

/** Enlace en línea: sus hijos son nodos de texto. */
interface StrapiLinkNode {
  type: "link"
  url: string
  children: StrapiTextNode[]
}

type StrapiInlineNode = StrapiTextNode | StrapiLinkNode

/** Nodo de lista (`list-item`) dentro de un bloque `list`. */
interface StrapiListItemNode {
  type: "list-item"
  children: StrapiInlineNode[]
}

/** Imagen tal como Strapi la guarda dentro del bloque `image`. */
interface StrapiBlockImage {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
}

/** Un bloque del campo Blocks tal como lo entrega Strapi. */
export interface StrapiBlock {
  type: string
  level?: number
  format?: string
  image?: StrapiBlockImage
  children: Array<StrapiInlineNode | StrapiListItemNode | StrapiBlock>
}

/** Texto con sus marcas, o un enlace con URL ya validada. */
export type ArticleInline =
  | {
      type: "text"
      text: string
      bold?: boolean
      italic?: boolean
      underline?: boolean
      strikethrough?: boolean
      code?: boolean
    }
  | { type: "link"; url: string; text: string }

/**
 * Minimal rich-text block union modeling Strapi's Blocks field. `text` and
 * `items` stay as plain strings for consumers that only count or preview words
 * (reading time); `inlines` / `itemInlines` carry marks and links for the
 * renderer. Rendering through this shape (instead of raw HTML or a markdown
 * string) keeps `ArticleBody` decoupled from Strapi's node format.
 */
export type ArticleBlock =
  | { type: "paragraph"; text: string; inlines: ArticleInline[] }
  | { type: "heading"; text: string; level: number; inlines: ArticleInline[] }
  | { type: "quote"; text: string; inlines: ArticleInline[] }
  | {
      type: "list"
      ordered: boolean
      items: string[]
      itemInlines: ArticleInline[][]
    }
  | {
      type: "image"
      src: string
      alt: string
      width: number | null
      height: number | null
    }

/**
 * Only these schemes become clickable: an editor pasting `javascript:` in the
 * CMS must not end up as an executable href in the intranet.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed
  return null
}

/**
 * Strapi stores the upload URL inside the block, relative (`/uploads/...`) or
 * absolute on the CMS host. The browser reaches uploads only through
 * `publicUrl` (`/cms/uploads/*` in production), so both are rebased onto it.
 */
function blockImageUrl(url: string): string {
  const match = url.match(/\/uploads\/.+$/)
  if (match) return `${strapiConfig.publicUrl}${match[0]}`
  if (/^https?:\/\//i.test(url)) return url
  return `${strapiConfig.publicUrl}${url}`
}

function mapInlines(children: StrapiInlineNode[]): ArticleInline[] {
  const result: ArticleInline[] = []
  for (const child of children) {
    if (child.type === "link") {
      const text = child.children.map((node) => node.text).join("")
      const href = safeHref(child.url)
      if (href) result.push({ type: "link", url: href, text })
      else result.push({ type: "text", text })
    } else if (child.type === "text") {
      const { type, text, bold, italic, underline, strikethrough, code } =
        child
      result.push({ type, text, bold, italic, underline, strikethrough, code })
    }
  }
  return result
}

function plainText(inlines: ArticleInline[]): string {
  return inlines.map((inline) => inline.text).join("")
}

/** List items, flattening nested lists (Strapi nests them as sibling `list` nodes). */
function listItems(block: StrapiBlock): ArticleInline[][] {
  const items: ArticleInline[][] = []
  for (const child of block.children) {
    if (child.type === "list-item") {
      items.push(mapInlines((child as StrapiListItemNode).children))
    } else if (child.type === "list") {
      items.push(...listItems(child as StrapiBlock))
    }
  }
  return items
}

/**
 * Convierte los bloques nativos de Strapi (Rich Text Blocks) al union del
 * dominio `ArticleBlock`. Los tipos no soportados (code, ...) se omiten.
 */
export function mapBlocks(
  blocks: StrapiBlock[] | null | undefined
): ArticleBlock[] {
  if (!blocks) return []

  const result: ArticleBlock[] = []
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "quote": {
        const inlines = mapInlines(block.children as StrapiInlineNode[])
        result.push({ type: block.type, text: plainText(inlines), inlines })
        break
      }
      case "heading": {
        const inlines = mapInlines(block.children as StrapiInlineNode[])
        result.push({
          type: "heading",
          text: plainText(inlines),
          level: block.level ?? 2,
          inlines,
        })
        break
      }
      case "list": {
        const itemInlines = listItems(block)
        result.push({
          type: "list",
          ordered: block.format === "ordered",
          items: itemInlines.map(plainText),
          itemInlines,
        })
        break
      }
      case "image":
        if (block.image?.url) {
          result.push({
            type: "image",
            src: blockImageUrl(block.image.url),
            alt: block.image.alternativeText ?? "",
            width: block.image.width ?? null,
            height: block.image.height ?? null,
          })
        }
        break
    }
  }
  return result
}
