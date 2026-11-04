import { Download, Plus } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"

import { Section, Subsection } from "./section"

export function ButtonsSection() {
  return (
    <Section
      title="Botones"
      description="JdhButton — jerarquía primario / secundario / ghost / enlace, variantes sobre chrome negro, tamaños y estados."
    >
      <Subsection label="Variantes">
        <div className="flex flex-wrap items-center gap-3">
          <JdhButton>Primario</JdhButton>
          <JdhButton variant="secondary">Secundario</JdhButton>
          <JdhButton variant="ghost">Ghost</JdhButton>
          <JdhButton variant="link">Enlace</JdhButton>
          <JdhButton variant="destructive">Eliminar</JdhButton>
        </div>
      </Subsection>

      <Subsection label="Tamaños e iconos">
        <div className="flex flex-wrap items-center gap-3">
          <JdhButton size="sm">Pequeño</JdhButton>
          <JdhButton size="md">Mediano</JdhButton>
          <JdhButton size="lg">Grande</JdhButton>
          <JdhButton>
            <Plus />
            Con icono
          </JdhButton>
          <JdhButton size="icon" aria-label="Agregar">
            <Plus />
          </JdhButton>
          <JdhButton size="icon-sm" variant="secondary" aria-label="Descargar">
            <Download />
          </JdhButton>
        </div>
      </Subsection>

      <Subsection label="Estados">
        <div className="flex flex-wrap items-center gap-3">
          <JdhButton disabled>Deshabilitado</JdhButton>
          <JdhButton loading>Redirigiendo…</JdhButton>
          <JdhButton variant="secondary" loading>
            Guardando…
          </JdhButton>
        </div>
      </Subsection>

      <Subsection label="Sobre chrome negro">
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--jdh-radius-md)] bg-[var(--color-ink)] p-6">
          <JdhButton variant="primary-on-ink">Primario inverso</JdhButton>
          <JdhButton variant="outline-on-ink">Contorno inverso</JdhButton>
        </div>
      </Subsection>
    </Section>
  )
}
