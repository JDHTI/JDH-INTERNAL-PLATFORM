/** Routes of the general view (the intranet). Everything else is the workspace or public. */
export const GENERAL_VIEW_PREFIXES = [
  "/",
  "/noticias",
  "/documentos",
  "/directorio",
  "/organigrama",
  "/catalogo",
  "/autogestion",
  "/induccion",
  "/ayuda",
  "/notificaciones",
  "/marca",
  "/perfil",
] as const

/**
 * Set once the profile check ran in this browser session (no `maxAge`):
 * closing the browser asks again, so whoever still misses data sees the form
 * on every visit and whoever does not never sees it.
 */
export const PROFILE_REVIEWED_COOKIE = "jdh_perfil_revisado"
