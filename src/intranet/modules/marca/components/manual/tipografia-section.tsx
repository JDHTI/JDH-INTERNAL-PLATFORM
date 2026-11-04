import { JdhAlert } from "@/intranet/components/common/jdh-alert"

import { tipografiaJerarquia, tipografiaPesos } from "../../content"
import { SectionBlock, SubBlock } from "../section-block"

/**
 * Specimen de Centrale Sans. Los pesos se renderizan con `style={{ fontWeight }}`
 * porque el peso es el dato que la muestra documenta, igual que el HEX en la
 * sección de colores.
 */
export function TipografiaSection() {
  return (
    <SectionBlock
      id="tipografia"
      eyebrow="Tipografía"
      title="Centrale Sans"
      description="Familia sans-serif principal de la marca, en cuatro pesos autorizados."
    >
      <JdhAlert variant="success" title="Fuente activa en toda la intranet">
        Centrale Sans se sirve como .woff2 desde public/fonts/ con font-display:
        swap. Lo que ves abajo es el specimen real, no una sustitución: esta
        página, el resto de la intranet y cualquier web JDH usan la misma pila.
      </JdhAlert>

      <SubBlock label="Pesos">
        <div className="divide-y divide-border overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
          {tipografiaPesos.map((peso) => (
            <div
              key={peso.name}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 p-5"
            >
              <p
                style={{ fontWeight: peso.weight }}
                className="text-2xl tracking-tight"
              >
                Tu pasión, nos mueve
              </p>
              <div className="text-right">
                <p className="text-sm font-medium">Sans {peso.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {peso.weight} · {peso.usage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SubBlock>

      <SubBlock label="Aplicación por jerarquía">
        <dl className="grid gap-4 sm:grid-cols-3">
          {tipografiaJerarquia.map((nivel) => (
            <div
              key={nivel.title}
              className="rounded-[var(--jdh-radius-md)] border border-border p-4"
            >
              <dt className="text-sm font-medium">{nivel.title}</dt>
              <dd className="text-sm text-muted-foreground">
                {nivel.description}
              </dd>
            </div>
          ))}
        </dl>
      </SubBlock>
    </SectionBlock>
  )
}
