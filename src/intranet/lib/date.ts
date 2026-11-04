/**
 * Utilidades de fecha genéricas — grilla mensual y formateo, hechas a mano
 * con `Intl`/`Date` (sin librería de calendario, ver `.claude/ARCHITECTURE.md`).
 * Originalmente vivían en `modules/eventos/eventos.config.ts`; se promovieron
 * aquí porque `components/forms/jdh-date-picker.tsx` también las necesita y
 * un componente compartido no puede importar internals de un módulo.
 * `eventos.config.ts` re-exporta los mismos nombres para no romper nada.
 */

export const MESES_LARGO = [
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

/** Encabezados de la grilla del calendario, lunes a domingo. */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function parseMesId(mes: string): { year: number; month: number } {
  const [year, month] = mes.split("-").map(Number)
  return { year, month }
}

/**
 * "YYYY-MM" del mes actual. Recibe `now` para poder fijarlo en pruebas; en
 * producción siempre se calcula en el momento de la llamada — nunca como una
 * constante de módulo, que se congelaría a la fecha de arranque del proceso
 * de servidor.
 */
export function currentMesId(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** "2026-07" → "julio de 2026". */
export function formatMesLargo(mes: string): string {
  const { year, month } = parseMesId(mes)
  return `${MESES_LARGO[month - 1]} de ${year}`
}

/** "2026-07" + delta -1 → "2026-06"; + delta 1 → "2026-08". */
export function addMeses(mes: string, delta: number): string {
  const { year, month } = parseMesId(mes)
  const zeroBased = month - 1 + delta
  const y = year + Math.floor(zeroBased / 12)
  const m = ((zeroBased % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, "0")}`
}

/** Compone año/mes/día en "YYYY-MM-DD", con ceros a la izquierda. */
export function toIsoParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Fecha de HOY como "YYYY-MM-DD" en huso horario LOCAL. `new Date().toISOString()`
 * daría la fecha en UTC, que en Colombia (UTC-5) puede adelantarse un día —
 * el mismo riesgo que `parseFechaLocal` evita en sentido contrario.
 */
export function todayIsoDate(now: Date = new Date()): string {
  return toIsoParts(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** Huso de la compañía: "hoy" para un cumpleaños es el día en Colombia. */
const COMPANY_TIME_ZONE = "America/Bogota"

/**
 * `true` si el día/mes de `fechaNacimiento` ("YYYY-MM-DD") es HOY en
 * Colombia, sin importar el huso del proceso (un servidor en UTC daría el día
 * siguiente desde las 19:00). Un 29 de febrero se celebra el 28 en años no
 * bisiestos. `null` → `false`.
 */
export function esCumpleanosHoy(
  fechaNacimiento: string | null,
  now: Date = new Date()
): boolean {
  if (!fechaNacimiento) return false
  const [, mes, dia] = fechaNacimiento.split("-").map(Number)
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)
  const valor = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value)
  const hoyAnio = valor("year")
  const hoyMes = valor("month")
  const hoyDia = valor("day")

  const esBisiesto =
    (hoyAnio % 4 === 0 && hoyAnio % 100 !== 0) || hoyAnio % 400 === 0
  if (mes === 2 && dia === 29 && !esBisiesto) {
    return hoyMes === 2 && hoyDia === 28
  }
  return mes === hoyMes && dia === hoyDia
}

function parseIsoDate(iso: string): {
  year: number
  month: number
  day: number
} {
  const [year, month, day] = iso.split("-").map(Number)
  return { year, month, day }
}

/**
 * Reconstruye un `Date` LOCAL a partir de una fecha "YYYY-MM-DD". `new
 * Date(iso)` la interpretaría en UTC y correría el día hacia atrás en husos
 * horarios negativos (Colombia es UTC-5) — construir el `Date` a partir de
 * sus componentes evita el corrimiento.
 */
export function parseFechaLocal(iso: string): Date {
  const { year, month, day } = parseIsoDate(iso)
  return new Date(year, month - 1, day)
}

/** "2026-07-22" → "22 de julio de 2026". */
export function formatFechaLarga(iso: string): string {
  const { year, month, day } = parseIsoDate(iso)
  return `${day} de ${MESES_LARGO[month - 1]} de ${year}`
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("es-CO", {
  numeric: "auto",
})

const RELATIVE_TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
]

/**
 * "hace 10 min" / "hace 2 h" a partir de un timestamp ISO. Debe correr en
 * cliente, nunca en un Server Component: renderizar esto en servidor y volver
 * a calcularlo en cliente produce un mismatch de hidratación (mismo problema
 * documentado arriba para `isToday`), aunque aquí no muerde porque los
 * consumidores (la campana de notificaciones) se pueblan vía TanStack Query
 * después de montar, no durante el render inicial del servidor.
 */
export function formatRelativo(iso: string, now: Date = new Date()): string {
  const deltaSeconds = Math.round(
    (new Date(iso).getTime() - now.getTime()) / 1000
  )
  const absSeconds = Math.abs(deltaSeconds)

  if (absSeconds < 60) return "ahora mismo"

  for (const [unit, secondsInUnit] of RELATIVE_TIME_UNITS) {
    if (absSeconds >= secondsInUnit) {
      const value = Math.round(deltaSeconds / secondsInUnit)
      return RELATIVE_TIME_FORMATTER.format(value, unit)
    }
  }

  return RELATIVE_TIME_FORMATTER.format(Math.round(deltaSeconds / 60), "minute")
}

/** Un día de la grilla del calendario: puede desbordar del mes anterior/siguiente. */
export interface CalendarioDia {
  /** "YYYY-MM-DD". */
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
}

/**
 * Semanas completas (lunes a domingo) que cubren `mes`, rellenando el
 * desborde con días de los meses vecinos (en gris en la UI). `today` es
 * inyectable para pruebas; en vistas server-rendered se calcula una sola vez
 * y se pasa como prop al componente cliente, para que el marcado de "hoy" no
 * dependa del reloj del navegador ni cause un mismatch de hidratación.
 */
export function buildCalendarGrid(
  mes: string,
  today: Date = new Date()
): CalendarioDia[] {
  const { year, month } = parseMesId(mes)
  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // getDay(): 0=domingo..6=sábado → offset con la semana empezando en lunes.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const todayIso = toIsoParts(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  )

  const days: CalendarioDia[] = []

  if (firstWeekday > 0) {
    const { year: py, month: pm } = parseMesId(addMeses(mes, -1))
    for (let i = 0; i < firstWeekday; i++) {
      const day = daysInPrevMonth - firstWeekday + 1 + i
      const iso = toIsoParts(py, pm, day)
      days.push({ iso, day, inMonth: false, isToday: iso === todayIso })
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIsoParts(year, month, day)
    days.push({ iso, day, inMonth: true, isToday: iso === todayIso })
  }

  const remainder = days.length % 7
  if (remainder > 0) {
    const { year: ny, month: nm } = parseMesId(addMeses(mes, 1))
    for (let day = 1; day <= 7 - remainder; day++) {
      const iso = toIsoParts(ny, nm, day)
      days.push({ iso, day, inMonth: false, isToday: iso === todayIso })
    }
  }

  return days
}
