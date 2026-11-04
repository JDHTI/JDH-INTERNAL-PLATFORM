import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { StatusBadge } from "@/intranet/components/common/status-badge"

import { formatNoticiaDate, zonaLabel } from "../noticias.config"
import type { Noticia } from "../types"

/**
 * Comunicado destacado de la home — el patrón "Hero (inverse)" del catálogo
 * de componentes (`marca/components/catalog/cards-section.tsx`, subsección
 * "Hero (inverse) — media al lado, a alto completo"): `JdhCard` con
 * `variant="inverse"` (fondo ink) + `mediaPosition="start"` (imagen a la
 * izquierda) + `size="lg"`. Se reutiliza tal cual el patrón, no una card
 * nueva.
 *
 * Ocupa su propia fila a ancho completo (no comparte grilla con ningún otro
 * bloque), así que la imagen se ensancha al 38% en `lg:` en vez del `w-52`
 * (208px) fijo del catálogo — a 1440px ese ancho fijo se vería como una
 * franja perdida junto a un cuerpo de texto de más de 1000px. Se pisa el
 * MISMO selector con variante (`group-data-[media-position=start]/card:w-*`)
 * que ya usa `CardMedia` en `jdh-card.tsx`, no un `w-*` plano — mismo patrón
 * ya documentado en `.claude/ARCHITECTURE.md` (2026-07-29) para ganarle a un
 * selector de variante por especificidad/orden en vez de por cascada simple.
 *
 * Devuelve `null` si no hay comunicado (CMS vacío o caído — `queries.ts`
 * degrada a `null` en vez de tumbar la página): al estar en su propia fila,
 * `null` simplemente no deja hueco ni fila vacía.
 */
export function ComunicadoDestacado({
  noticia,
  className,
}: {
  noticia: Noticia | null
  className?: string
}) {
  if (!noticia) return null

  return (
    <JdhCard
      variant="inverse"
      mediaPosition="start"
      size="lg"
      className={className}
    >
      <JdhCard.Media
        src={noticia.coverImage}
        alt=""
        className="hidden sm:block lg:group-data-[media-position=start]/card:w-[38%]"
      >
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <StatusBadge variant="region">{zonaLabel(noticia.zona)}</StatusBadge>
          {noticia.mandatory ? (
            <StatusBadge variant="region">Lectura obligatoria</StatusBadge>
          ) : null}
        </div>
      </JdhCard.Media>
      <JdhCard.Body className="justify-center">
        <JdhCard.Eyebrow withDot>Comunicado destacado</JdhCard.Eyebrow>
        <JdhCard.Title as="h2" className="max-w-3xl text-xl sm:text-2xl">
          {noticia.title}
        </JdhCard.Title>
        <JdhCard.Description className="max-w-3xl">
          {noticia.excerpt}
        </JdhCard.Description>
        <JdhCard.Meta>
          {formatNoticiaDate(noticia.publishedAt, "long")} ·{" "}
          {noticia.readingTimeMin} min de lectura
        </JdhCard.Meta>
        <JdhCard.Footer>
          <JdhButton asChild variant="primary-on-ink" size="sm">
            <Link href={`/noticias/${noticia.slug}`}>
              Leer comunicado
              <ArrowRight aria-hidden />
            </Link>
          </JdhButton>
        </JdhCard.Footer>
      </JdhCard.Body>
    </JdhCard>
  )
}
