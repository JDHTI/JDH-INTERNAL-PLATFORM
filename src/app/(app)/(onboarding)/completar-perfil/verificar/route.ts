import type { NextRequest } from "next/server"

import { ONBOARDING_PATH } from "@/intranet/modules/onboarding/onboarding.config"
import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import {
  PROFILE_REVIEWED_COOKIE,
  PROFILE_REVIEWED_COOKIE_OPTIONS,
  safeNextPath,
} from "@/intranet/lib/auth/onboarding"
import { relativeRedirect } from "@/intranet/lib/relative-redirect"

/**
 * First stop of each browser session (`src/proxy.ts`). Asks the API what the
 * person still misses: nothing, the session is marked reviewed and goes on to
 * `next`; something, it goes to the form. A Route Handler because marking the
 * session writes a cookie.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"))

  let pendientes: string[] = []
  try {
    const me = await backendFetch("/users/me")
    if (me.status === 401) return relativeRedirect("/login")
    const response = await backendFetch(ONBOARDING_PATH)
    if (response.ok) {
      pendientes = ((await response.json()) as { pendientes: string[] }).pendientes
    }
  } catch {
    // API down, or the endpoint not there yet: let the session through
    // instead of blocking the whole intranet.
  }

  if (pendientes.length > 0) {
    return relativeRedirect(`/completar-perfil?next=${encodeURIComponent(next)}`)
  }

  const response = relativeRedirect(next)
  response.cookies.set(PROFILE_REVIEWED_COOKIE, "1", PROFILE_REVIEWED_COOKIE_OPTIONS)
  return response
}
