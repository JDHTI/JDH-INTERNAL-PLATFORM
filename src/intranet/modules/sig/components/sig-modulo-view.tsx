import type { Route } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { SectionBlock } from "@/intranet/components/common/section-block"
import { ArticleBody } from "@/intranet/components/content/article-body"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { DocumentoAcciones, DocumentoCard, documentoMeta } from "./documento-card"
import { SigTabs } from "./sig-tabs"
import { documentosHref } from "../documentos.config"
import {
  componenteLabel,
  CONTROL_DOCUMENTAL_PATH,
  SIG_BASE_PATH,
  SIG_COMPONENTES,
  SIG_MODULOS,
  sigModuloHref,
} from "../sig.config"
import type {
  SigModulo,
  SigSeccion,
  SigSeccionContenido,
  SigSeccionEnlace,
} from "../sig.config"
import type { Documento } from "../types"

export type DocumentosPorSeccion = Partial<Record<string, Documento[]>>

/** Nivel del título de cada sección; los documentos dentro van un nivel abajo. */
type Nivel = 2 | 3

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
  titleAs,
}: {
  documento: Documento
  conTitulo: boolean
  titleAs: "h3" | "h4"
}) {
  const tieneTexto = documento.contenido.length > 0
  if (!tieneTexto && !documento.imageUrl) {
    return <DocumentoCard documento={documento} titleAs={titleAs} />
  }
  const Title = titleAs

  return (
    <article className="space-y-4">
      {conTitulo ? <Title className="text-lg font-bold">{documento.title}</Title> : null}
      {/* `text-foreground`: el gris secundario de la intranet (#919189) da
          3,17:1 sobre blanco y este es texto que se lee completo.
          `max-w-none`: en el SIG el texto ocupa todo el ancho del contenido
          (decisión del usuario, 2026-11-27), no la medida de 68ch de noticias. */}
      {tieneTexto ? (
        <ArticleBody
          blocks={documento.contenido}
          className="mt-0 max-w-none text-foreground"
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
              // Papel (blanco en ambos temas): un diagrama con fondo transparente
              // sigue legible en tema oscuro.
              className="h-auto w-full rounded-[var(--jdh-radius-md)] border border-border bg-[var(--color-paper)]"
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
  nivel,
}: {
  seccion: SigSeccionContenido
  documentos: Documento[]
  disponible: boolean
  nivel: Nivel
}) {
  const titleAs = nivel === 2 ? "h3" : "h4"

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
            titleAs={titleAs}
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
          titleAs={titleAs}
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
      <p className="text-sm text-muted-foreground">
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
 * Las secciones de un módulo con su índice de anclas. Lo comparten la página
 * del módulo (secciones `h2`, anclas `#codigo-de-etica`) y el recorrido de
 * `/sig`, donde el módulo ya es un `h2` y sus secciones bajan a `h3`, con el
 * slug del módulo de prefijo en el ancla para que no choquen entre módulos.
 */
export function SigModuloSecciones({
  modulo,
  documentos,
  disponible,
  nivel,
  idPrefix = "",
}: {
  modulo: SigModulo
  documentos: DocumentosPorSeccion
  disponible: boolean
  nivel: Nivel
  idPrefix?: string
}) {
  const docsDe = (seccion: SigSeccion) =>
    seccion.kind === "contenido" ? (documentos[seccion.cmsValue] ?? []) : []

  return (
    <div className="space-y-6">
      <nav
        aria-label={`Secciones de ${modulo.title}`}
        className="border-b border-border pb-2"
      >
        <ul className="-mx-3 flex flex-wrap">
          {modulo.secciones.map((seccion) => (
            <li key={seccion.slug}>
              <a href={`#${idPrefix}${seccion.slug}`} className={SECCION_NAV_LINK}>
                {seccion.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14 pt-4">
        {modulo.secciones.map((seccion) => (
          <SectionBlock
            key={seccion.slug}
            id={`${idPrefix}${seccion.slug}`}
            title={seccion.label}
            as={nivel === 2 ? "h2" : "h3"}
          >
            {seccion.kind === "contenido" ? (
              <SeccionContenido
                seccion={seccion}
                documentos={docsDe(seccion)}
                disponible={disponible}
                nivel={nivel}
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

export function SigAvisoNoDisponible() {
  return (
    <JdhAlert variant="warning" title="No pudimos cargar los documentos">
      El gestor de contenidos no respondió. Recarga la página en unos minutos;
      las secciones que llevan a otras pantallas siguen funcionando.
    </JdhAlert>
  )
}

/** Anterior y siguiente en el orden del recorrido, al pie de cada módulo. */
function SecuenciaModulos({ modulo }: { modulo: SigModulo }) {
  const index = SIG_MODULOS.findIndex((m) => m.slug === modulo.slug)
  const anterior = SIG_MODULOS[index - 1]
  const siguiente = SIG_MODULOS[index + 1]

  return (
    <nav
      aria-label="Recorrido del SIG"
      className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:justify-between"
    >
      {anterior ? (
        <Link
          href={sigModuloHref(anterior.slug) as Route}
          className="group flex min-h-11 flex-col gap-1 rounded-[var(--jdh-radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            Anterior
          </span>
          <span className="font-medium group-hover:underline">{anterior.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {siguiente ? (
        <Link
          href={sigModuloHref(siguiente.slug) as Route}
          className="group flex min-h-11 flex-col gap-1 rounded-[var(--jdh-radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:items-end sm:text-right"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Siguiente
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="font-medium group-hover:underline">{siguiente.title}</span>
        </Link>
      ) : (
        <Link
          href={SIG_BASE_PATH as Route}
          className="group flex min-h-11 flex-col gap-1 rounded-[var(--jdh-radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:items-end sm:text-right"
        >
          <span className="text-xs text-muted-foreground">Fin del recorrido</span>
          <span className="font-medium group-hover:underline">Ver todo el SIG</span>
        </Link>
      )}
    </nav>
  )
}

/**
 * Página de un módulo del SIG (`/sig/[modulo]`): el mismo contenido que tiene
 * en el recorrido de `/sig`, solo, con anterior y siguiente al pie. Cada
 * sección tiene una URL estable (`/sig/cultura#codigo-de-etica`) para
 * enlazarla desde otras partes de la intranet.
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
  const paso = SIG_MODULOS.findIndex((m) => m.slug === modulo.slug) + 1

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
      <SigTabs />

      {modulo.slug !== "cultura" ? (
        <p className="text-sm text-muted-foreground">
          Módulo {paso} de {SIG_MODULOS.length}. ¿Es tu primera vez en el SIG?
          Empieza por{" "}
          <Link
            href={sigModuloHref("cultura") as Route}
            className="rounded-sm font-medium text-foreground underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cultura, valores y propósito
          </Link>
          .
        </p>
      ) : null}

      {!disponible ? <SigAvisoNoDisponible /> : null}

      <SigModuloSecciones
        modulo={modulo}
        documentos={documentos}
        disponible={disponible}
        nivel={2}
      />

      <SecuenciaModulos modulo={modulo} />
    </div>
  )
}
