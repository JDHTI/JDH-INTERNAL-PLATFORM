import Link from "next/link"
import type { ReactNode } from "react"

import type { ArticleBlock, ArticleInline } from "@/intranet/lib/strapi"
import { cn } from "@/intranet/lib/utils"

const LINK_CLASS =
  "rounded-sm font-medium text-foreground underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** Texto con marcas y enlaces. Los internos navegan sin recargar; los externos abren pestaña nueva. */
function Inlines({ inlines }: { inlines: ArticleInline[] }) {
  return inlines.map((inline, index) => {
    if (inline.type === "link") {
      if (inline.url.startsWith("/")) {
        return (
          <Link key={index} href={inline.url} className={LINK_CLASS}>
            {inline.text}
          </Link>
        )
      }
      const external = /^https?:/i.test(inline.url)
      return (
        <a
          key={index}
          href={inline.url}
          className={LINK_CLASS}
          {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        >
          {inline.text}
        </a>
      )
    }

    let node: ReactNode = inline.text
    if (inline.code)
      node = (
        <code className="rounded-sm bg-muted px-1 font-mono text-[0.9em]">
          {node}
        </code>
      )
    if (inline.bold)
      node = <strong className="font-semibold text-foreground">{node}</strong>
    if (inline.italic) node = <em>{node}</em>
    if (inline.underline) node = <u>{node}</u>
    if (inline.strikethrough) node = <s>{node}</s>
    return <span key={index}>{node}</span>
  })
}

/**
 * Renderiza el union `ArticleBlock` (párrafo, títulos, cita con borde
 * izquierdo, listas e imágenes) que produce `mapBlocks` en
 * `@/intranet/lib/strapi/blocks`. Vivía en `modules/noticias/components/`; se
 * movió aquí (compartido) porque `modules/inicio` (contenido semanal) y
 * `modules/sig` (páginas de lectura) también lo necesitan.
 *
 * `size`: `"article"` (default) conserva la tipografía de la vista de detalle
 * de noticias (`text-lg`, `max-w-[68ch]`, `gap-6`). `"compact"` es para
 * bloques más pequeños de la home (texto semanal): `text-base`, `gap-4`, sin
 * `max-w` propio (el contenedor ya limita el ancho).
 */
export function ArticleBody({
  blocks,
  size = "article",
  className,
}: {
  blocks: ArticleBlock[]
  size?: "article" | "compact"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col text-muted-foreground",
        size === "article" && "mt-8 max-w-[68ch] gap-6 text-lg leading-relaxed",
        size === "compact" && "gap-4 text-base leading-relaxed",
        className
      )}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={index}>
                <Inlines inlines={block.inlines} />
              </p>
            )
          case "heading":
            return block.level >= 3 ? (
              <h3
                key={index}
                className="text-lg leading-snug font-bold text-foreground"
              >
                <Inlines inlines={block.inlines} />
              </h3>
            ) : (
              <h2
                key={index}
                className="text-xl leading-snug font-bold text-foreground"
              >
                <Inlines inlines={block.inlines} />
              </h2>
            )
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-foreground pl-6 text-xl leading-snug font-medium text-foreground italic"
              >
                &ldquo;
                <Inlines inlines={block.inlines} />
                &rdquo;
              </blockquote>
            )
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul"
            return (
              <ListTag
                key={index}
                className={cn(
                  "flex flex-col gap-3 pl-6 marker:text-muted-foreground",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
              >
                {block.itemInlines.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inlines inlines={item} />
                  </li>
                ))}
              </ListTag>
            )
          }
          case "image":
            return (
              <figure key={index}>
                {/* eslint-disable-next-line @next/next/no-img-element -- next.config.ts declares no remotePatterns for the CMS host */}
                <img
                  src={block.src}
                  alt={block.alt}
                  width={block.width ?? undefined}
                  height={block.height ?? undefined}
                  loading="lazy"
                  className="h-auto w-full rounded-[var(--jdh-radius-md)] border border-border bg-muted"
                />
              </figure>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
