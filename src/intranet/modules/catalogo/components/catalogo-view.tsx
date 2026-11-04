import { ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { SectionHeader } from "@/intranet/components/common/section-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { CATALOGO_URL, VENTAJAS } from "../catalogo.config"

/**
 * Antesala del catálogo digital de productos. No embebe ni replica el catálogo:
 * explica qué es, qué gana quien lo usa y redirige.
 *
 * Ocupa exactamente una pantalla (data-fill-viewport): los tres bloques se
 * reparten la altura con `justify-between`, así el espacio sobrante queda entre
 * ellos y no acumulado bajo las tarjetas.
 */
export function CatalogoView() {
  return (
    <div
      data-fill-viewport
      className="flex flex-1 flex-col justify-between gap-6"
    >
      <div className="space-y-6">
        <Breadcrumbs
          items={[{ label: "Intranet", href: "/" }, { label: "Catálogo" }]}
        />
        <PageHeader
          title="Catálogo"
          description="La nueva manera de visualizar nuestros productos: con imágenes, organizados por categorías y marcas, y con una navegación mucho más intuitiva que un listado o un PDF."
        >
          <JdhButton asChild>
            <a href={CATALOGO_URL} target="_blank" rel="noopener noreferrer">
              Abrir el catálogo
              <ExternalLink />
            </a>
          </JdhButton>
        </PageHeader>
      </div>

      <JdhAlert variant="info" title="Abierto para todos, sin usuario">
        El catálogo está publicado en internet y no pide credenciales: ábrelo
        desde cualquier equipo o celular, dentro o fuera de la empresa, y
        compártelo con el cliente cuando lo necesites.
      </JdhAlert>

      <div className="space-y-4">
        <SectionHeader
          title="Qué encuentras en el catálogo"
          description="Una vista del portafolio pensada para consultarlo rápido, no para descargarlo."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map((ventaja) => {
            const Icon = ventaja.icon

            return (
              <JdhCard key={ventaja.id} size="sm">
                <JdhCard.Body>
                  <JdhCard.IconBox>
                    <Icon />
                  </JdhCard.IconBox>
                  <JdhCard.Title className="mt-2">
                    {ventaja.label}
                  </JdhCard.Title>
                  <JdhCard.Description>
                    {ventaja.description}
                  </JdhCard.Description>
                </JdhCard.Body>
              </JdhCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
