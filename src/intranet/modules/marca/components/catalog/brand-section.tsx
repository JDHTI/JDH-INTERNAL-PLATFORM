import { Logo, type LogoVariant } from "@/intranet/components/common/logo"

import { Section } from "./section"

const variants: LogoVariant[] = ["full", "text", "mark", "compact"]

export function BrandSection() {
  return (
    <Section
      title="Marca"
      description="Logos JDH — variantes (general / texto / isotipo / compacto / lockup) y tonos. Negro sobre superficies claras, blanco sobre chrome negro."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel blanco fijo (tokens paper): los logos negros necesitan una
            superficie clara también en tema oscuro. */}
        <div className="flex flex-wrap items-center gap-6 rounded-[var(--jdh-radius-md)] border border-[var(--color-paper-border)] bg-[var(--color-paper)] p-6">
          {variants.map((variant) => (
            <Logo key={variant} variant={variant} tone="black" height={36} />
          ))}
          <Logo variant="lockup" tone="black" height={36} />
        </div>
        <div className="flex flex-wrap items-center gap-6 rounded-[var(--jdh-radius-md)] bg-[var(--color-ink)] p-6 dark:border dark:border-[var(--color-ink-border)]">
          {variants.map((variant) => (
            <Logo key={variant} variant={variant} tone="white" height={36} />
          ))}
          <Logo variant="lockup" tone="white" height={36} />
        </div>
      </div>
    </Section>
  )
}
