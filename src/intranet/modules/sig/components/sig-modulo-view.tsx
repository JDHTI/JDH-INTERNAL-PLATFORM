import type { Route } from "next"
import Link from "next/link"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { PageHeader } from "@/intranet/components/common/page-header"
import { SectionBlock } from "@/intranet/components/common/section-block"
import { ArticleBody } from "@/intranet/components/content/article-body"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { DocumentoAcciones, DocumentoCard, documentoMeta } from "./documento-card"
import { documentosHref } from "../documentos.config"
import {
  componenteLabel,
  CONTROL_DOCUMENTAL_PATH,
  SIG_BASE_PATH,
  SIG_COMPONENTES,
  sigModuloHref,
} from "../sig.config"
import type {
  SigModulo,
  SigSeccion,
  SigSeccionContenido,
  SigSeccionEnlace,
} from "../sig.config"
import type { Documento } from "../types"

type DocumentosPorSeccion = Partial<Record<string, Documento[]>>

const SECCION_NAV_LINK =
  "inline-flex min-h-11 items-center rounded-[var(--jdh-radius-sm)] px-3 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"

/** Estado vacío de una sección: más bajo que `EmptyState`, que es de página. */
function SeccionVacia({ children }: { children: string }) {
  return (
    <p className="rounded-[var(--jdh-radius-md)] border border-dashed border-border px-6 py-8 text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** Documento que se lee en la misma página: su texto, su imagen o, si solo trae archivo, su tarjeta. */
function DocumentoEnLinea({
  documento,
  conTitulo,
}: {
  documento: Documento
  conTitulo: boolean
}) {
  const tieneTexto = documento.contenido.length > 0
  if (!tieneTexto && !documento.imageUrl) {
    return <DocumentoCard documento={documento} />
  }

  return (
    <article className="space-y-4">
      {conTitulo ? (
        <h3 className="text-lg font-bold">{documento.title}</h3>
      ) : null}
      {tieneTexto ? (
        <ArticleBody
          blocks={documento.contenido}
          className="mt-0 text-foreground"
        />
      ) : null}
      {documento.imageUrl ? (
        <figure className="space-y-2">
          <a
            href={documento.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[var(--jdh-radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next.config.ts declares no remotePatterns for the CMS host */}
            <img
              src={documento.imageUrl}
              alt={documento.description || documento.title}
              loading="lazy"
              className="h-auto w-full rounded-[var(--jdh-radius-md)] border border-border bg-muted"
            />
            <span className="sr-only">
              Abrir la imagen en tamaño completo (se abre en otra pestaña)
            </span>
          </a>
          <figcaption className="text-xs text-muted-foreground">
            {documentoMeta(documento)}
          </figcaption>
        </figure>
      ) : (
        <p className="text-xs text-muted-foreground">
          {documentoMeta(documento)}
        </p>
      )}
      {documento.downloadUrl || documento.evaluacionUrl ? (
        <div className="flex flex-wrap gap-3">
          <DocumentoAcciones documento={documento} leer={false} />
        </div>
      ) : null}
    </article>
  )
}

function SeccionContenido({
  seccion,
  documentos,
  disponible,
}: {
  seccion: SigSeccionContenido
  documentos: Documento[]
  disponible: boolean
}) {
  if (!disponible) {
    return <SeccionVacia>No se pudo cargar esta sección.</SeccionVacia>
  }
  if (documentos.length === 0) {
    return <SeccionVacia>{seccion.empty}</SeccionVacia>
  }

  if (seccion.layout === "texto") {
    return (
      <div className="space-y-10">
        {documentos.map((documento) => (
          <DocumentoEnLinea
            key={documento.id}
            documento={documento}
            conTitulo={documentos.length > 1}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documentos.map((documento) => (
        <DocumentoCard
          key={documento.id}
          documento={documento}
          eyebrow={
            seccion.layout === "politicas" && documento.componente
              ? componenteLabel(documento.componente)
              : undefined
          }
        />
      ))}
    </div>
  )
}

function SeccionEnlace({ seccion }: { seccion: SigSeccionEnlace }) {
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {seccion.description}
      </p>
      <JdhButton asChild variant="secondary">
        <Link href={seccion.href as Route}>{seccion.actionLabel}</Link>
      </JdhButton>
      {seccion.href === CONTROL_DOCUMENTAL_PATH ? (
        <nav aria-label="Control documental por componente">
          <p className="mb-1 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Por componente
          </p>
          <ul className="-mx-3 flex flex-wrap">
            {SIG_COMPONENTES.map(({ value, label }) => (
              <li key={value}>
                <Link
                  href={documentosHref({ componente: value }) as Route}
                  className={SECCION_NAV_LINK}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}

/**
 * Página de un módulo del SIG (`/sig/[modulo]`): todas sus secciones en una
 * sola página, con un índice de anclas arriba. Las secciones caben en una
 * pantalla o dos, así que el colaborador ve todo al llegar, y cada sección
 * tiene una URL estable (`/sig/cultura#codigo-de-etica`) para enlazarla
 * desde otras partes de la intranet.
 */
export function SigModuloView({
  modulo,
  documentos,
  disponible,
}: {
  modulo: SigModulo
  documentos: DocumentosPorSeccion
  disponible: boolean
}) {
  const docsDe = (seccion: SigSeccion) =>
    seccion.kind === "contenido" ? (documentos[seccion.cmsValue] ?? []) : []

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "SIG", href: SIG_BASE_PATH },
          { label: modulo.title },
        ]}
      />
      <PageHeader title={modulo.title} description={modulo.description} />

      {modulo.slug !== "cultura" ? (
        <p className="text-sm text-muted-foreground">
          ¿Es tu primera vez en el SIG? Empieza por{" "}
          <Link
            href={sigModuloHref("cultura") as Route}
            className="rounded-sm font-medium text-foreground underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cultura, valores y propósito
          </Link>
          .
        </p>
      ) : null}

      {!disponible ? (
        <JdhAlert variant="warning" title="No pudimos cargar los documentos">
          El gestor de contenidos no respondió. Recarga la página en unos
          minutos; las secciones que llevan a otras pantallas siguen
          funcionando.
        </JdhAlert>
      ) : null}

      <nav
        aria-label={`Secciones de ${modulo.title}`}
        className="border-b border-border pb-2"
      >
        <ul className="-mx-3 flex flex-wrap">
          {modulo.secciones.map((seccion) => (
            <li key={seccion.slug}>
              <a href={`#${seccion.slug}`} className={SECCION_NAV_LINK}>
                {seccion.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14 pt-4">
        {modulo.secciones.map((seccion) => (
          <SectionBlock key={seccion.slug} id={seccion.slug} title={seccion.label}>
            {seccion.kind === "contenido" ? (
              <SeccionContenido
                seccion={seccion}
                documentos={docsDe(seccion)}
                disponible={disponible}
              />
            ) : (
              <SeccionEnlace seccion={seccion} />
            )}
          </SectionBlock>
        ))}
      </div>
    </div>
  )
}
