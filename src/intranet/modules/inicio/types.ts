import type { ArticleBlock } from "@/intranet/lib/strapi"

/**
 * Bloque editorial semanal de la home (`contenido-semanal` en el CMS) — un
 * mini-texto tipo salud mental/bienestar, uno por semana. Ver
 * `getContenidoSemanal` (`server/queries.ts`): siempre es la entrada con la
 * `fechaPublicacion` más reciente que ya pasó, no la última creada.
 */
export interface ContenidoSemanal {
  id: string
  title: string
  /** Overline corto, p. ej. "Bienestar". Vacío si el editor no lo llenó. */
  eyebrow: string
  /**
   * Cuerpo en secciones — mínimo 3, exigido por el CMS (`secciones`, campo
   * repetible con `min: 3` en el content-type). Cada elemento es el Blocks de
   * una sección; deliberadamente sin título propio por sección (ver
   * `.claude/STRAPI.md` § Módulo: inicio) — el único título visible es
   * `title`, el tópico de la semana completa.
   */
  secciones: ArticleBlock[][]
  /** `null` si la entrada no tiene imagen (el campo es opcional en el CMS). */
  image: string | null
  /** ISO `YYYY-MM-DD`. */
  fechaPublicacion: string
}

/**
 * Frase corta de ánimo (`frase-motivacional` en el CMS) que complementa el
 * saludo de la home. A diferencia de `ContenidoSemanal`, no hay una "vigente":
 * todo el pool sembrado queda activo, y `getFraseMotivacional` elige una al
 * azar en cada visita (ver `server/queries.ts`).
 */
export interface FraseMotivacional {
  id: string
  texto: string
}

/**
 * Imagen conmemorativa de un quinquenio (`quinquenio` en el CMS) — carrusel
 * puramente visual de la home, sin redirect ni detalle. `orden` es el
 * criterio editorial explícito de `getQuinquenios` (ver `server/queries.ts`);
 * `null` cuando el editor no lo llenó, en cuyo caso el mapper cae a
 * `createdAt` desc (más recientes primero).
 */
export interface Quinquenio {
  id: string
  title: string
  image: string
  orden: number | null
}
