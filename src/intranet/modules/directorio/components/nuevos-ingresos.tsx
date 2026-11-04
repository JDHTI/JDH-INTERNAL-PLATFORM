"use client"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { SectionHeader } from "@/intranet/components/common/section-header"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/intranet/components/ui/carousel"

import { empleadoHref, formatFechaIngreso } from "../directorio.config"
import type { EmpleadoDetalle } from "../types"

/**
 * "Conoce a nuestros nuevos integrantes": los últimos ingresos a la compañía
 * según `EmployeeDetail.hireDate` (ver `getNuevosIngresos`, recortado a
 * `NUEVOS_INGRESOS_LIMIT` = 10 en `page.tsx`). Slider Embla — 3 tarjetas
 * visibles a la vez en desktop (`lg:basis-1/3`), 2 en tablet (`sm:basis-1/2`),
 * 1 en mobile (`basis-full`, el default de `CarouselItem`) — mismo patrón que
 * el resto de carruseles del sitio. Sin autoplay: a diferencia de un banner
 * rotativo, esto es una vitrina para leer perfil por perfil. En desktop
 * (`sm:` en adelante) suma `CarouselPrevious`/`CarouselNext` — los botones
 * redondos de flecha, sin usar en ningún otro carrusel del sitio (los demás
 * son de arrastre puro) — a los lados del slider (`-left-4`/`-right-4`, no
 * el `-left-12` por defecto: `<main>` solo tiene 24px de padding lateral —
 * `px-6` — y el offset por defecto se saldría del viewport en pantallas
 * angostas). En mobile se ocultan (`hidden sm:flex`) y se mantiene solo el
 * arrastre táctil. `loop` solo si hay más de 3, igual criterio que
 * `NoticiasCarousel` — con `loop`, ninguno de los dos botones queda
 * deshabilitado nunca (siempre hay a dónde seguir).
 *
 * Cada tarjeta es una `JdhCard` enlazada al perfil del directorio, sin media:
 * la foto va como avatar circular de 96px (la versión grande cuando existe,
 * `photoUrlGrande`), no como imagen full-bleed — es un retrato de persona, no
 * una portada editorial, y recortarlo a un rectángulo se ve mal cuando la
 * mayoría son fotos de perfil de Outlook.
 *
 * No renderiza nada si no hay ingresos con fecha conocida (directorio recién
 * sembrado, o el backend caído — `queries.ts` degrada a lista vacía).
 *
 * Dos ajustes puntuales sobre `JdhCard`/`Carousel` para que el drag del
 * slider se vea limpio:
 * - `JdhCard` (`interactive: true`) trae el anillo de foco en
 *   `focus-within`, no en `focus-visible` como `OverlayCard` — al arrastrar
 *   el carrusel con mouse, el `mousedown` sobre el `<Link>` de la tarjeta le
 *   da foco y ese anillo (negro, `--ring` = `--color-focus`) aparece aunque
 *   no sea navegación de teclado. Se pisa acá con `focus-within:ring-0` +
 *   `focus-visible:ring-2` en vez de tocar `jdh-card.tsx` (lo usan otras 19
 *   páginas; no todas garantizan que el foco caiga siempre en el elemento
 *   raíz, así que no es un cambio seguro de hacer global).
 * - `CarouselItem` no traía padding vertical: el `hover:-translate-y-0.5` de
 *   la tarjeta la sube 2px, y sin espacio de sobra ahí el `overflow-hidden`
 *   del viewport de Embla (interno a `CarouselContent`, no configurable
 *   desde afuera) recortaba el borde superior. `py-2` le da margen para
 *   levantarse sin tocar el borde del contenedor.
 */
export function NuevosIngresos({
  empleados,
}: {
  empleados: EmpleadoDetalle[]
}) {
  if (empleados.length === 0) return null

  const puedeCiclar = empleados.length > 3

  return (
    <section className="space-y-4">
      <SectionHeader
        eyebrow="Bienvenidos"
        title="Conoce a nuestros nuevos integrantes"
        description="Las personas que se sumaron más recientemente al equipo JDH."
        size="compact"
      />

      <Carousel
        data-lenis-prevent-horizontal
        tabIndex={0}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        opts={{ align: "start", loop: puedeCiclar }}
      >
        <CarouselContent>
          {empleados.map((empleado) => (
            <CarouselItem
              key={empleado.id}
              className="py-2 sm:basis-1/2 lg:basis-1/3"
            >
              <JdhCard
                href={empleadoHref(empleado.id)}
                size="md"
                className="h-full focus-within:ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <JdhCard.Body className="items-center text-center">
                  <InitialsAvatar
                    name={empleado.nombre}
                    src={empleado.photoUrlGrande ?? empleado.photoUrl ?? undefined}
                    size="xl"
                  />
                  <JdhCard.Title className="mt-2">
                    {empleado.nombre}
                  </JdhCard.Title>
                  <JdhCard.Description>{empleado.cargo}</JdhCard.Description>
                  <JdhCard.Meta>
                    {[empleado.area, empleado.sede].filter(Boolean).join(" · ")}
                  </JdhCard.Meta>
                  {/* `w-full` porque el body centra sus hijos (`items-center`):
                      sin esto el divisor de `separated` mediría lo que mide el
                      texto, no el ancho de la tarjeta. */}
                  {empleado.fechaIngreso ? (
                    <JdhCard.Footer separated className="w-full justify-center">
                      <JdhCard.Meta>
                        Ingresó el {formatFechaIngreso(empleado.fechaIngreso)}
                      </JdhCard.Meta>
                    </JdhCard.Footer>
                  ) : null}
                </JdhCard.Body>
              </JdhCard>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="hidden -left-4 sm:flex" />
        <CarouselNext className="hidden -right-4 sm:flex" />
      </Carousel>
    </section>
  )
}
