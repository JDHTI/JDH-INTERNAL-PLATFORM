import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import { brandCopy, brandStats } from "../../content"
import { SectionBlock } from "../section-block"

/**
 * Historia y escala operativa. Las cifras son datos de 2026 confirmados por la
 * organización, no estimaciones — de ahí que se muestren como tiles y no como
 * prosa.
 */
export function HistoriaSection() {
  return (
    <SectionBlock
      id="historia"
      eyebrow="Quiénes somos"
      title="Más de 30 años conectando proveedores y negocios"
    >
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {brandCopy.historia.map((parrafo) => (
            <p
              key={parrafo.slice(0, 32)}
              className="leading-relaxed text-muted-foreground"
            >
              {parrafo}
            </p>
          ))}
        </div>

        <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--jdh-radius-md)] border border-border bg-border">
          {brandStats.map((stat) => (
            <StaggerItem
              key={stat.label}
              className="flex flex-col justify-center gap-1 bg-card p-5 last:col-span-2"
            >
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs leading-snug text-muted-foreground">
                {stat.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionBlock>
  )
}
