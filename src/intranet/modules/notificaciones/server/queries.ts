import "server-only"

import { backendFetch } from "@/intranet/lib/api/backend-fetch"

import { PAGE_SIZE } from "../notificaciones.config"
import type { FeedNotificaciones } from "../types"
import { mapNotificacion, type RawFeedNotificaciones } from "./notificacion.mapper"

/**
 * SEAM API — acceso a datos server-only de notificaciones, sobre
 * `backendFetch` (reenvía el token de sesión de Better Auth como
 * `Authorization: Bearer` a INTRANET-JDH-API). NUNCA usa `@/lib/strapi`: el
 * frontend no lee notificaciones del CMS, solo del motor en Postgres.
 */
async function safe<T>(context: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[notificaciones] fallo consultando la API (${context}):`, error)
    return fallback
  }
}

const FEED_VACIO = (page: number): FeedNotificaciones => ({
  items: [],
  total: 0,
  page,
  pageSize: PAGE_SIZE,
  noLeidas: 0,
})

export async function getNotificaciones(page: number = 1): Promise<FeedNotificaciones> {
  return safe("getNotificaciones", FEED_VACIO(page), async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    const response = await backendFetch(`/notificaciones?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`GET /notificaciones -> ${response.status}`)
    }
    const data = (await response.json()) as RawFeedNotificaciones
    return {
      items: data.items.map(mapNotificacion),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      noLeidas: data.no_leidas,
    }
  })
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await safe("marcarNotificacionLeida", undefined, async () => {
    const response = await backendFetch(`/notificaciones/${id}/leida`, { method: "PATCH" })
    if (!response.ok) {
      throw new Error(`PATCH /notificaciones/${id}/leida -> ${response.status}`)
    }
  })
}

export async function marcarTodasLeidas(): Promise<void> {
  await safe("marcarTodasLeidas", undefined, async () => {
    const response = await backendFetch("/notificaciones/leidas", { method: "PATCH" })
    if (!response.ok) {
      throw new Error(`PATCH /notificaciones/leidas -> ${response.status}`)
    }
  })
}

export async function getPushClavePublica(): Promise<string | null> {
  return safe("getPushClavePublica", null, async () => {
    const response = await backendFetch("/notificaciones/push/clave-publica")
    if (!response.ok) {
      throw new Error(`GET /notificaciones/push/clave-publica -> ${response.status}`)
    }
    const data = (await response.json()) as { clave: string | null }
    return data.clave
  })
}

export interface PushSuscripcionInput {
  endpoint: string
  p256dh: string
  auth: string
  expirationTime?: string
}

export async function registrarPushSuscripcion(dto: PushSuscripcionInput): Promise<void> {
  await safe("registrarPushSuscripcion", undefined, async () => {
    const response = await backendFetch("/notificaciones/push/suscripciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dto),
    })
    if (!response.ok) {
      throw new Error(`POST /notificaciones/push/suscripciones -> ${response.status}`)
    }
  })
}

export async function darDeBajaPushSuscripcion(endpoint: string): Promise<void> {
  await safe("darDeBajaPushSuscripcion", undefined, async () => {
    const params = new URLSearchParams({ endpoint })
    const response = await backendFetch(`/notificaciones/push/suscripciones?${params.toString()}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      throw new Error(`DELETE /notificaciones/push/suscripciones -> ${response.status}`)
    }
  })
}
