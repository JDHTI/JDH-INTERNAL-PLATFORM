import type { Route } from "next"
import Link from "next/link"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { SigTabs } from "./sig-tabs"
import {
  SigAvisoNoDisponible,
  SigModuloSecciones,
  type DocumentosPorSeccion,
} from "./sig-modulo-view"
import { SIG_MODULOS, sigModuloHref } from "../sig.config"

/**
 * Portada del SIG (`/sig`): el recorrido completo en una sola página. Empieza
 * por Cultura, valores y propósito, el marco común antes de cualquier proceso,
 * y sigue con el sistema de gestión y con SST y cumplimiento. Cada módulo es
 * el mismo contenido que tiene su página propia (`/sig/[modulo]`), a la que se
 * llega desde las pestañas o desde el pie de cada bloque.
 */
export function SigLandingView({
  documentos,
  disponible,
}: {
  documentos: DocumentosPorSeccion
  disponible: boolean
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Intranet", href: "/" }, { label: "SIG" }]} />
      <PageHeader
        title="Sistema Integrado de Gestión"
        description="Empieza por la cultura de la compañía y sigue con el sistema de gestión y las normas de cumplimiento. Cada módulo también se puede abrir por separado desde las pestañas."
      />
      <SigTabs />

      {!disponible ? <SigAvisoNoDisponible /> : null}

      <div className="space-y-20 pt-4">
        {SIG_MODULOS.map((modulo, index) => {
          const headingId = `${modulo.slug}-titulo`
          return (
            <section
              key={modulo.slug}
              id={modulo.slug}
              aria-labelledby={headingId}
              className="scroll-mt-32 space-y-6"
            >
              <header className="space-y-2">
                <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                  {index === 0
                    ? `Módulo 1 de ${SIG_MODULOS.length} · Empieza aquí`
                    : `Módulo ${index + 1} de ${SIG_MODULOS.length}`}
                </p>
                <h2
                  id={headingId}
                  className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
                >
                  {modulo.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {modulo.description}
                </p>
              </header>

              <SigModuloSecciones
                modulo={modulo}
                documentos={documentos}
                disponible={disponible}
                nivel={3}
                idPrefix={`${modulo.slug}-`}
              />

              <div className="border-t border-border pt-6">
                <JdhButton asChild variant="secondary">
                  <Link href={sigModuloHref(modulo.slug) as Route}>
                    Abrir solo este módulo
                    <span className="sr-only">: {modulo.title}</span>
                  </Link>
                </JdhButton>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
