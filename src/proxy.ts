import { NextResponse, type NextRequest } from "next/server"

import {
  GENERAL_VIEW_PREFIXES,
  PROFILE_REVIEWED_COOKIE,
} from "@/intranet/config/session"

const API_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/+$/, "")

// Every page waits on this call: same limit as backendFetch, under the 30 s at
// which the infrastructure proxy answers 504.
const REFRESH_TIMEOUT_MS = 10_000

const ACCESS_COOKIE = "internal_platform_access"
const REFRESH_COOKIE = "internal_platform_refresh"

function isGeneralView(pathname: string): boolean {
  return GENERAL_VIEW_PREFIXES.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * The access cookie lasts an hour and the browser drops it when it expires.
 * Server-rendered pages forward cookies to the API but cannot set new ones,
 * so the rotation happens here, once, and both the page and the browser get
 * the new tokens.
 */
async function refreshSession(request: NextRequest): Promise<string[] | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return response.headers.getSetCookie()
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasAccess = request.cookies.has(ACCESS_COOKIE)
  const hasRefresh = request.cookies.has(REFRESH_COOKIE)

  let setCookies: string[] = []
  if (!hasAccess && hasRefresh) {
    setCookies = (await refreshSession(request)) ?? []
    for (const raw of setCookies) {
      const [pair] = raw.split(";")
      const index = pair.indexOf("=")
      if (index > 0) request.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
    }
  }

  // Each browser session checks once whether the profile is missing data
  // (sede, contact) before the general view opens.
  const signedIn = hasAccess || setCookies.length > 0
  let response: NextResponse
  if (signedIn && isGeneralView(pathname) && !request.cookies.has(PROFILE_REVIEWED_COOKIE)) {
    const target = new URL("/completar-perfil/verificar", request.url)
    target.searchParams.set("next", `${pathname}${search}`)
    response = NextResponse.redirect(target)
  } else {
    response = NextResponse.next({ request: { headers: request.headers } })
  }

  for (const raw of setCookies) response.headers.append("set-cookie", raw)
  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2|pdf|js|txt|pmtiles|pbf)$).*)"],
}
