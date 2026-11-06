"use client"

import { permissionsForRoles } from "@/intranet/config/permissions"
import { useMyEmployee } from "@/features/directory/hooks/use-directory"
import { employeePhotoUrl } from "@/features/directory/types/directory.types"
import { useSession } from "@/features/session/hooks/use-session"

function rolesFor(platformRole: string) {
  return platformRole === "owner" || platformRole === "admin"
    ? (["employee", "admin"] as const)
    : (["employee"] as const)
}

/**
 * Client-side session read for the chrome (header, nav, mega menu).
 * `permissions` is always an array so callers can filter while it loads.
 */
export function useCurrentUser() {
  const session = useSession()
  const employee = useMyEmployee()
  const data = session.data

  const user = data
    ? {
        id: data.id,
        name: data.displayName,
        email: data.email,
        jobTitle: data.jobTitle,
        employeeId: employee.data?.id ?? null,
        // Same order as the workspace's SessionAvatar: directory photo, then the sign-in one.
        photoUrl: (employee.data && employeePhotoUrl(employee.data, 96)) ?? data.photoUrl,
        platformRole: data.role,
      }
    : null

  return {
    user,
    permissions: data ? permissionsForRoles([...rolesFor(data.role)]) : [],
    isPending: session.isPending,
    error: session.error,
  }
}
