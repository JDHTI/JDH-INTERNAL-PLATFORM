import "server-only"

import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { hasAll, permissionsForRoles, type Role } from "@/intranet/config/permissions"
import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import { PROFILE_PHOTO_URL } from "@/shared/lib/api-client"

/**
 * Provider-agnostic auth facade. The rest of the intranet depends on THIS
 * interface; the session itself is internal-platform-api's Entra SSO.
 * `jobTitle` is display-only and unrelated to `roles`/`permissions`.
 */
export interface CurrentUser {
  id: string
  name: string
  email: string
  jobTitle: string | null
  /** Directory id (`/directory/employees/me`); `null` before the first sync. */
  employeeId: string | null
  roles: Role[]
  permissions: string[]
  /** `null` when Entra has no photo: callers fall back to initials. */
  photoUrl: string | null
  /** Platform role as the API names it (`owner`, `admin`, `moderator`, `user`). */
  platformRole: string
}

interface UserDto {
  id: string
  name: string
  email: string | null
  job_title: string | null
  role: string
  photo_available: boolean
}

/** Platform owners and admins get the intranet's admin permissions too. */
export function rolesFor(platformRole: string): Role[] {
  return platformRole === "owner" || platformRole === "admin" ? ["employee", "admin"] : ["employee"]
}

/** Memoized per request: the layout and the page both ask. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const [meResponse, employeeResponse] = await Promise.all([
    backendFetch("/users/me"),
    backendFetch("/directory/employees/me").catch(() => null),
  ])
  // Only a 401 means "no session". Anything else is the API failing, and
  // sending the person to /login for it would loop; the error page retries.
  if (meResponse.status === 401) return null
  if (!meResponse.ok) throw new Error(`GET /users/me -> ${meResponse.status}`)

  const user = (await meResponse.json()) as UserDto
  const employee =
    employeeResponse?.ok ? ((await employeeResponse.json()) as { id: string }) : null
  const roles = rolesFor(user.role)

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    jobTitle: user.job_title,
    employeeId: employee?.id ?? null,
    roles,
    permissions: permissionsForRoles(roles),
    photoUrl: user.photo_available ? PROFILE_PHOTO_URL : null,
    platformRole: user.role,
  }
})

/** Redirects to `/login` if unauthenticated; returns the user otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function hasPermissions(required: string[]): Promise<boolean> {
  if (required.length === 0) return true
  const user = await getCurrentUser()
  if (!user) return false
  return hasAll(user.permissions, required)
}

/** 404 (not 403) on a permission miss, so a gated route does not reveal itself. */
export async function requirePermissions(required: string[]): Promise<CurrentUser> {
  const user = await requireUser()
  if (!hasAll(user.permissions, required)) notFound()
  return user
}
