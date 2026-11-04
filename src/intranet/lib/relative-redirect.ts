import { NextResponse } from "next/server"

/**
 * Redirect con `Location` relativa (p. ej. `/completar-perfil?next=%2F`), que
 * el navegador resuelve contra el origen que ya está usando.
 *
 * Usar en Route Handlers en vez de `NextResponse.redirect(new URL(path,
 * request.url))`: en el contenedor (build standalone con `HOSTNAME=0.0.0.0`)
 * `request.url` trae la dirección de bind del servidor, no el dominio
 * público, y el redirect absoluto mandaba al usuario a `https://0.0.0.0:3000`.
 */
export function relativeRedirect(
  location: string,
  init: { status?: number; headers?: HeadersInit } = {}
): NextResponse {
  const headers = new Headers(init.headers)
  headers.set("Location", location)
  return new NextResponse(null, { status: init.status ?? 307, headers })
}
