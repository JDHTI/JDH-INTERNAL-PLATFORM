import type { LucideIcon } from "lucide-react"
import { ArrowRight, Download, ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhButton } from "@/intranet/components/common/jdh-button"

export interface BrandResource {
  icon: LucideIcon
  title: string
  description: string
  /** Peso del archivo o formato, mostrado como metadato. */
  meta?: string
  href: string
  /** `download` = archivo local · `external` = abre en pestaña nueva · `internal` = ruta de la app. */
  kind?: "download" | "external" | "internal"
  cta?: string
}

const CTA_ICON = {
  download: Download,
  external: ExternalLink,
  internal: ArrowRight,
} as const

/**
 * Bloque de recursos descargables y enlaces (manual PDF, DESIGN.md, vault).
 * Compartido por el Manual de marca y el Design system, que exponen listas
 * distintas de recursos.
 *
 * RSC-safe: recibe los iconos como props desde otro componente de servidor,
 * nunca a través de la frontera servidor→cliente.
 */
export function BrandDownloads({ resources }: { resources: BrandResource[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => {
        const kind = resource.kind ?? "download"
        const CtaIcon = CTA_ICON[kind]
        const Icon = resource.icon

        return (
          <JdhCard key={resource.href} size="sm" className="h-full">
            <JdhCard.Body>
              <JdhCard.IconBox>
                <Icon />
              </JdhCard.IconBox>
              <JdhCard.Title className="mt-2">{resource.title}</JdhCard.Title>
              <JdhCard.Description>{resource.description}</JdhCard.Description>
              {resource.meta ? (
                <JdhCard.Meta>{resource.meta}</JdhCard.Meta>
              ) : null}
              <JdhCard.Footer separated>
                <JdhButton asChild variant="secondary" size="sm">
                  <a
                    href={resource.href}
                    {...(kind === "download" ? { download: true } : {})}
                    {...(kind === "external"
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {resource.cta ??
                      (kind === "external" ? "Abrir" : "Descargar")}
                    <CtaIcon />
                  </a>
                </JdhButton>
              </JdhCard.Footer>
            </JdhCard.Body>
          </JdhCard>
        )
      })}
    </div>
  )
}
