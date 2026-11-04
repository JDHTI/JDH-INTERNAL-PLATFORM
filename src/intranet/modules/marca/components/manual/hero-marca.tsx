import { Logo } from "@/intranet/components/common/logo"
import { FadeIn } from "@/intranet/components/motion/fade-in"

import { brandCopy, sectores } from "../../content"

/**
 * Apertura del manual: el isologo a tamaño grande, el lema y la definición
 * institucional. El logo usa `tone="auto"` para conservar el contraste en
 * ambos temas sin recurrir a un panel de fondo fijo.
 */
export function HeroMarca() {
  return (
    <FadeIn>
      <section className="space-y-8 border-b border-border pb-12">
        <Logo variant="lockup" tone="auto" height={72} priority />

        <div className="space-y-4">
          <p className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {brandCopy.lema}
          </p>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">
            {brandCopy.definicion}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Sectores
          </span>
          {sectores.map((sector) => (
            <span
              key={sector}
              className="inline-flex h-6 items-center rounded-full border border-[var(--color-border-strong)] px-2.5 text-xs font-medium"
            >
              {sector}
            </span>
          ))}
        </div>
      </section>
    </FadeIn>
  )
}
