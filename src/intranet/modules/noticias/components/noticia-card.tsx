import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { StatusBadge } from "@/intranet/components/common/status-badge"

import { formatNoticiaDate, zonaLabel } from "../noticias.config"
import type { Noticia } from "../types"

/**
 * Tarjeta de noticia/comunicado — composición de `JdhCard` (media arriba,
 * interactiva) idéntica a la primera card del catálogo
 * (`marca/components/catalog/cards-section.tsx`), la referencia visual del
 * diseño §3. No es una card nueva: solo mapea un `Noticia` a esa misma forma.
 */
export function NoticiaCard({ noticia }: { noticia: Noticia }) {
  const eyebrow =
    noticia.tipo === "comunicado" ? "Comunicado" : noticia.category

  return (
    <JdhCard interactive href={`/noticias/${noticia.slug}`} mediaPosition="top">
      <JdhCard.Media src={noticia.coverImage} alt="" height="sm">
        <StatusBadge variant="region" className="absolute top-3 left-3">
          {zonaLabel(noticia.zona)}
        </StatusBadge>
      </JdhCard.Media>
      <JdhCard.Body>
        <JdhCard.Eyebrow>{eyebrow}</JdhCard.Eyebrow>
        <JdhCard.Title>{noticia.title}</JdhCard.Title>
        <JdhCard.Description>{noticia.excerpt}</JdhCard.Description>
        <JdhCard.Meta>
          {formatNoticiaDate(noticia.publishedAt)} · {noticia.readingTimeMin}{" "}
          min de lectura
        </JdhCard.Meta>
      </JdhCard.Body>
    </JdhCard>
  )
}
