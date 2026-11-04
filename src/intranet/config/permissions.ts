/**
 * RBAC vocabulary. Permissions are strings of the form `<module>:<action>`.
 * Modules declare the permissions they require in their manifest; the auth
 * layer (`src/lib/auth`) resolves whether the current user holds them.
 *
 * This is the single source of truth for permission strings, so manifests
 * and runtime checks never drift via typos.
 */
export const PERMISSIONS = {
  noticias: {
    read: "noticias:read",
    manage: "noticias:manage",
  },
  documentos: {
    read: "documentos:read",
    manage: "documentos:manage",
  },
  certificados: {
    read: "certificados:read",
    manage: "certificados:manage",
  },
  directorio: {
    read: "directorio:read",
    manage: "directorio:manage",
  },
  eventos: {
    read: "eventos:read",
    manage: "eventos:manage",
  },
  solicitudes: {
    read: "solicitudes:read",
    create: "solicitudes:create",
    manage: "solicitudes:manage",
  },
  induccion: {
    read: "induccion:read",
    manage: "induccion:manage",
  },
  organigrama: {
    read: "organigrama:read",
    manage: "organigrama:manage",
  },
  marca: {
    read: "marca:read",
    manage: "marca:manage",
  },
  ayuda: {
    read: "ayuda:read",
    manage: "ayuda:manage",
  },
  vacaciones: {
    read: "vacaciones:read",
    create: "vacaciones:create",
    manage: "vacaciones:manage",
  },
  // El portal de autogestión es externo y autentica por su cuenta: aquí solo
  // se gobierna quién ve su antesala en la intranet, de ahí que no haya `manage`.
  autogestion: {
    read: "autogestion:read",
  },
  // El catálogo es una app externa y pública: aquí solo se gobierna quién ve su
  // antesala en la intranet, de ahí que no haya `manage`.
  catalogo: {
    read: "catalogo:read",
  },
  perfil: {
    read: "perfil:read",
    manage: "perfil:manage",
  },
  notificaciones: {
    read: "notificaciones:read",
    manage: "notificaciones:manage",
  },
  admin: {
    access: "admin:access",
  },
} as const

/**
 * Roles are named collections of permissions. The mapping role -> permissions
 * is resolved by the auth layer (and ultimately by the identity provider,
 * e.g. Clerk organizations). Kept here as the shared vocabulary.
 */
export const ROLES = {
  employee: "employee",
  editor: "editor",
  admin: "admin",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    (Object.values(ROLES) as string[]).includes(value)
  )
}

/**
 * App Roles de Entra ID (claim `roles` del token) -> `Role[]` del código.
 * Valores desconocidos se descartan (p. ej. un rol nuevo creado en Entra sin
 * su contraparte aquí) en vez de propagar un permiso no mapeado. Sin ningún
 * rol asignado en Entra, el usuario cae en `employee` — el básico por
 * defecto para cualquier miembro autenticado del tenant.
 */
export function normalizeRoles(claim: unknown): Role[] {
  if (!Array.isArray(claim)) return [ROLES.employee]
  const roles = claim.filter(isRole)
  return roles.length > 0 ? roles : [ROLES.employee]
}

/**
 * Permisos que otorga cada rol. `editor` y `admin` se expresan como deltas
 * sobre `employee` (unión, no reemplazo) para que un rol superior nunca
 * pierda accidentalmente algo que el básico ya tenía.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  employee: [
    PERMISSIONS.noticias.read,
    PERMISSIONS.documentos.read,
    PERMISSIONS.certificados.read,
    PERMISSIONS.directorio.read,
    PERMISSIONS.eventos.read,
    PERMISSIONS.induccion.read,
    PERMISSIONS.organigrama.read,
    PERMISSIONS.solicitudes.read,
    PERMISSIONS.solicitudes.create,
    PERMISSIONS.marca.read,
    PERMISSIONS.ayuda.read,
    PERMISSIONS.vacaciones.read,
    PERMISSIONS.vacaciones.create,
    PERMISSIONS.autogestion.read,
    PERMISSIONS.catalogo.read,
    PERMISSIONS.perfil.read,
    PERMISSIONS.perfil.manage,
    PERMISSIONS.notificaciones.read,
  ],
  editor: [
    PERMISSIONS.noticias.manage,
    PERMISSIONS.documentos.manage,
    PERMISSIONS.eventos.manage,
    PERMISSIONS.induccion.manage,
    PERMISSIONS.marca.manage,
    PERMISSIONS.ayuda.manage,
  ],
  admin: [
    PERMISSIONS.certificados.manage,
    PERMISSIONS.directorio.manage,
    PERMISSIONS.organigrama.manage,
    PERMISSIONS.solicitudes.manage,
    PERMISSIONS.vacaciones.manage,
    PERMISSIONS.admin.access,
  ],
}

/** Pura e isomórfica (sin `server-only`): usable en Server Components y en cliente. */
export function permissionsForRoles(roles: readonly Role[]): string[] {
  const granted = new Set<string>(ROLE_PERMISSIONS.employee)
  for (const role of roles) {
    if (role === ROLES.editor || role === ROLES.admin) {
      for (const permission of ROLE_PERMISSIONS.editor) granted.add(permission)
    }
    if (role === ROLES.admin) {
      for (const permission of ROLE_PERMISSIONS.admin) granted.add(permission)
    }
  }
  return [...granted]
}

/** Semántica AND: `held` debe cubrir cada permiso de `required`. `[]` siempre pasa. */
export function hasAll(
  held: readonly string[],
  required: readonly string[]
): boolean {
  return required.every((permission) => held.includes(permission))
}
