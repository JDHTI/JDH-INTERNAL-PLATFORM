import { JdhCard } from "@/intranet/components/cards/jdh-card"

import { brandCopy } from "../../content"
import { SectionBlock } from "../section-block"

/**
 * Misión y Visión 2030. El vault las agrupa en una sola nota por decisión
 * organizacional; aquí se presentan como dos cards hermanas porque responden
 * preguntas distintas (qué somos hoy / qué queremos ser).
 */
export function MisionVisionSection() {
  return (
    <SectionBlock
      id="mision-vision"
      eyebrow="Propósito"
      title="Misión y visión"
      description="Declaraciones formales ratificadas por la organización."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <JdhCard size="lg" className="h-full">
          <JdhCard.Body>
            <JdhCard.Eyebrow>Misión</JdhCard.Eyebrow>
            <JdhCard.Title as="h3" className="mt-1">
              Qué hacemos hoy
            </JdhCard.Title>
            <div className="mt-3 space-y-3">
              {brandCopy.mision.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 32)}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {parrafo}
                </p>
              ))}
            </div>
          </JdhCard.Body>
        </JdhCard>

        <JdhCard size="lg" variant="inverse" className="h-full">
          <JdhCard.Body>
            <JdhCard.Eyebrow>Visión 2030</JdhCard.Eyebrow>
            <JdhCard.Title as="h3" className="mt-1">
              Hacia dónde vamos
            </JdhCard.Title>
            <div className="mt-3 space-y-3">
              {brandCopy.vision.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 32)}
                  className="text-sm leading-relaxed text-[var(--color-on-ink-muted)]"
                >
                  {parrafo}
                </p>
              ))}
            </div>
          </JdhCard.Body>
        </JdhCard>
      </div>
    </SectionBlock>
  )
}
