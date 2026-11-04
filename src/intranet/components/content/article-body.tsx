import type { ArticleBlock } from "@/intranet/lib/strapi"
import { cn } from "@/intranet/lib/utils"

/**
 * Renderiza el union `ArticleBlock` (párrafo, h2, cita con borde izquierdo,
 * lista) — mapea 1:1 el campo *Blocks* de Strapi (`mapBlocks` en
 * `@/lib/strapi/blocks`). Vivía en `modules/noticias/components/`; se movió
 * aquí (compartido) porque `modules/inicio` (contenido semanal) también lo
 * necesita — un componente compartido no puede importar internals de un
 * módulo, y viceversa un módulo no debería quedarse con el único renderer.
 *
 * `size`: `"article"` (default) conserva exactamente la tipografía original
 * de la vista de detalle de noticias (`text-lg`, `max-w-[68ch]`, `gap-6`) —
 * ningún consumidor existente cambia. `"compact"` es para bloques más
 * pequeños de la home (texto semanal): `text-base`, `gap-4`, sin `max-w`
 * propio (el contenedor ya limita el ancho).
 */
export function ArticleBody({
  blocks,
  size = "article",
}: {
  blocks: ArticleBlock[]
  size?: "article" | "compact"
}) {
  return (
    <div
      className={cn(
        "flex flex-col text-muted-foreground",
        size === "article" && "mt-8 max-w-[68ch] gap-6 text-lg leading-relaxed",
        size === "compact" && "gap-4 text-base leading-relaxed"
      )}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{block.text}</p>
          case "heading":
            return (
              <h2
                key={index}
                className="text-xl leading-snug font-bold text-foreground"
              >
                {block.text}
              </h2>
            )
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-foreground pl-6 text-xl leading-snug font-medium text-foreground italic"
              >
                &ldquo;{block.text}&rdquo;
              </blockquote>
            )
          case "list":
            return (
              <ul
                key={index}
                className="flex list-disc flex-col gap-3 pl-6 marker:text-muted-foreground"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
