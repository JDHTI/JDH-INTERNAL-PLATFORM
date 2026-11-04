/** Route handler same-origin (proxy hacia la API Nest, mantiene el token de sesión del lado servidor). */
export const NOTIFICACIONES_ENDPOINT = "/api/notificaciones"

export const PAGE_SIZE = 10

/**
 * Cadencia del sondeo de la campana. Un valor único (no 5s/30s como
 * `use-sync-status.ts`): todo el tráfico de esta app sale de un único
 * proceso servidor hacia la API (`backendFetch` es `server-only`), así que
 * un sondeo agresivo puede agotar el tier de rate-limiting compartido por
 * IP — ver `SessionThrottlerGuard` en INTRANET-JDH-API antes de bajar esto.
 */
export const POLL_INTERVAL_MS = 60_000
