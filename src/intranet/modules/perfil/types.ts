/** Domain types for the perfil (mi cuenta) module. */

/** Mismo enum `Weekday` de Prisma en INTRANET-JDH-API. */
export type DiaSemana =
  "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO"

/**
 * Franja del horario de contacto tal como la guarda la API
 * (`ContactSchedule`, `GET/PUT /me/horario-contacto`). Cada colaborador
 * define las suyas desde `/perfil/horarios`.
 */
export interface FranjaHorario {
  dia: DiaSemana
  /** `HH:mm`, 24 h. */
  inicio: string
  /** `HH:mm`, 24 h. */
  fin: string
}

/**
 * Fila de presentación del horario de contacto ("Lunes a viernes" /
 * "7:00 a.m. – 5:00 p.m."), derivada de las `FranjaHorario` con
 * `agruparFranjas` (`perfil.config.ts`) o tomada de `HORARIO_POR_DEFECTO`.
 */
export interface HorarioContacto {
  dias: string
  valor: string
  /** Fila de menor énfasis visual (p. ej. "Fuera de horario"). */
  muted?: boolean
}

/** Datos identitarios de solo lectura de la sección "Perfil". */
export interface MiPerfil {
  name: string
  /** Cargo para mostrar (no es un rol de RBAC): el del directorio (DWH), o el `jobTitle` de Entra como respaldo. `null` si no hay ninguno. */
  jobTitle: string | null
  email: string
  /** `null` si la identidad de Entra no pudo vincularse a un registro de `directorio`. */
  employeeId: string | null
  /** `null` when Entra has no photo: initials instead. */
  photoUrl: string | null
  /** ISO `YYYY-MM-DD`, o `null` si no se resolvió desde `directorio`. */
  birthDate: string | null
  /** ISO `YYYY-MM-DD` — fecha de ingreso (`employeeHireDate` de Graph, o `createdDateTime` si RRHH no la llenó). `null` sin `directorio`. */
  hireDate: string | null
  /** Nombre de la sede. `null` sin `directorio`. */
  sede: string | null
  /** Dirección de la sede (derivada, no editable). `null` sin `directorio`. */
  direccion: string | null
}

/**
 * Editable desde `/perfil/contacto`. Sin `direccion`: se deriva de la sede
 * elegida (`Site.address`) — ver `MiPerfil.direccion` para mostrarla de solo
 * lectura. Sin extensión: la asigna un admin desde el directorio.
 */
export interface ContactoDirecto {
  /** `""` mientras siga en la sede placeholder ("Sin sede asignada"). */
  sedeId: string
  telefono: string
  celular: string
  /** Si el celular es visible para el resto de la organización en el directorio. */
  celularVisible: boolean
}

/** Opción del select de sede: activas, sin la placeholder. */
export interface SedeOpcion {
  id: string
  nombre: string
}
