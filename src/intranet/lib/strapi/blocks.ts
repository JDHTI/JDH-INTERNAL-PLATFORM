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

/** Nodo de texto dentro de un bloque de Strapi (Rich Text Blocks). */
interface StrapiTextNode {
  type: "text"
  text: string
}

/** Nodo de lista (`list-item`) dentro de un bloque `list`. */
interface StrapiListItemNode {
  type: "list-item"
  children: StrapiTextNode[]
}

/** Un bloque del campo Blocks tal como lo entrega Strapi. */
export interface StrapiBlock {
  type: string
  level?: number
  format?: string
  children: Array<StrapiTextNode | StrapiListItemNode>
}

/**
 * Minimal rich-text block union modeling Strapi's Blocks field: a paragraph,
 * heading, quote, or list. Rendering through this shape (instead of raw HTML
 * or a markdown string) keeps the article body swappable for Strapi's native
 * Blocks output without touching `ArticleBody` (see `.claude/STRAPI.md`).
 */
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }

/** Concatena el texto de los nodos hijo de un bloque. */
function joinText(
  children: Array<StrapiTextNode | StrapiListItemNode>
): string {
  return children
    .map((child) => ("text" in child ? child.text : joinText(child.children)))
    .join("")
}

/**
 * Convierte los bloques nativos de Strapi (Rich Text Blocks) al union del
 * dominio `ArticleBlock`. Los tipos no soportados se omiten.
 */
export function mapBlocks(
  blocks: StrapiBlock[] | null | undefined
): ArticleBlock[] {
  if (!blocks) return []

  const result: ArticleBlock[] = []
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        result.push({ type: "paragraph", text: joinText(block.children) })
        break
      case "heading":
        // Strapi trae `level`; el dominio no lo distingue.
        result.push({ type: "heading", text: joinText(block.children) })
        break
      case "quote":
        result.push({ type: "quote", text: joinText(block.children) })
        break
      case "list":
        result.push({
          type: "list",
          items: block.children.map((item) =>
            "children" in item ? joinText(item.children) : ""
          ),
        })
        break
      // otros tipos (image, code, ...) no se renderizan en este módulo → se omiten
    }
  }
  return result
}
