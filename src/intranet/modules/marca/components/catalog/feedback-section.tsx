import { Inbox } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { EmptyState } from "@/intranet/components/common/empty-state"
import { LoadingOverlay } from "@/intranet/components/common/loading-overlay"

import { Section, Subsection } from "./section"

export function FeedbackSection() {
  return (
    <Section
      title="Estados"
      description="Estado vacío y overlay de carga (el overlay se posiciona sobre un contenedor relativo)."
    >
      <Subsection label="Empty state">
        <EmptyState
          icon={Inbox}
          title="No encontramos coincidencias"
          description="Ajusta los filtros o intenta con otro término de búsqueda."
        >
          <JdhButton variant="secondary" size="sm">
            Limpiar filtros
          </JdhButton>
        </EmptyState>
      </Subsection>

      <Subsection label="Loading overlay">
        <div className="relative h-48 overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
          <div className="p-6 text-sm text-muted-foreground">
            Contenido debajo del overlay…
          </div>
          <LoadingOverlay label="Redirigiendo de forma segura…" />
        </div>
      </Subsection>
    </Section>
  )
}
