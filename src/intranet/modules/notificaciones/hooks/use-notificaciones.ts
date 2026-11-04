"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { NOTIFICACIONES_ENDPOINT, POLL_INTERVAL_MS } from "../notificaciones.config"
import type { FeedNotificaciones } from "../types"

export const notificacionesKeys = {
  all: ["notificaciones"] as const,
  feed: (page: number) => [...notificacionesKeys.all, "feed", page] as const,
}

/**
 * Feed + conteo de no leídas EN UNA SOLA llamada (el backend ya los junta en
 * la misma respuesta) — la campana no necesita un segundo endpoint para el
 * badge. Respaldado por el route handler `/api/notificaciones`, que a su vez
 * usa el seam `getNotificaciones` server-only.
 */
export function useNotificaciones(page: number = 1) {
  return useQuery<FeedNotificaciones>({
    queryKey: notificacionesKeys.feed(page),
    queryFn: async () => {
      const res = await fetch(`${NOTIFICACIONES_ENDPOINT}?page=${page}`)
      if (!res.ok) throw new Error("Error al cargar notificaciones")
      return res.json()
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })
}

export function useMarcarLeida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${NOTIFICACIONES_ENDPOINT}/${id}/leida`, { method: "PATCH" })
      if (!res.ok) throw new Error("Error al marcar como leída")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificacionesKeys.all })
    },
  })
}

export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${NOTIFICACIONES_ENDPOINT}/leidas`, { method: "PATCH" })
      if (!res.ok) throw new Error("Error al marcar todas como leídas")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificacionesKeys.all })
    },
  })
}
