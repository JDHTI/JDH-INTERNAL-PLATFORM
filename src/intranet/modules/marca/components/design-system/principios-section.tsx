import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import { designPrinciples } from "../../design-system-content"
import { SectionBlock } from "../section-block"

/**
 * Los ocho principios de DESIGN.md. Van numerados porque el documento fuente
 * los enumera y el orden es significativo (van de lo general a lo concreto).
 */
export function PrincipiosSection() {
  return (
    <SectionBlock
      id="principios"
      eyebrow="Fundamentos"
      title="Principios de diseño"
      description="Las ocho reglas que gobiernan cualquier interfaz JDH. Cuando una decisión de diseño no está resuelta por un token o un componente, se resuelve aquí."
    >
      <Stagger className="grid gap-4 sm:grid-cols-2">
        {designPrinciples.map((principio, index) => (
          <StaggerItem key={principio.title} className="h-full">
            <JdhCard className="h-full">
              <JdhCard.Body>
                <JdhCard.Eyebrow>
                  {String(index + 1).padStart(2, "0")}
                </JdhCard.Eyebrow>
                <JdhCard.Title as="h3">{principio.title}</JdhCard.Title>
                <JdhCard.Description>
                  {principio.description}
                </JdhCard.Description>
              </JdhCard.Body>
            </JdhCard>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionBlock>
  )
}
