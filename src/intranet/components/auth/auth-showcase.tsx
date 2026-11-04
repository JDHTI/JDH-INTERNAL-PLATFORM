import { Logo } from "@/intranet/components/common/logo"
import { FadeIn } from "@/intranet/components/motion/fade-in"
import { WordReveal } from "@/intranet/components/motion/word-reveal"
import { siteConfig } from "@/intranet/config/site"

import { ShowcasePhotos } from "./showcase-photos"

/**
 * The visual half of the sign-in screen: JDH's own operation behind an ink
 * scrim, with the headline typeset over it.
 *
 * Stays a Server Component — only the photo stack and the headline reveal are
 * client, composed as children (same pattern as the rest of the app's use of
 * `components/motion/`).
 *
 * There is exactly ONE instance of this, resized by CSS: a short banner above
 * the form on small screens, the full-height left column from `lg` up. It is
 * deliberately not two instances behind `hidden`/`lg:block`, because both would
 * mount and both would download the photos. What the banner drops on small
 * screens is copy, not imagery — `lg:` reveals the supporting lines.
 *
 * The panel is ink in both themes, like the sidebar and the footer:
 * `--color-ink`/`--color-on-ink` are the tokens that stay fixed across themes
 * (see the note in `globals.css`).
 */
export function AuthShowcase() {
  return (
    <section
      // `isolate` so the photo stack's negative z-index stays behind the copy
      // but still above this section's own ink background.
      className="relative isolate flex h-52 shrink-0 flex-col justify-between overflow-hidden bg-[var(--color-ink)] p-6 text-[var(--color-on-ink)] sm:h-60 lg:h-auto lg:p-12"
    >
      <ShowcasePhotos />

      <FadeIn delay={0.05}>
        <Logo variant="lockup" tone="white" height={30} priority />
      </FadeIn>

      <div className="flex flex-col gap-3 lg:gap-5">
        <FadeIn delay={0.15} y={8}>
          <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase">
            Intranet corporativa
          </p>
        </FadeIn>

        <WordReveal
          as="h1"
          text="Movemos el alimento de Colombia."
          delay={0.3}
          className="max-w-[16ch] text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl xl:text-6xl"
        />

        <FadeIn delay={0.8} y={8} className="hidden lg:block">
          <p className="max-w-[42ch] text-base text-[var(--color-on-ink-muted)]">
            Detrás de cada entrega hay un equipo. Esta es su casa digital.
          </p>
        </FadeIn>

        <FadeIn delay={0.95} y={8} className="hidden lg:block">
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-ink-border)] pt-5">
            <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase">
              {siteConfig.sedes.length} sedes en Colombia
            </p>
            <p className="text-sm text-[var(--color-on-ink-muted)]">
              {siteConfig.sedes.join(" · ")}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
