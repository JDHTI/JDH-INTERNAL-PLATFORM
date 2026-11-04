import { ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { SectionHeader } from "@/intranet/components/common/section-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { PORTAL_AUTOGESTION_URL, TRAMITES } from "../autogestion.config"

/**
 * Antesala del portal de autogestión de Gestión Humana. No embebe ni replica el
 * portal: explica qué se resuelve allí, deja claras las dos condiciones de
 * acceso (usuario ya creado, red corporativa) y redirige.
 *
 * Ocupa exactamente una pantalla (data-fill-viewport): los tres bloques se
 * reparten la altura con `justify-between`, así el espacio sobrante queda entre
 * ellos y no acumulado bajo las tarjetas.
 */
export function AutogestionView() {
  return (
    <div
      data-fill-viewport
      className="flex flex-1 flex-col justify-between gap-6"
    >
      <div className="space-y-6">
        <Breadcrumbs
          items={[{ label: "Intranet", href: "/" }, { label: "Autogestión" }]}
        />
        <PageHeader
          title="Portal autogestión"
          description="El portal de Gestión Humana donde tú mismo generas tus documentos laborales y consultas tu información de nómina y vacaciones, sin pasar por una solicitud."
        >
          <JdhButton asChild>
            <a
              href={PORTAL_AUTOGESTION_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir el portal
              <ExternalLink />
            </a>
          </JdhButton>
        </PageHeader>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <JdhAlert variant="success" title="Tu usuario ya está creado">
          Gestión Humana ya gestionó los usuarios de todos los colaboradores. No
          tienes que solicitarlo: revisa el correo personal que tienes
          registrado en la empresa, allí encontrarás tus datos de acceso.
        </JdhAlert>
        <JdhAlert variant="warning" title="Solo desde la red corporativa">
          El portal está publicado dentro de la red interna de JDH. Ábrelo desde
          un equipo conectado a la red de la compañía; por fuera de ella el
          enlace no responde.
        </JdhAlert>
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Qué puedes hacer en el portal"
          description="Trámites que se resuelven directamente allí, sin intermediarios."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRAMITES.map((tramite) => {
            const Icon = tramite.icon

            return (
              <JdhCard key={tramite.id} size="sm">
                <JdhCard.Body>
                  <JdhCard.IconBox>
                    <Icon />
                  </JdhCard.IconBox>
                  <JdhCard.Title className="mt-2">
                    {tramite.label}
                  </JdhCard.Title>
                  <JdhCard.Description>
                    {tramite.description}
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
