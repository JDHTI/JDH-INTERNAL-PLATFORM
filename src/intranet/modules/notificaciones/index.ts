/**
 * Superficie pública del módulo de notificaciones. `server/queries.ts` se
 * importa con ruta profunda desde route handlers, nunca a través de este
 * barrel (mismo motivo que `noticias`: es `server-only` y envenenaría
 * cualquier bundle de cliente que solo quiera el manifiesto/ícono).
 */
export { notificacionesModule } from "./notificaciones.module"
export { NotificacionesView } from "./components/notificaciones-view"
export { PushSettingsView } from "./components/push-settings-view"
export type { Notificacion, NotificacionFuente, FeedNotificaciones } from "./types"
