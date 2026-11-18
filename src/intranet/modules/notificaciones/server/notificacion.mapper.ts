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

/**
 * El aviso de un plan de acción llega con `/{area}/planes-accion/{id}`, pero quien
 * lo recibe suele ser dueño de proceso de otra área: `/calidad/...` lo devolvería a
 * la guía con «sin acceso». `/mis-planes-de-accion/{id}` abre la misma acción para
 * cualquiera que esté nombrado en ella (y para Calidad también).
 */
const PLAN_DE_ACCION = /^\/[^/]+\/planes-accion\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i

export function hrefNotificacion(href: string): string {
  const plan = PLAN_DE_ACCION.exec(href)
  return plan ? `/mis-planes-de-accion/${plan[1]}` : href
}

export function mapNotificacion(raw: RawNotificacion): Notificacion {
  return {
    id: raw.id,
    titulo: raw.titulo,
    resumen: raw.resumen,
    href: hrefNotificacion(raw.href),
    fuente: raw.fuente,
    leida: raw.leida,
    creadaEn: raw.creada_en,
  }
}
