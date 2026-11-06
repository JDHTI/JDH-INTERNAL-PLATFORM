/** Dominio del módulo de notificaciones. */

/** `PQRSF`: el aviso de una novedad en un caso (href relativo `/{area}/pqrsf/{id}`, dentro del workspace). */
export type NotificacionFuente = "NOTICIA" | "EVENTO" | "CERTIFICADO" | "PQRSF"

export interface Notificacion {
  id: string
  titulo: string
  resumen: string | null
  href: string
  fuente: NotificacionFuente
  leida: boolean
  /** ISO 8601. El formato relativo ("hace 10 min") se calcula en cliente, ver `format-relativo.ts`. */
  creadaEn: string
}

export interface FeedNotificaciones {
  items: Notificacion[]
  total: number
  page: number
  pageSize: number
  noLeidas: number
}

export interface NotificacionesFilters {
  page: number
}
