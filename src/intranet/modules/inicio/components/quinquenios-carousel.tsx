"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { useReducedMotion } from "motion/react"

import { Carousel, CarouselContent, CarouselItem } from "@/intranet/components/ui/carousel"
import { cn } from "@/intranet/lib/utils"

import type { Quinquenio } from "../types"

/** Milisegundos entre avances automáticos — mismo ritmo que `NoticiasMiniSlider`. */
const AUTOPLAY_DELAY_MS = 5000

/**
 * Carrusel puramente visual de imágenes conmemorativas de quinquenios (5/10/
 * 15/20 años en la compañía) — sin redirect ni detalle, solo imagen + título.
 * Vive en la columna derecha de la home, encima de `ProximosEventos` (ver
 * `HomeView`).
 *
 * Mismo patrón de autoplay + `prefers-reduced-motion` que
 * `NoticiasMiniSlider`: sin controles de flecha (no hay nada más que "ver la
 * siguiente foto"), un slide a la vez porque la columna es angosta (`1fr`).
 *
 * `<img>` plano (no `next/image`): `next.config.ts` no declara
 * `images.remotePatterns`, mismo criterio que `ContenidoSemanal`/`OverlayCard`
 * para imágenes que vienen del CMS.
 *
 * Devuelve `null` si no hay entradas (CMS sin sembrar o caído — `queries.ts`
 * ya degrada a `[]`), igual que el resto de bloques de la home.
 */
export function QuinqueniosCarousel({
  quinquenios,
}: {
  quinquenios: Quinquenio[]
}) {
  const reduce = useReducedMotion()
  const puedeCiclar = quinquenios.length > 1

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

  if (quinquenios.length === 0) return null

  return (
    <div
      className={cn(
        "border p-6",
        "border-transparent bg-primary text-primary-foreground dark:border-[var(--color-ink-border)]"
      )}
    >
      <h2 className="mb-4 text-base font-bold">Quinquenios</h2>
      <Carousel
        data-lenis-prevent-horizontal
        tabIndex={0}
        opts={{ align: "start", loop: puedeCiclar }}
        plugins={plugins}
      >
        <CarouselContent>
          {quinquenios.map((quinquenio) => (
            <CarouselItem key={quinquenio.id} className="basis-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quinquenio.image}
                alt=""
                className="aspect-[4/3] w-full rounded-[var(--jdh-radius-sm)] object-cover"
              />
              <p className="mt-3 text-sm font-medium">{quinquenio.title}</p>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
