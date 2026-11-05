import { ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { CATALOGO_URL, VENTAJAS } from "../catalogo.config"

/**
 * Antesala del catálogo digital de productos. No embebe ni replica el catálogo:
 * explica qué es, qué gana quien lo usa y redirige.
 *
 * Ocupa exactamente una pantalla (data-fill-viewport) para que el pie no asome
 * bajo el contenido, pero los bloques van apilados con un espacio fijo: el
 * sobrante queda al final y no se reparte entre ellos.
 */
export function CatalogoView() {
  return (
    <div data-fill-viewport className="flex flex-1 flex-col gap-8">
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

      <JdhAlert variant="info" title="Sin usuario, desde la red corporativa">
        El catálogo no pide credenciales, pero está publicado dentro de la red
        interna de JDH. Ábrelo desde un equipo o celular conectado a la red de
        la compañía; por fuera de ella el enlace no responde.
      </JdhAlert>

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">
            Qué encuentras en el catálogo
          </h2>
          <p className="text-sm text-muted-foreground">
            Una vista del portafolio pensada para consultarlo rápido, no para
            descargarlo.
          </p>
        </div>
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
