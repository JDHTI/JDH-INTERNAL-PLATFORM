import { ExternalLink } from "lucide-react"

import { ContentBadge } from "@/intranet/components/common/content-badge"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { ArticleBody } from "@/intranet/components/content/article-body"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { DocumentoAcciones, documentoMeta } from "./documento-card"
import { componenteLabel, SIG_BASE_PATH, sigModuloHref } from "../sig.config"
import type { SigModulo, SigSeccionContenido } from "../sig.config"
import type { Documento } from "../types"

/**
 * Página de lectura de un documento del SIG (`/sig/[modulo]/[slug]`). La
 * evaluación, si existe, aparece dos veces a propósito: arriba para quien ya
 * leyó el documento y viene directo a presentarla, y al final para quien
 * acaba de leerlo.
 */
export function SigDocumentoView({
  documento,
  modulo,
  seccion,
}: {
  documento: Documento
  modulo: SigModulo
  seccion: SigSeccionContenido
}) {
  const eyebrow = [
    seccion.label,
    documento.componente ? componenteLabel(documento.componente) : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const tieneTexto = documento.contenido.length > 0

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "SIG", href: SIG_BASE_PATH },
          { label: modulo.title, href: sigModuloHref(modulo.slug) },
          { label: documento.title },
        ]}
      />

      <article className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {documento.obligatorio ? <ContentBadge badge="obligatorio" /> : null}
          <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            {eyebrow}
          </span>
        </div>

        <h1 className="max-w-[36ch] text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
          {documento.title}
        </h1>
        {documento.description ? (
          <p className="mt-3 max-w-[68ch] text-muted-foreground">
            {documento.description}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <p className="text-xs text-muted-foreground">
            {[documentoMeta(documento), documento.area]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex flex-wrap gap-3">
            <DocumentoAcciones documento={documento} leer={false} />
          </div>
        </div>

        {/* `text-foreground`: el gris secundario de la intranet (#919189)
            da 3,17:1 sobre blanco y aquí es el texto que se debe leer completo. */}
        {tieneTexto ? (
          <ArticleBody blocks={documento.contenido} className="text-foreground" />
        ) : null}

        {documento.imageUrl ? (
          <figure className="mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- next.config.ts declares no remotePatterns for the CMS host */}
            <img
              src={documento.imageUrl}
              alt={documento.description || documento.title}
              className="h-auto w-full rounded-[var(--jdh-radius-md)] border border-border bg-[var(--color-paper)]"
            />
          </figure>
        ) : null}

        {!tieneTexto && !documento.imageUrl ? (
          <p className="mt-8 max-w-[68ch] text-muted-foreground">
            {documento.downloadUrl
              ? "Este documento se consulta en el archivo adjunto. Descárgalo con el botón de arriba."
              : "Este documento todavía no tiene texto publicado."}
          </p>
        ) : null}

        {documento.evaluacionUrl ? (
          <div className="mt-12 flex max-w-[68ch] flex-col gap-4 rounded-[var(--jdh-radius-md)] border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-bold">Evaluación de aprobación</h2>
              <p className="text-sm text-muted-foreground">
                Cuando termines de leer, presenta la evaluación. Se abre en otra
                pestaña.
              </p>
            </div>
            <JdhButton asChild variant="primary">
              <a
                href={documento.evaluacionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Presentar evaluación
                <ExternalLink />
              </a>
            </JdhButton>
          </div>
        ) : null}
      </article>
    </div>
  )
}
