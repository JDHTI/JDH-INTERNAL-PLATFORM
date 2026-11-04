import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import { brandCopy, tonoDeVoz } from "../../content"
import { Quote, SectionBlock } from "../section-block"

/**
 * Los cinco rasgos del tono de voz (manual P6). Se numeran porque el manual los
 * presenta como una secuencia enumerada — no es decoración (DESIGN.md §1.5).
 */
export function TonoVozSection() {
  return (
    <SectionBlock
      id="tono-de-voz"
      eyebrow="Cómo hablamos"
      title="Tono de voz"
      description="Cinco dimensiones que caracterizan la voz de JDH en toda interacción con clientes y audiencias."
    >
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tonoDeVoz.map((rasgo, index) => (
          <StaggerItem key={rasgo.title} className="h-full">
            <JdhCard className="h-full">
              <JdhCard.Body>
                <JdhCard.Eyebrow>
                  {String(index + 1).padStart(2, "0")}
                </JdhCard.Eyebrow>
                <JdhCard.Title as="h3">{rasgo.title}</JdhCard.Title>
                <JdhCard.Description>{rasgo.description}</JdhCard.Description>
              </JdhCard.Body>
            </JdhCard>
          </StaggerItem>
        ))}
      </Stagger>

      <Quote cite="Ejemplo de aplicación · Highlights, Manual P24">
        {brandCopy.fraseEjemplo}
      </Quote>
    </SectionBlock>
  )
}
