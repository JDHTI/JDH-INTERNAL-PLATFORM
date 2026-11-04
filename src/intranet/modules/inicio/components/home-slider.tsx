import type { CalendarioDia } from "@/intranet/lib/date"
import { Carousel, CarouselContent, CarouselItem } from "@/intranet/components/ui/carousel"
import type { Empleado } from "@/intranet/modules/directorio"
import { CumpleanosMiniCalendario } from "@/intranet/modules/directorio"
import type { Noticia } from "@/intranet/modules/noticias"
import { NoticiasMiniSlider } from "@/intranet/modules/noticias"

import { HomeVideoSlide } from "./home-video-slide"

interface HomeSliderProps {
  noticias: Noticia[]
  cumpleanos: Empleado[]
  /** "YYYY-MM" del mes mostrado en el slide del calendario. */
  mes: string
  /** Grilla del mes, computada en `home-view.tsx` (`buildCalendarGrid`). */
  dias: CalendarioDia[]
}

/**
 * Slider de 3 casillas fijas de la home, reemplaza al antiguo carrusel
 * homogéneo de noticias (`NoticiasCarousel`, eliminado): video / última
 * noticia rotando sola / calendario de cumpleaños del mes. Server Component:
 * `Carousel` ya trae su propio boundary de cliente, y este componente solo
 * compone tres hijos (dos Server Components, uno Client) — no necesita
 * `"use client"` propio.
 *
 * Sin autoplay en el contenedor exterior: a diferencia del carrusel
 * original, las 3 casillas ya no son una lista homogénea que tenga sentido
 * ciclar sola — cada una es un widget distinto. El autoplay vive dentro del
 * slide de noticias (`NoticiasMiniSlider`).
 */
export function HomeSlider({ noticias, cumpleanos, mes, dias }: HomeSliderProps) {
  return (
    <Carousel
      data-lenis-prevent-horizontal
      tabIndex={0}
      opts={{ align: "start", loop: false }}
    >
      <CarouselContent>
        <CarouselItem className="sm:basis-1/2 lg:basis-1/3">
          <HomeVideoSlide />
        </CarouselItem>
        <CarouselItem className="sm:basis-1/2 lg:basis-1/3">
          <NoticiasMiniSlider noticias={noticias} />
        </CarouselItem>
        <CarouselItem className="sm:basis-1/2 lg:basis-1/3">
          <CumpleanosMiniCalendario mes={mes} dias={dias} cumpleanos={cumpleanos} />
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  )
}
