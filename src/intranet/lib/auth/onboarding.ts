import "server-only"

import { cookies } from "next/headers"

import { PROFILE_REVIEWED_COOKIE } from "@/intranet/config/session"

export { PROFILE_REVIEWED_COOKIE }

export const PROFILE_REVIEWED_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const

/** For Server Actions: marks this browser session as reviewed. */
export async function markProfileReviewed(): Promise<void> {
  ;(await cookies()).set(PROFILE_REVIEWED_COOKIE, "1", PROFILE_REVIEWED_COOKIE_OPTIONS)
}

/** `?next=` after the form: internal routes only. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  if (value.startsWith("/completar-perfil")) return "/"
  return value
}
