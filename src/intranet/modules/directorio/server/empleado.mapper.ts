import { API_URL } from "@/shared/lib/api-client"

import type { CompaneroEquipo, Empleado, EmpleadoDetalle, SedeOption } from "../types"

/** Shapes of internal-platform-api `/directory` (snake_case). */
export interface RawSiteRef {
  id: string
  name: string
}

export interface RawEmployeeSummary {
  id: string
  full_name: string
  email: string | null
  position: string
  job_title: string | null
  department: string | null
  site: RawSiteRef | null
  is_manager: boolean
  has_photo: boolean
  photo_version: string | null
}

export interface RawBirthday extends RawEmployeeSummary {
  birth_day: number
}

export interface RawNewHire extends RawEmployeeSummary {
  hire_date: string
}

export interface RawEmployeeDetail extends RawEmployeeSummary {
  hire_date: string | null
  birth_month: number | null
  birth_day: number | null
  manager: { id: string; full_name: string; position: string } | null
}

export interface RawSite {
  id: string
  name: string
  address: string | null
  is_active: boolean
  employee_count: number
}

/**
 * The photo is served by the API itself (same origin behind Caddy, so the
 * session cookie goes along). `v` makes the URL immutable, which keeps the
 * shared per-IP rate limit for real requests.
 */
function photoUrl(raw: RawEmployeeSummary, size: 96 | 432): string | null {
  if (!raw.photo_version) return null
  return `${API_URL}/directory/employees/${encodeURIComponent(raw.id)}/photo?size=${size}&v=${encodeURIComponent(raw.photo_version)}`
}

function cargo(raw: RawEmployeeSummary): string {
  return raw.position || raw.job_title || ""
}

/**
 * The API never sends the year of birth to third parties: a fixed leap year
 * keeps day and month (Feb 29 included) for the birthday math, which only
 * reads those two.
 */
export function birthDateFrom(month: number | null, day: number | null): string | null {
  if (!month || !day) return null
  return `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function mapEmpleado(raw: RawEmployeeSummary, fechaNacimiento: string | null = null): Empleado {
  return {
    id: raw.id,
    nombre: raw.full_name,
    cargo: cargo(raw),
    sede: raw.site?.name ?? "",
    sedeId: raw.site?.id ?? "",
    email: raw.email,
    photoUrl: photoUrl(raw, 96),
    fechaNacimiento,
  }
}

export function mapEmpleadoDetalle(
  raw: RawEmployeeDetail | RawNewHire,
  sites: Map<string, RawSite> = new Map()
): EmpleadoDetalle {
  const detail = raw as Partial<RawEmployeeDetail>
  const site = raw.site ? sites.get(raw.site.id) : undefined
  return {
    ...mapEmpleado(raw, birthDateFrom(detail.birth_month ?? null, detail.birth_day ?? null)),
    estado: "Activo",
    fechaIngreso: raw.hire_date ?? null,
    jornada: "",
    area: raw.department ?? "",
    extension: "",
    telefonoFijo: "",
    celularPublico: null,
    direccion: site?.address ?? "",
    esJefe: raw.is_manager,
    jefe: detail.manager ? { nombre: detail.manager.full_name, cargo: detail.manager.position } : null,
    photoUrlGrande: photoUrl(raw, 432),
  }
}

export function mapCompanero(raw: RawEmployeeSummary): CompaneroEquipo {
  return { id: raw.id, nombre: raw.full_name, cargo: cargo(raw), sede: raw.site?.name ?? "" }
}

export function mapSede(raw: RawSite): SedeOption {
  return { id: raw.id, nombre: raw.name, count: raw.employee_count }
}
