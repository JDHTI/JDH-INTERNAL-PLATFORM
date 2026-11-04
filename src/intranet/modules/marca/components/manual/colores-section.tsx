import { brandColors } from "../../content"
import { SectionBlock } from "../section-block"

/**
 * Swatches de la paleta oficial.
 *
 * El panel usa tokens **paper** fijos (blanco en ambos temas) para que el
 * swatch de Blanco JDH siga siendo visible en tema oscuro, y cada muestra lleva
 * borde propio por la misma razón.
 *
 * Los HEX se pintan con `style` porque aquí el color ES el dato documentado —
 * no un token de UI. La excepción está registrada en ARCHITECTURE.md.
 */
export function ColoresSection() {
  return (
    <SectionBlock
      id="colores"
      eyebrow="Paleta"
      title="Colores"
      description="Negro y Blanco JDH son los colores principales; el Azul corporativo es una paleta derivada (clasificación oficial de la organización, 2026-07-07)."
    >
      <div className="rounded-[var(--jdh-radius-md)] border border-[var(--color-paper-border)] bg-[var(--color-paper)] p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {brandColors.map((color) => (
            <div key={color.hex} className="space-y-3">
              <div
                aria-hidden
                style={{ backgroundColor: color.hex }}
                className="h-24 w-full rounded-[var(--jdh-radius-sm)] border border-[var(--neutral-300)]"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-on-paper)]">
                    {color.name}
                  </h3>
                  <span
                    className={
                      color.role === "principal"
                        ? "inline-flex h-5 items-center rounded-full bg-[var(--neutral-900)] px-2 text-[10px] font-medium text-[var(--neutral-0)]"
                        : "inline-flex h-5 items-center rounded-full border border-[var(--neutral-300)] px-2 text-[10px] font-medium text-[var(--color-on-paper-muted)]"
                    }
                  >
                    {color.role === "principal" ? "Principal" : "Derivada"}
                  </span>
                </div>
                <dl className="space-y-0.5 font-mono text-xs text-[var(--color-on-paper-muted)]">
                  <div className="flex gap-2">
                    <dt className="w-10 shrink-0">HEX</dt>
                    <dd>{color.hex}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-10 shrink-0">RGB</dt>
                    <dd>{color.rgb}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-10 shrink-0">CMYK</dt>
                    <dd>{color.cmyk}</dd>
                  </div>
                </dl>
                {color.note ? (
                  <p className="text-xs leading-snug text-[var(--color-on-paper-muted)]">
                    {color.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        El manual (P9) llamaba al azul «el color representativo principal»; la
        organización resolvió la ambigüedad en 2026-07-07 y esa clasificación
        prevalece. En la web, el azul queda fuera de la interfaz: vive
        únicamente en el logo.
      </p>
    </SectionBlock>
  )
}
