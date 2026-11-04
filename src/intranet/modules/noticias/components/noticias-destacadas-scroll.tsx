import { OverlayCard } from "@/intranet/components/cards/overlay-card"
import { SectionHeader } from "@/intranet/components/common/section-header"

import type { Noticia } from "../types"

/**
 * Variante en scroll horizontal de "noticias destacadas": mismo dato
 * (`getNoticiasDestacadas` — selección aleatoria de un pool de recientes, ver
 * el comentario en `server/queries.ts`) y misma card (`OverlayCard`) que
 * `NoticiasDestacadas`, solo cambia el contenedor. Pensada para páginas donde
 * la sección se beneficia de no competir en alto con el resto del layout
 * (hoy: pie de `/eventos`).
 *
 * Sin librería de carrusel (se probó `embla` vía shadcn `carousel` y se
 * revirtió — ver `.claude/ARCHITECTURE.md` 2026-07-22): en mobile es un
 * `flex` con `overflow-x-auto` + `scroll-snap` nativo (swipe del navegador,
 * sin JS, sin flechas); de `sm` en adelante pasa a `grid` normal — no hay
 * overflow que scrollear, todo cabe en pantalla. Server Component: no
 * necesita estado ni un `"use client"` en absoluto.
 *
 * `data-lenis-prevent-horizontal` (no `data-lenis-prevent` a secas): solo
 * los gestos horizontales se le quitan a Lenis, para que el swipe nativo de
 * la fila funcione; la rueda vertical sigue yendo al scroll suave de la
 * página. Con el atributo genérico, Lenis soltaba también la rueda vertical
 * y el scroll nativo que la reemplazaba chocaba con su animación en curso
 * (ver `.claude/ARCHITECTURE.md` 2026-10-06).
 */
export function NoticiasDestacadasScroll({
  noticias,
  title = "Noticias destacadas",
}: {
  noticias: Noticia[]
  title?: string
}) {
  if (noticias.length === 0) return null

  return (
    <section className="mt-10 border-t border-border pt-6">
      <SectionHeader
        eyebrow="Destacadas"
        title={title}
        description="Lo más reciente de la intranet."
        size="compact"
      />
      <div
        data-lenis-prevent-horizontal
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-3"
      >
        {noticias.map((noticia) => (
          <div
            key={noticia.id}
            className="w-[85%] shrink-0 snap-start sm:w-auto sm:shrink"
          >
            <OverlayCard
              src={noticia.coverImage}
              alt=""
              title={noticia.title}
              description={noticia.excerpt}
              href={`/noticias/${noticia.slug}`}
              size="sm"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
