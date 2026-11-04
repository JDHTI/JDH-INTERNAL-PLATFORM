/**
 * Superficie pública del módulo `inicio` — la home de la intranet (`/`).
 *
 * A diferencia de los demás módulos, NO tiene manifiesto ni se registra en
 * `src/config/modules.ts`: no es una funcionalidad navegable que deba aparecer
 * en el menú o en un catálogo, es la página raíz del shell. Mismo caso que
 * `onboarding`, que tampoco se registra por ser un gate y no un destino.
 *
 * A diferencia de la primera iteración, SÍ tiene `server/` (2026-07-30): el
 * bloque de contenido semanal (`contenido-semanal` en el CMS) no tiene otro
 * consumidor más que la home, así que su seam vive aquí en vez de forzarlo
 * dentro de `noticias` o `eventos`. El resto de los bloques de la home
 * (comunicado, cumpleaños, próximos eventos, nuevos ingresos) los siguen
 * sirviendo las queries de `directorio`/`eventos`/`noticias`, y `page.tsx` las
 * llama directamente (deep import a cada seam, ver el comentario ahí).
 *
 * `server/queries.ts` se importa por ruta profunda desde `page.tsx`, nunca
 * re-exportado por este barrel — mismo contrato que todo módulo (`server-only`
 * no debe filtrarse a un import que un Client Component también use).
 */
export { ContenidoSemanal } from "./components/contenido-semanal"
export { HomeView } from "./components/home-view"
export { QuinqueniosCarousel } from "./components/quinquenios-carousel"
export { hoy, primerNombre, saludoPara } from "./inicio.config"
export {
  EVENTOS_LIMIT,
  NOTICIAS_LIMIT,
  NUEVOS_INGRESOS_LIMIT,
  QUINQUENIOS_LIMIT,
  TIME_ZONE,
} from "./inicio.config"
// Alias para no colisionar con el componente `ContenidoSemanal` de arriba —
// TS marca "Duplicate identifier" al reexportar el mismo nombre como valor y
// como tipo desde dos módulos distintos en un barrel (aunque el merge sería
// legal si viniera de un solo archivo). Ningún consumidor externo lo usa
// todavía (los archivos internos del módulo importan el tipo por ruta
// relativa a `../types`, no por este barrel).
export type { ContenidoSemanal as ContenidoSemanalData } from "./types"
