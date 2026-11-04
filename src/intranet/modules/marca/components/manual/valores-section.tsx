import { JdhAlert } from "@/intranet/components/common/jdh-alert"

import { valoresDescriptivos, valoresVision } from "../../content"
import { SectionBlock, SubBlock } from "../section-block"

/**
 * Valores — 🔴 pendiente en el vault.
 *
 * La organización confirmó (2026-07-07) que NO existe una declaración formal de
 * valores. Esta sección lo dice explícitamente en vez de presentar los adjetivos
 * del manual como si fueran una lista ratificada: documentar un vacío es más
 * útil que rellenarlo.
 */
export function ValoresSection() {
  return (
    <SectionBlock
      id="valores"
      eyebrow="Valores"
      title="Valores corporativos"
      description="JDH aún no tiene una declaración formal de valores. Lo que sigue son las palabras que sí aparecen en documentos oficiales, presentadas como lo que son."
    >
      <JdhAlert variant="info" title="Pendiente de formalización">
        Una lista oficial de valores requiere definir qué significa cada uno,
        cómo se manifiesta en la organización y cómo diferencia a JDH. Hasta que
        el área de marca la ratifique, no debe citarse ninguna de estas listas
        como «los valores de JDH».
      </JdhAlert>

      <div className="grid gap-8 md:grid-cols-2">
        <SubBlock label="Atributos descriptivos · Manual P3">
          <p className="text-sm text-muted-foreground">
            Cuatro adjetivos que el manual usa en texto narrativo al describir
            la mejora continua. No están etiquetados como valores
            institucionales.
          </p>
          <ul className="flex flex-wrap gap-2">
            {valoresDescriptivos.map((valor) => (
              <li
                key={valor}
                className="inline-flex h-8 items-center rounded-[var(--jdh-radius-sm)] border border-[var(--color-border-strong)] px-3 text-sm font-medium"
              >
                {valor}
              </li>
            ))}
          </ul>
        </SubBlock>

        <SubBlock label="Palabras citadas en la Visión 2030">
          <p className="text-sm text-muted-foreground">
            La Visión las nombra literalmente como «los valores de la empresa»,
            pero dentro de texto corrido, no como una lista autónoma.
          </p>
          <ul className="flex flex-wrap gap-2">
            {valoresVision.map((valor) => (
              <li
                key={valor}
                className="inline-flex h-8 items-center rounded-[var(--jdh-radius-sm)] border border-dashed border-[var(--color-border-strong)] px-3 text-sm text-muted-foreground"
              >
                {valor}
              </li>
            ))}
          </ul>
        </SubBlock>
      </div>
    </SectionBlock>
  )
}
