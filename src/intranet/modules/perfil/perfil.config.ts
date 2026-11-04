import { Bell, Clock, Phone, UserRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { DiaSemana, FranjaHorario, HorarioContacto } from "./types"

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

/**
 * "1990-03-15" → "15 de marzo de 1990". Parseo manual: evita el corrimiento
 * de día que introduce `new Date(iso)` al interpretar la fecha en UTC. Mismo
 * patrón ad-hoc que cada módulo con fechas define en su propio `*.config.ts`
 * (ver `directorio.config.ts`) — no hay un formateador genérico en `src/lib/`.
 */
export function formatFechaNacimiento(iso: string | null): string | null {
  if (!iso) return null
  const [year, month, day] = iso.split("-").map(Number)
  return `${day} de ${MESES[month - 1]} de ${year}`
}

/** Orden de la semana — el mismo del enum `Weekday` en la API. */
export const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: "LUNES", label: "Lunes" },
  { value: "MARTES", label: "Martes" },
  { value: "MIERCOLES", label: "Miércoles" },
  { value: "JUEVES", label: "Jueves" },
  { value: "VIERNES", label: "Viernes" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
]

/** "07:00" → "7:00 a.m."; "17:30" → "5:30 p.m.". */
export function formatHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number)
  const sufijo = h < 12 ? "a.m." : "p.m."
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${sufijo}`
}

function etiquetaDias(desde: number, hasta: number): string {
  const inicio = DIAS_SEMANA[desde].label
  if (desde === hasta) return inicio
  const fin = DIAS_SEMANA[hasta].label.toLowerCase()
  return hasta - desde === 1 ? `${inicio} y ${fin}` : `${inicio} a ${fin}`
}

/**
 * Convierte las franjas de la API en filas para mostrar, agrupando los días
 * CONSECUTIVOS con exactamente las mismas franjas: L–V de 7 a 5 queda en una
 * sola fila "Lunes a viernes". Los días sin franjas no se muestran.
 */
export function agruparFranjas(franjas: FranjaHorario[]): HorarioContacto[] {
  const porDia = DIAS_SEMANA.map(({ value }) =>
    franjas
      .filter((franja) => franja.dia === value)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .map(
        (franja) => `${formatHora(franja.inicio)} – ${formatHora(franja.fin)}`
      )
      .join(" · ")
  )

  const filas: HorarioContacto[] = []
  let desde = 0
  for (let i = 1; i <= porDia.length; i++) {
    if (i < porDia.length && porDia[i] === porDia[desde]) continue
    if (porDia[desde]) {
      filas.push({ dias: etiquetaDias(desde, i - 1), valor: porDia[desde] })
    }
    desde = i
  }
  return filas
}

/**
 * Punto de partida del editor de `/perfil/horarios` para quien aún no ha
 * guardado el suyo: la parte estructurable de `HORARIO_POR_DEFECTO`.
 */
export const FRANJAS_SUGERIDAS: FranjaHorario[] = [
  ...(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"] as const).map(
    (dia) => ({ dia, inicio: "07:00", fin: "17:00" })
  ),
  { dia: "SABADO", inicio: "08:00", fin: "12:00" },
]

/**
 * Horario de contacto corporativo por defecto (pantalla 07 del mockup,
 * literal). Es lo que muestra el directorio para quien aún no ha guardado
 * su horario desde `/perfil/horarios`.
 * Antes vivía en `directorio.config.ts`: ver el comentario histórico en
 * `directorio/server/queries.ts` sobre por qué se mudó aquí.
 */
export const HORARIO_POR_DEFECTO: HorarioContacto[] = [
  { dias: "Lunes a viernes", valor: "7:00 a.m. – 5:00 p.m." },
  {
    dias: "Sábados",
    valor: "8:00 a.m. – 12:00 p.m. (turnos de bodega)",
  },
  {
    dias: "Fuera de horario",
    valor: "Solo emergencias de operación · línea de guardia",
    muted: true,
  },
]

export interface PerfilNavItem {
  href: `/${string}`
  label: string
  icon: LucideIcon
  /** Match the pathname exactly (default matches by prefix too). */
  exact?: boolean
}

export interface PerfilNavGroup {
  title: string
  items: PerfilNavItem[]
}

/** Rail permanente de `/perfil`, segmentado por grupo (crece agregando ítems o grupos). */
export const PERFIL_NAV: PerfilNavGroup[] = [
  {
    title: "Configuración",
    items: [
      { href: "/perfil", label: "Perfil", icon: UserRound, exact: true },
      { href: "/perfil/contacto", label: "Contacto y sede", icon: Phone },
      { href: "/perfil/horarios", label: "Horarios de contacto", icon: Clock },
      { href: "/perfil/notificaciones", label: "Notificaciones", icon: Bell },
    ],
  },
]
