"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { useReducedMotion } from "motion/react"

import { OverlayCard } from "@/intranet/components/cards/overlay-card"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/intranet/components/ui/carousel"

import { zonaLabel } from "../noticias.config"
import type { Noticia } from "../types"

/** Milisegundos entre avances automáticos. */
const AUTOPLAY_DELAY_MS = 5000

/**
 * Slide 2 del slider de la home: la misma fuente de `NoticiasCarousel`
 * (últimas noticias, ver `getUltimasNoticias`), pero UNA sola noticia visible
 * a la vez (`basis-full`) — la casilla completa es una `OverlayCard`, no tres
 * en fila. Mismo patrón de autoplay + `prefers-reduced-motion` que el
 * carrusel de noticias original.
 */
export function NoticiasMiniSlider({ noticias }: { noticias: Noticia[] }) {
  const reduce = useReducedMotion()
  const puedeCiclar = noticias.length > 1

  const plugins = React.useMemo(
    () =>
      puedeCiclar && !reduce
        ? [
            Autoplay({
              delay: AUTOPLAY_DELAY_MS,
              stopOnMouseEnter: true,
              stopOnInteraction: false,
            }),
          ]
        : [],
    [puedeCiclar, reduce]
  )

  if (noticias.length === 0) return null

  return (
    <Carousel
      data-lenis-prevent-horizontal
      tabIndex={0}
      opts={{ align: "start", loop: puedeCiclar }}
      plugins={plugins}
    >
      <CarouselContent>
        {noticias.map((noticia) => (
          <CarouselItem key={noticia.id} className="basis-full">
            <OverlayCard
              src={noticia.coverImage}
              alt=""
              size="xl"
              eyebrow={
                noticia.tipo === "comunicado" ? "Comunicado" : noticia.category
              }
              title={noticia.title}
              description={noticia.excerpt}
              badges={
                <StatusBadge variant="region">
                  {zonaLabel(noticia.zona)}
                </StatusBadge>
              }
              href={`/noticias/${noticia.slug}`}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
