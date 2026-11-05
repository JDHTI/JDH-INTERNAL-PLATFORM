import { ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhAlert } from "@/intranet/components/common/jdh-alert"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { PORTAL_AUTOGESTION_URL, TRAMITES } from "../autogestion.config"

/**
 * Antesala del portal de autogestión de Gestión Humana. No embebe ni replica el
 * portal: explica qué se resuelve allí, deja claras las dos condiciones de
 * acceso (usuario ya creado, red corporativa) y redirige.
 *
 * Ocupa exactamente una pantalla (data-fill-viewport) para que el pie no asome
 * bajo el contenido, pero los bloques van apilados con un espacio fijo: el
 * sobrante queda al final y no se reparte entre ellos.
 */
export function AutogestionView() {
  return (
    <div data-fill-viewport className="flex flex-1 flex-col gap-8">
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
        {/* La celda estira la alerta más corta; `content-start` mantiene sus
            filas arriba para que título y texto queden alineados con la otra. */}
        <JdhAlert
          variant="success"
          title="Tu usuario ya está creado"
          className="content-start"
        >
          Gestión Humana ya gestionó los usuarios de todos los colaboradores. No
          tienes que solicitarlo: revisa el correo personal que tienes
          registrado en la empresa, allí encontrarás tus datos de acceso.
        </JdhAlert>
        <JdhAlert
          variant="warning"
          title="Solo desde la red corporativa"
          className="content-start"
        >
          El portal está publicado dentro de la red interna de JDH. Ábrelo desde
          un equipo conectado a la red de la compañía; por fuera de ella el
          enlace no responde.
        </JdhAlert>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">
            Qué puedes hacer en el portal
          </h2>
          <p className="text-sm text-muted-foreground">
            Trámites que se resuelven directamente allí, sin intermediarios.
          </p>
        </div>
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
