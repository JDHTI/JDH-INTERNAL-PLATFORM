import { ContentBadge } from "@/intranet/components/common/content-badge"
import { contentBadges } from "@/intranet/config/content-badges.config"

import { Section, Subsection } from "./section"

export function ContentBadgesSection() {
  return (
    <Section
      title="Chips de contenido"
      description="Etiquetas editoriales configurables (config/content-badges.config.ts), resueltas por id. Se usan en noticias, cards y detalle."
    >
      <Subsection label="Catálogo">
        <div className="flex flex-wrap gap-2">
          {contentBadges.map((badge) => (
            <ContentBadge key={badge.id} badge={badge.id} />
          ))}
        </div>
      </Subsection>

      <Subsection label="Sobre superficie oscura (overlay)">
        <div className="flex flex-wrap gap-2 rounded-[var(--jdh-radius-md)] bg-[var(--color-ink)] p-6">
          <ContentBadge badge="obligatorio" overlay />
          <ContentBadge badge="urgente" overlay />
          <ContentBadge badge="nuevo" overlay />
        </div>
      </Subsection>
    </Section>
  )
}
