import "server-only"

import { cookies, headers } from "next/headers"

/**
 * Calls internal-platform-api from the server as the signed-in person: the
 * browser's session cookies are forwarded as they came. Inside the server the
 * API is reached by its internal name (API_INTERNAL_URL) instead of the public
 * origin, so the request never leaves the Docker network.
 */
const BASE_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/+$/, "")

export class BackendUnauthenticatedError extends Error {}

export async function backendFetch(
  path: `/${string}`,
  init: RequestInit = {}
): Promise<Response> {
  const cookieHeader = (await cookies()).toString()
  const incoming = await headers()
  // The API rate-limits by client IP: pass the person's address along, or the
  // whole company would share the UI container's quota.
  const forwardedFor = incoming.get("x-forwarded-for") ?? incoming.get("x-real-ip")

  const requestHeaders = new Headers(init.headers)
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader)
  if (forwardedFor) requestHeaders.set("x-forwarded-for", forwardedFor)
  requestHeaders.set("accept", "application/json")

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  })
}

/** GET as JSON; `null` on 404, throws on any other failure. */
export async function backendJson<T>(path: `/${string}`): Promise<T | null> {
  const response = await backendFetch(path)
  if (response.status === 401) throw new BackendUnauthenticatedError()
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`)
  return (await response.json()) as T
}
