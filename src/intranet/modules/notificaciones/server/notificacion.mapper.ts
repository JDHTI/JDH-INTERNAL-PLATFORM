import type { Notificacion, NotificacionFuente } from "../types"

/** Forma cruda tal como la entrega INTRANET-JDH-API (`GET /notificaciones`, presenter `toRawNotificacion`). */
export interface RawNotificacion {
  id: string
  titulo: string
  resumen: string | null
  href: string
  fuente: NotificacionFuente
  leida: boolean
  creada_en: string
}

export interface RawFeedNotificaciones {
  items: RawNotificacion[]
  total: number
  page: number
  pageSize: number
  no_leidas: number
}

export function mapNotificacion(raw: RawNotificacion): Notificacion {
  return {
    id: raw.id,
    titulo: raw.titulo,
    resumen: raw.resumen,
    href: raw.href,
    fuente: raw.fuente,
    leida: raw.leida,
    creadaEn: raw.creada_en,
  }
}
