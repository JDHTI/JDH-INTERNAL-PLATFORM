import { JdhButton } from "@/intranet/components/common/jdh-button"
import { SectionHeader } from "@/intranet/components/common/section-header"

import { Section, Subsection } from "./section"

export function SectionHeadersSection() {
  return (
    <Section
      title="Encabezados de sección"
      description="SectionHeader — breadcrumbs, eyebrow, título, descripción y acciones, en tres tamaños."
    >
      <Subsection label="Default — breadcrumbs + eyebrow + acciones">
        <SectionHeader
          breadcrumbs={[
            { label: "Inicio", href: "/" },
            { label: "Noticias", href: "/noticias" },
            { label: "Detalle" },
          ]}
          eyebrow="Comunicado"
          title="Política de seguridad de la información"
          description="Lineamientos actualizados para el manejo de la información en toda la organización."
          actions={<JdhButton size="sm">Nueva publicación</JdhButton>}
        />
      </Subsection>

      <Subsection label="Compact">
        <SectionHeader
          size="compact"
          title="Documentos y políticas"
          description="Biblioteca corporativa de documentos."
        />
      </Subsection>

      <Subsection label="Hero — centrado">
        <SectionHeader
          size="hero"
          align="center"
          eyebrow="Bienvenido"
          title="Intranet JDH"
          description="Todo lo que necesitas para tu día a día, en un solo lugar."
        />
      </Subsection>
    </Section>
  )
}
