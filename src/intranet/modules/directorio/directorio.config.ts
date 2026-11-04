import type { EmpleadoFilters } from "./types"

/** Filas por página. Cuando la API real exista, lo resolverá su paginación. */
export const PAGE_SIZE = 10

/**
 * Columnas de `DirectorioTable` (ver `src/components/data/data-table.tsx`).
 * La última (40px) es el chevron decorativo "Ver perfil" — la fila completa
 * ya navega a `/directorio/[id]` vía `rowHref`.
 *
 * "Persona" y "Correo" llevan un piso (`minmax(200px, …)` / `minmax(150px,
 * …)`) en vez de un `fr` suelto: en pantallas anchas se comportan igual que
 * antes (el piso nunca se activa, sobra espacio), pero en mobile evita que
 * ambas columnas se encojan hasta volverse ilegibles. Es lo que hace que el
 * ancho mínimo de la fila — y por tanto cuánto hay que arrastrar en el
 * scroll horizontal propio de la tabla — salga del contenido real en vez de
 * un total fijo inventado a mano.
 */
export const GRID_TEMPLATE =
  "minmax(200px,1.2fr) 220px 220px minmax(150px,1fr) 40px"

/** Espera antes de reflejar el término de búsqueda en la URL. */
export const SEARCH_DEBOUNCE_MS = 300

/** Valor y etiqueta de la opción "todas las sedes" del dropdown. */
export const SEDE_ALL = "all"
export const SEDE_ALL_LABEL = "Todas las sedes"

const BASE_PATH = "/directorio"

/**
 * Construye la URL del listado a partir de filtros parciales, omitiendo los
 * valores por defecto (`sede: "all"`, `q: ""`, `page: 1`) para no ensuciar la
 * URL. Que `page` se omita cuando no se pasa explícitamente es lo que resetea
 * la paginación a la página 1 en cada búsqueda o cambio de sede.
 */
export function directorioHref(
  filters: Partial<EmpleadoFilters>
): `/${string}` {
  const params = new URLSearchParams()
  if (filters.sede && filters.sede !== SEDE_ALL)
    params.set("sede", filters.sede)
  if (filters.q) params.set("q", filters.q)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))

  const qs = params.toString()
  return (qs ? `${BASE_PATH}?${qs}` : BASE_PATH) as `/${string}`
}

/** Ruta del perfil de un empleado. */
export function empleadoHref(id: string): `/${string}` {
  return `${BASE_PATH}/${id}`
}

const ADMIN_BASE_PATH = "/admin/directorio"

/** Mismo criterio que `directorioHref`, pero para el CRUD de `/admin/directorio`. */
export function adminDirectorioHref(
  filters: Partial<EmpleadoFilters>
): `/${string}` {
  const params = new URLSearchParams()
  if (filters.sede && filters.sede !== SEDE_ALL)
    params.set("sede", filters.sede)
  if (filters.q) params.set("q", filters.q)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))

  const qs = params.toString()
  return (qs ? `${ADMIN_BASE_PATH}?${qs}` : ADMIN_BASE_PATH) as `/${string}`
}

/**
 * Columnas de `EmpleadosAdminTable` (`/admin/directorio`) — más densas que
 * `GRID_TEMPLATE` público: agrega estado, origen (Entra/Manual) y acciones.
 */
export const EMPLEADO_ADMIN_GRID_TEMPLATE =
  "minmax(200px,1.2fr) 180px minmax(150px,1fr) 170px 110px 120px 90px"

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

function parseIsoDate(iso: string): {
  year: number
  month: number
  day: number
} {
  const [year, month, day] = iso.split("-").map(Number)
  return { year, month, day }
}

/** "2019-03-12" → "12 de marzo de 2019". Parseo manual: evita el corrimiento
 * de día que introduce `new Date(iso)` al interpretar la fecha en UTC.
 * `null` cuando el empleado viene de Entra ID y no tiene `employeeHireDate`
 * poblado (atributo administrado por IT/RRHH, no siempre presente). */
export function formatFechaIngreso(iso: string | null): string {
  if (!iso) return "No disponible"
  const { year, month, day } = parseIsoDate(iso)
  return `${day} de ${MESES[month - 1]} de ${year}`
}

/** "2019-03-12" → "7 años y 4 meses en JDH", calculado contra `now`. */
export function formatAntiguedad(
  iso: string | null,
  now: Date = new Date()
): string {
  if (!iso) return "No disponible"
  const { year, month, day } = parseIsoDate(iso)
  let years = now.getFullYear() - year
  let months = now.getMonth() + 1 - month
  if (now.getDate() < day) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years <= 0) {
    return `${months} ${months === 1 ? "mes" : "meses"} en JDH`
  }
  const yearsLabel = years === 1 ? "año" : "años"
  if (months === 0) return `${years} ${yearsLabel} en JDH`

  const monthsLabel = months === 1 ? "mes" : "meses"
  return `${years} ${yearsLabel} y ${months} ${monthsLabel} en JDH`
}

/** "1990-03-15" → "15 de marzo" — sin año: es el cumpleaños de un tercero.
 * `null` cuando Entra no tiene `birthday` poblado (campo de perfil personal
 * de Microsoft 365, casi nunca lleno) — se espera que sea la mayoría. */
export function formatCumpleanos(iso: string | null): string {
  if (!iso) return "Sin fecha registrada"
  const { month, day } = parseIsoDate(iso)
  return `${day} de ${MESES[month - 1]}`
}

/**
 * Días desde `now` hasta la próxima ocurrencia del día/mes de `iso`, ignorando
 * el año de nacimiento. 0 = hoy; envuelve al año siguiente si ya pasó este año.
 * Usa fechas a mediodía UTC para el cálculo de distancia y evitar que un
 * corrimiento de huso horario cambie el conteo de días en ±1. `null` (sin
 * fecha registrada en Entra) ordena siempre al final.
 */
export function diasHastaProximoCumpleanos(
  iso: string | null,
  now: Date = new Date()
): number {
  if (!iso) return Infinity
  const { month, day } = parseIsoDate(iso)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  let next = Date.UTC(now.getFullYear(), month - 1, day)
  if (next < today) next = Date.UTC(now.getFullYear() + 1, month - 1, day)
  return Math.round((next - today) / (1000 * 60 * 60 * 24))
}
