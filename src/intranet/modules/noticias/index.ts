/**
 * Public surface of the noticias module. Other modules and the app/route
 * layer import from here — never from deep internals.
 *
 * Exception: `server/queries.ts` (server-only) and `schemas/noticia.schema.ts`
 * are consumed by the route files (`app/(intranet)/noticias/**`) via a deep
 * import instead of this barrel. `noticiasModule` here is imported by client
 * nav components (`AppSidebar`, `MainNav`, `MobileBottomNav`) for its icon —
 * re-exporting `server-only` code from the same barrel would pull it into
 * every client bundle that imports the manifest. See `.claude/ARCHITECTURE.md`.
 */
export { noticiasModule } from "./noticias.module"
export { NoticiasView } from "./components/noticias-view"
export { NoticiaDetail } from "./components/noticia-detail"
export { NoticiasDestacadas } from "./components/noticias-destacadas"
export { NoticiasDestacadasScroll } from "./components/noticias-destacadas-scroll"
export { ComunicadoDestacado } from "./components/comunicado-destacado"
export { NoticiasMiniSlider } from "./components/noticias-mini-slider"
export type {
  Noticia,
  NoticiaFilters,
  NoticiaTipo,
  NoticiasPage,
  Zona,
  ZonaId,
} from "./types"
