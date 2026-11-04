import type { Route } from "next"
import Link from "next/link"
import { Download, Printer, Share2 } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Tag } from "@/intranet/components/common/tag"
import { ContentBadge } from "@/intranet/components/common/content-badge"
import { ArticleBody } from "@/intranet/components/content/article-body"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { ReadConfirmation } from "./read-confirmation"
import { formatNoticiaDate, tipoLabel } from "../noticias.config"
import type { Noticia } from "../types"

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

/**
 * Plantilla genérica de detalle (§4 del diseño): sirve tanto para noticias
 * como para comunicados. El bloque de confirmación de lectura solo aparece
 * cuando `mandatory` lo requiere.
 */
export function NoticiaDetail({
  noticia,
  related,
}: {
  noticia: Noticia
  related: Noticia[]
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "Noticias y comunicados", href: "/noticias" },
          { label: noticia.title },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* ARTÍCULO */}
        <article className="min-w-0">
          <div className="mb-4 flex items-center gap-3">
            {noticia.mandatory ? <ContentBadge badge="obligatorio" /> : null}
            <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {tipoLabel(noticia.tipo)} · {noticia.category}
            </span>
          </div>

          <h1 className="max-w-[36ch] text-3xl leading-tight font-bold tracking-tight">
            {noticia.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-muted-foreground">
                {initials(noticia.author)}
              </span>
              <div>
                <p className="text-sm font-medium">{noticia.author}</p>
                <p className="text-xs text-muted-foreground">
                  Publicado el {formatNoticiaDate(noticia.publishedAt, "long")}{" "}
                  · {noticia.readingTimeMin} min de lectura
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <JdhButton
                variant="secondary"
                size="sm"
                disabled
                title="Disponible próximamente"
              >
                <Download />
                Descargar PDF
              </JdhButton>
              <JdhButton
                variant="secondary"
                size="icon-sm"
                disabled
                aria-label="Compartir"
                title="Disponible próximamente"
              >
                <Share2 />
              </JdhButton>
              <JdhButton
                variant="secondary"
                size="icon-sm"
                disabled
                aria-label="Imprimir"
                title="Disponible próximamente"
              >
                <Printer />
              </JdhButton>
            </div>
          </div>

          <div className="mt-8 h-[280px] overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={noticia.coverImage}
              alt={noticia.title}
              className="h-full w-full object-cover"
            />
          </div>

          <ArticleBody blocks={noticia.body} />

          {noticia.mandatory ? (
            <ReadConfirmation
              slug={noticia.slug}
              deadlineLabel="Confirma tu lectura de este comunicado"
            />
          ) : null}
        </article>

        {/* RAIL */}
        <div className="flex flex-col gap-8">
          {noticia.tags.length > 0 ? (
            <div>
              <p className="mb-3 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                Etiquetas
              </p>
              <div className="flex flex-wrap gap-2">
                {noticia.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
          ) : null}

          {/*
            Documentos relacionados: placeholder hasta que `documentos` tenga
            su propia capa de datos (`server/queries.ts`). Decidido: mismo
            criterio automático que `getRelatedNoticias` — categoría o zona
            compartida con esta noticia, no relación manual del editor. Se
            implementa como parte de esa capa, no aquí; ver `.claude/STRAPI.md`.
          */}
          <div className="rounded-[var(--jdh-radius-md)] border border-border p-6">
            <h2 className="mb-4 text-xl font-bold">Documentos relacionados</h2>
            <p className="text-sm text-muted-foreground">
              Aún no hay documentos vinculados a este contenido.
            </p>
          </div>

          {related.length > 0 ? (
            <div className="rounded-[var(--jdh-radius-md)] border border-border p-6">
              <h2 className="mb-4 text-xl font-bold">Noticias relacionadas</h2>
              <div className="flex flex-col gap-4">
                {related.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 ? <div className="mb-4 h-px bg-border" /> : null}
                    <Link
                      href={`/noticias/${item.slug}` as Route}
                      className="block text-foreground hover:text-muted-foreground"
                    >
                      <p className="text-sm leading-snug font-medium">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.category} · {formatNoticiaDate(item.publishedAt)}
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--jdh-radius-md)] border border-border p-6">
            <h2 className="mb-4 text-xl font-bold">¿Dudas?</h2>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-muted-foreground">
                {initials(noticia.author)}
              </span>
              <div>
                <p className="text-sm font-medium">{noticia.author}</p>
                <p className="text-xs text-muted-foreground">
                  Autor del contenido
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
