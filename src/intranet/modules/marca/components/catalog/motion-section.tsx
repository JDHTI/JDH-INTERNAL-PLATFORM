import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { FadeIn } from "@/intranet/components/motion/fade-in"
import { ScrollReveal } from "@/intranet/components/motion/scroll-reveal"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import { Section, Subsection } from "./section"

export function MotionSection() {
  return (
    <Section
      title="Animaciones"
      description="Motion (entrada / scroll-reveal) + Lenis (scroll suave global). Todas respetan prefers-reduced-motion."
    >
      <Subsection label="Stagger — entrada escalonada de cards">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StaggerItem key={i}>
              <JdhCard size="sm">
                <JdhCard.Body>
                  <JdhCard.Title as="p" className="text-sm">
                    Card {i}
                  </JdhCard.Title>
                  <JdhCard.Meta>Entrada escalonada</JdhCard.Meta>
                </JdhCard.Body>
              </JdhCard>
            </StaggerItem>
          ))}
        </Stagger>
      </Subsection>

      <Subsection label="FadeIn">
        <FadeIn>
          <JdhCard size="sm">
            <JdhCard.Body>
              <JdhCard.Title as="p" className="text-sm">
                Aparezco con fundido al montar
              </JdhCard.Title>
            </JdhCard.Body>
          </JdhCard>
        </FadeIn>
      </Subsection>

      <Subsection label="ScrollReveal — aparece al entrar en viewport">
        <ScrollReveal>
          <JdhCard>
            <JdhCard.Body>
              <JdhCard.Title as="p" className="text-sm">
                Aparezco al hacer scroll hasta aquí
              </JdhCard.Title>
              <JdhCard.Meta>whileInView</JdhCard.Meta>
            </JdhCard.Body>
          </JdhCard>
        </ScrollReveal>
      </Subsection>
    </Section>
  )
}
