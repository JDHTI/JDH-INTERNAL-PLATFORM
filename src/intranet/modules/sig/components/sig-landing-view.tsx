import type { Route } from "next"
import Link from "next/link"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { SectionBlock } from "@/intranet/components/common/section-block"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { DocumentoCard } from "./documento-card"
import {
  componenteLabel,
  SIG_MODULOS,
  sigModuloHref,
  sigUbicacion,
} from "../sig.config"
import type { SigModulo } from "../sig.config"
import type { Documento } from "../types"

const LINK_ON_PAPER =
  "inline-flex min-h-11 items-center rounded-sm text-sm text-foreground underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"

const LINK_ON_INK =
  "inline-flex min-h-11 items-center rounded-sm text-sm text-[var(--color-on-ink)] underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-on-ink)]"

/** Atajos a las secciones de un módulo, con su ancla en la página del módulo. */
function SeccionesDe({
  modulo,
  linkClass,
}: {
  modulo: SigModulo
  linkClass: string
}) {
  return (
    <ul className="flex flex-wrap gap-x-5">
      {modulo.secciones.map((seccion) => (
        <li key={seccion.slug}>
          <Link
            href={`${sigModuloHref(modulo.slug)}#${seccion.slug}` as Route}
            className={linkClass}
          >
            {seccion.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Políticas vigentes en un clic desde la portada: cada una abre su página o
 * descarga su archivo, sin pasar por el módulo ni por el control documental.
 */
function PoliticasDirectas({ politicas }: { politicas: Documento[] }) {
  return (
    <ul className="flex flex-col">
      {politicas.map((politica) => {
        const label = politica.componente
          ? `Política de ${componenteLabel(politica.componente).toLowerCase()}`
          : politica.title
        return (
          <li key={politica.id}>
            {politica.href ? (
              <Link href={politica.href as Route} className={LINK_ON_PAPER}>
                {label}
              </Link>
            ) : politica.downloadUrl ? (
              <a href={politica.downloadUrl} download className={LINK_ON_PAPER}>
                {label} ({politica.fileType})
              </a>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function ModuloCard({
  modulo,
  politicas,
}: {
  modulo: SigModulo
  politicas: Documento[]
}) {
  const Icon = modulo.icon
  const conPoliticas = modulo.slug === "gestion" && politicas.length > 0

  return (
    <JdhCard className="h-full">
      <JdhCard.Body>
        <JdhCard.IconBox>
          <Icon />
        </JdhCard.IconBox>
        <JdhCard.Title as="h2" className="mt-2">
          {modulo.title}
        </JdhCard.Title>
        <JdhCard.Description>{modulo.description}</JdhCard.Description>
        <div className="mt-2">
          {conPoliticas ? (
            <>
              <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                Políticas vigentes
              </p>
              <PoliticasDirectas politicas={politicas} />
            </>
          ) : (
            <SeccionesDe modulo={modulo} linkClass={LINK_ON_PAPER} />
          )}
        </div>
        <JdhCard.Footer separated>
          <JdhButton asChild variant="secondary">
            <Link href={sigModuloHref(modulo.slug) as Route}>
              Abrir el módulo<span className="sr-only"> {modulo.title}</span>
            </Link>
          </JdhButton>
        </JdhCard.Footer>
      </JdhCard.Body>
    </JdhCard>
  )
}

/**
 * Portada del SIG (`/sig`). Cultura es el punto de entrada: va primero, a
 * todo el ancho y en tinta, la única superficie invertida de la página. Los
 * otros dos módulos quedan debajo, al mismo nivel entre sí. Cierra con los
 * documentos obligatorios de todo el SIG, que es lo que cada colaborador
 * tiene pendiente.
 */
export function SigLandingView({
  politicas,
  obligatorios,
  disponible,
}: {
  politicas: Documento[]
  obligatorios: Documento[]
  disponible: boolean
}) {
  const [cultura, ...otros] = SIG_MODULOS

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Intranet", href: "/" }, { label: "SIG" }]} />
      <PageHeader
        title="Sistema Integrado de Gestión"
        description="La documentación de la compañía en un solo lugar: cultura, políticas, procesos y las normas que todos debemos cumplir."
      />

      <JdhCard variant="inverse" size="lg">
        <JdhCard.Body className="gap-3">
          <JdhCard.Eyebrow>Empieza aquí</JdhCard.Eyebrow>
          <JdhCard.Title as="h2" className="font-bold">
            {cultura.title}
          </JdhCard.Title>
          <JdhCard.Description className="max-w-2xl text-base">
            {cultura.description}
          </JdhCard.Description>
          <SeccionesDe modulo={cultura} linkClass={LINK_ON_INK} />
          <JdhCard.Footer separated>
            <JdhButton asChild variant="primary-on-ink">
              <Link href={sigModuloHref(cultura.slug) as Route}>
                Conocer la cultura de JDH
              </Link>
            </JdhButton>
          </JdhCard.Footer>
        </JdhCard.Body>
      </JdhCard>

      <div className="grid gap-4 md:grid-cols-2">
        {otros.map((modulo) => (
          <ModuloCard key={modulo.slug} modulo={modulo} politicas={politicas} />
        ))}
      </div>

      <div className="pt-8">
        <SectionBlock
          id="obligatorios"
          title="Documentos obligatorios"
          description="Todos los colaboradores deben leerlos. Los que tienen evaluación de aprobación la enlazan en su tarjeta."
        >
          {!disponible ? (
            <p className="rounded-[var(--jdh-radius-md)] border border-dashed border-border px-6 py-8 text-sm text-muted-foreground">
              No se pudieron cargar los documentos obligatorios. Recarga la
              página en unos minutos.
            </p>
          ) : obligatorios.length === 0 ? (
            <p className="rounded-[var(--jdh-radius-md)] border border-dashed border-border px-6 py-8 text-sm text-muted-foreground">
              No hay documentos obligatorios publicados por ahora.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {obligatorios.map((documento) => (
                <DocumentoCard
                  key={documento.id}
                  documento={documento}
                  eyebrow={
                    documento.seccion
                      ? sigUbicacion(documento.seccion)?.seccion.label
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </SectionBlock>
      </div>
    </div>
  )
}
