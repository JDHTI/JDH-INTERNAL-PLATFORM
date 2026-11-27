import { OverlayCard } from "@/intranet/components/cards/overlay-card"
import { SectionHeader } from "@/intranet/components/common/section-header"

import type { Noticia } from "../types"

/**
 * Bloque reutilizable de "noticias destacadas": selección aleatoria en cada
 * vista (ver `getNoticiasDestacadas` en `server/queries.ts`), renderizada con
 * `OverlayCard` — imagen a sangre completa con el título superpuesto sobre un
 * degradado. El `excerpt` de la noticia va como `description`: `OverlayCard`
 * ya trae esa interacción (se revela al hover/focus, y siempre en touch) —
 * antes se omitía y esa interacción quedaba sin usar. Mismo componente que ya
 * usa el catálogo de diseño (`marca/.../cards-section.tsx` § "Overlay —
 * imagen al 100%, texto al hover"), no uno nuevo.
 *
 * Pensado para incrustarse en cualquier página de la intranet (hoy: pie de
 * `/sig/control-documental`), por eso vive en el barrel público del módulo en vez de
 * quedar privado a una sola ruta.
 *
 * Server Component: recibe las noticias ya resueltas, no llama a Strapi. Si
 * no hay noticias no renderiza nada (mismo criterio que `DocumentosDestacados`:
 * una sección vacía es ruido, no información).
 */
export function NoticiasDestacadas({
  noticias,
  title = "Noticias destacadas",
}: {
  noticias: Noticia[]
  title?: string
}) {
  if (noticias.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-10">
      <SectionHeader
        eyebrow="Destacadas"
        title={title}
        description="Lo más reciente de la intranet."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {noticias.map((noticia) => (
          <OverlayCard
            key={noticia.id}
            src={noticia.coverImage}
            alt=""
            title={noticia.title}
            description={noticia.excerpt}
            href={`/noticias/${noticia.slug}`}
            size="sm"
          />
        ))}
      </div>
    </section>
  )
}
