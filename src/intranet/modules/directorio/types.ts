/** Domain types for the directorio module. */

export interface Empleado {
  id: string
  nombre: string
  cargo: string
  /** Nombre visible de la sede, p. ej. "Centro administrativo Itagüí". */
  sede: string
  /** Slug de la sede — valor del dropdown y del query param `?sede=`. */
  sedeId: string
  /** `null` para empleados sin correo corporativo (creados manualmente, ver `EmpleadoAdmin`). */
  email: string | null
  /** Foto de perfil; `null` cae a iniciales en `InitialsAvatar`. */
  photoUrl: string | null
  /**
   * ISO `YYYY-MM-DD`. Para el directorio de cumpleaños — no se muestra el
   * año a terceros. `null` cuando Entra ID no tiene `birthday` poblado (campo
   * de perfil personal de Microsoft 365, casi nunca lleno) — se espera que
   * sea la mayoría de empleados.
   */
  fechaNacimiento: string | null
}

export interface EmpleadoFilters {
  /** Búsqueda server-side sobre nombre, cargo y correo. */
  q: string
  /** `sedeId` o `"all"`. */
  sede: string
  page: number
}

export interface EmpleadosPage {
  items: Empleado[]
  total: number
  page: number
  pageSize: number
}

/** Sede con su conteo, para el dropdown del toolbar. */
export interface SedeOption {
  id: string
  nombre: string
  count: number
}

export interface JefeInmediato {
  nombre: string
  cargo: string
}

/** `Empleado` extendido con los campos exclusivos de la vista de perfil. */
export interface EmpleadoDetalle extends Empleado {
  estado: string
  /**
   * ISO `YYYY-MM-DD`. La antigüedad se deriva de esta fecha, no se almacena.
   * `null` cuando Entra ID no tiene `employeeHireDate` poblado (atributo
   * administrado por IT/RRHH, no siempre presente).
   */
  fechaIngreso: string | null
  jornada: string
  area: string
  extension: string
  /** `""` si no tiene línea fija. */
  telefonoFijo: string
  /**
   * Solo llega si la persona activó "Mostrar mi celular en el directorio"
   * (`/perfil/contacto`); `null` si lo ocultó o no lo ha registrado — la API
   * nunca envía el número oculto.
   */
  celularPublico: string | null
  /** Dirección de la sede (derivada de `Site.address`, no editable aquí). */
  direccion: string
  /** Asignado manualmente por un admin — distingue un manager con personas a cargo. */
  esJefe: boolean
  /** `null` para los cargos sin jefe directo dentro de la compañía. */
  jefe: JefeInmediato | null
  /** Foto en 432x432 para el hero/modal del perfil; `null` cae a iniciales igual que `photoUrl`. */
  photoUrlGrande: string | null
}

/**
 * `EmpleadoDetalle` + los campos que solo necesita el CRUD de
 * `/admin/directorio`: ids crudos para preseleccionar el select/manager en
 * el formulario de edición (el detalle público solo trae nombres para
 * mostrar), el booleano `activo` (para un switch, a diferencia del string
 * `estado`), y si viene sincronizado desde Entra ID — determina qué campos
 * quedan bloqueados en el formulario (ver `empleado-form-modal.tsx`).
 */
export interface EmpleadoAdmin extends EmpleadoDetalle {
  activo: boolean
  /**
   * Si es `true`, el sync gestiona `nombre`/`email`/`area`/`activo` (los
   * siembra en cada corrida) y `fechaIngreso`/`jefeInmediatoId` (los siembra
   * el sync para TODO empleado con `entraId`, no solo al crearlo) — el
   * formulario de edición los bloquea. Cargo, sede, cumpleaños, es_jefe y
   * contacto siguen editables siempre.
   */
  sincronizadoEntra: boolean
  /** `null` si no tiene jefe asignado. */
  jefeInmediatoId: string | null
  /** Celular completo, visible o no en el directorio (ver `mostrarEnDirectorio`). */
  celular: string
  mostrarEnDirectorio: boolean
}

/** Página paginada de `EmpleadoAdmin`, para la tabla de `/admin/directorio`. */
export interface EmpleadosAdminPage {
  items: EmpleadoAdmin[]
  total: number
  page: number
  pageSize: number
}

/** Opción para el select de "jefe inmediato" en el formulario de alta/edición. */
export interface JefeOption {
  id: string
  nombre: string
  cargo: string
}

/** Compañero de área, para la tarjeta "Equipo" del perfil. */
export interface CompaneroEquipo {
  id: string
  nombre: string
  cargo: string
  sede: string
}

/** Fila del CRUD de sedes (`/admin/sedes`) — incluye inactivas, a diferencia de `SedeOption`. */
export interface SedeAdmin {
  id: string
  nombre: string
  direccion: string
  activa: boolean
  /** `null` si el backend no calculó el conteo (no debería pasar en `/sedes/admin`). */
  cantidadEmpleados: number | null
}

export type SyncTrigger = "MANUAL" | "PROGRAMADO"
export type SyncRunStatus = "EN_CURSO" | "COMPLETADO" | "FALLIDO"

/**
 * Corrida del sync de directorio (manual, desde `/admin/directorio`, o del
 * cron de las 23:59 hora Colombia) — ver `DirectorySyncRun` en
 * INTRANET-JDH-API. Es la fuente de verdad del estado: "¿hay un sync
 * corriendo?" es "¿existe una corrida con `estado === 'EN_CURSO'`?".
 */
export interface SyncRun {
  id: string
  disparador: SyncTrigger
  estado: SyncRunStatus
  /** `null` mientras `estado === "EN_CURSO"`. */
  creados: number | null
  actualizados: number | null
  desactivados: number | null
  sinSede: number | null
  fotos: number | null
  /** Ambos `null` salvo que `estado === "FALLIDO"`. */
  errorCode: string | null
  errorMessage: string | null
  /** `id` (oid de Entra) del admin que la disparó — `null` en `PROGRAMADO`. */
  disparadoPor: string | null
  /** ISO datetime. */
  fechaInicio: string
  /** ISO datetime. `null` mientras `estado === "EN_CURSO"`. */
  fechaFin: string | null
}
