import * as React from "react"

import { ScrollReveal } from "@/intranet/components/motion/scroll-reveal"
import { cn } from "@/intranet/lib/utils"

/**
 * Bloque de sección dentro de una página que ya tiene su `h1`: eyebrow + h2 +
 * intro + contenido, revelado al entrar en viewport. Con `id` sirve de ancla
 * (`scroll-mt-32` deja libre el header fijo).
 *
 * No es `SectionHeader` porque ese siempre emite `h1`. Nació en `modules/marca`
 * y se promovió aquí cuando `modules/sig` lo necesitó.
 */
export function SectionBlock({
  id,
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  className,
  children,
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: React.ReactNode
  /** `h3` cuando la sección cuelga de otra sección `h2` de la misma página. */
  as?: "h2" | "h3"
  className?: string
  children: React.ReactNode
}) {
  return (
    <ScrollReveal>
      <section id={id} className={cn("scroll-mt-32 space-y-6", className)}>
        <div className="space-y-2 border-b border-border pb-4">
          {eyebrow ? (
            <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <Heading
            className={cn(
              "font-bold tracking-tight text-balance",
              Heading === "h2" ? "text-2xl" : "text-xl"
            )}
          >
            {title}
          </Heading>
          {description ? (
            <div className="max-w-3xl text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {children}
      </section>
    </ScrollReveal>
  )
}

/** Subgrupo etiquetado dentro de una sección. */
export function SubBlock({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </h3>
      {children}
    </div>
  )
}

/** Bloque de cita: barra gruesa a la izquierda + texto lead. */
export function Quote({
  children,
  cite,
}: {
  children: React.ReactNode
  cite?: string
}) {
  return (
    <blockquote className="border-l-2 border-foreground pl-6">
      <p className="text-lg leading-relaxed text-balance">{children}</p>
      {cite ? (
        <footer className="mt-3 text-xs text-muted-foreground">{cite}</footer>
      ) : null}
    </blockquote>
  )
}
