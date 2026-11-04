"use client"

import * as React from "react"

const PUSH_ENDPOINT = "/api/notificaciones/push"

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const array = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i)
  }
  return array
}

/**
 * Alta/baja de Web Push. El permiso del navegador SOLO se pide en respuesta
 * a un gesto explícito del usuario (`activar()`) — nunca al montar, porque
 * un `Notification.requestPermission()` automático es lo que hace que los
 * navegadores bloqueen el permiso de forma permanente.
 */
function esSoportado(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

export function useWebPush() {
  // Lazy init: se evalúa una sola vez, en cliente (React ignora el resultado
  // del server render para el estado inicial de un Client Component montado
  // tras hidratación) — no necesita un efecto aparte solo para esto.
  const [soportado] = React.useState(esSoportado)
  const [activo, setActivo] = React.useState(false)
  // Solo hay algo async que esperar si el navegador soporta push — si no,
  // arranca ya resuelto en vez de despachar un setState síncrono en el efecto.
  const [cargando, setCargando] = React.useState(soportado)

  React.useEffect(() => {
    if (!soportado) return

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setActivo(subscription !== null))
      .finally(() => setCargando(false))
  }, [soportado])

  async function activar(): Promise<void> {
    const permiso = await Notification.requestPermission()
    if (permiso !== "granted") return

    const { clave } = await fetch(`${PUSH_ENDPOINT}`).then((r) => r.json())
    if (!clave) return // Web Push apagado del lado del servidor

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(clave),
    })

    const json = subscription.toJSON()
    await fetch(PUSH_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })

    setActivo(true)
  }

  async function desactivar(): Promise<void> {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      setActivo(false)
      return
    }

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await fetch(`${PUSH_ENDPOINT}?endpoint=${encodeURIComponent(endpoint)}`, {
      method: "DELETE",
    })

    setActivo(false)
  }

  return { soportado, activo, cargando, activar, desactivar }
}
