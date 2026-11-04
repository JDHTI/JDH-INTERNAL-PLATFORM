import { X } from "lucide-react"

import { antiPatterns } from "../../design-system-content"
import { SectionBlock } from "../section-block"

/**
 * Los anti-patrones de DESIGN.md §5. Se documentan como lista porque su valor
 * está en poder citarlos en revisión de código o de diseño: son el criterio de
 * rechazo, no una recomendación.
 */
export function AntiPatronesSection() {
  return (
    <SectionBlock
      id="anti-patrones"
      eyebrow="Criterios de rechazo"
      title="Nunca en una web JDH"
      description="Si una pantalla incumple alguno de estos puntos, no está lista para producción."
    >
      <ul className="divide-y divide-border overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
        {antiPatterns.map((item) => (
          <li key={item} className="flex items-start gap-3 px-5 py-4">
            <X
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </SectionBlock>
  )
}
