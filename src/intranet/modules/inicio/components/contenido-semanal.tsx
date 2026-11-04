import { ArticleBody } from "@/intranet/components/content/article-body"

import type { ContenidoSemanal as ContenidoSemanalData } from "../types"

/**
 * Bloque editorial semanal de la home (contenido genérico configurable desde
 * Strapi, p. ej. un mini-texto de salud mental/bienestar) — ver
 * `getContenidoSemanal`.
 *
 * SIN contenedor a propósito: nada de borde/fondo/padding de card — es
 * contenido limpio tipo blog, no un panel más entre los paneles con borde de
 * la columna vecina (`ProximosEventos`). El título del
 * tópico semanal (`contenido.title`) se muestra grande (`text-2xl`/`text-3xl`)
 * para que se lea de inmediato, a diferencia de la primera versión (`text-lg`,
 * del tamaño de un encabezado de panel).
 *
 * `contenido.secciones` es un array de Blocks (uno por sección del CMS,
 * mínimo 3 — ver `.claude/STRAPI.md` § Módulo: inicio); cada sección se
 * renderiza con su propia `ArticleBody` en vez de aplanarlas en un solo
 * bloque, para que el espaciado entre secciones sea consistente aunque una
 * sección traiga una lista y otra solo párrafos.
 *
 * `<img>` plano (no `next/image`): `next.config.ts` no declara
 * `images.remotePatterns`, mismo criterio que `OverlayCard`/`JdhCard.Media`
 * para imágenes que vienen del CMS.
 *
 * Devuelve `null` si no hay contenido vigente (CMS sin sembrar o caído —
 * `queries.ts` degrada a `null` en vez de tumbar la home).
 */
export function ContenidoSemanal({
  contenido,
}: {
  contenido: ContenidoSemanalData | null
}) {
  if (!contenido) return null

  return (
    <section className="space-y-6">
      {contenido.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contenido.image}
          alt=""
          className="aspect-video w-full rounded-[var(--jdh-radius-sm)] object-cover"
        />
      ) : null}

      <div className="space-y-2">
        {contenido.eyebrow ? (
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            {contenido.eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {contenido.title}
        </h2>
      </div>

      <div className="space-y-6">
        {contenido.secciones.map((bloques, index) => (
          <ArticleBody key={index} blocks={bloques} size="compact" />
        ))}
      </div>
    </section>
  )
}
