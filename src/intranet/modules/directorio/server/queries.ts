import "server-only"

import { cache } from "react"

import { backendJson } from "@/intranet/lib/api/backend-fetch"

import { diasHastaProximoCumpleanos, PAGE_SIZE, SEDE_ALL } from "../directorio.config"
import type {
  CompaneroEquipo,
  Empleado,
  EmpleadoDetalle,
  EmpleadoFilters,
  EmpleadosPage,
  SedeOption,
} from "../types"
import {
  birthDateFrom,
  mapCompanero,
  mapEmpleado,
  mapEmpleadoDetalle,
  mapSede,
  type RawBirthday,
  type RawEmployeeDetail,
  type RawEmployeeSummary,
  type RawNewHire,
  type RawSite,
} from "./empleado.mapper"

/** Directory of internal-platform-api (`/directory`), synced nightly from Entra. */

interface RawPage<T> {
  items: T[]
  total: number
  page: number
  size: number
}

async function safe<T>(context: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[directorio] fallo consultando el API (${context}):`, error)
    return fallback
  }
}

const getRawSites = cache(async (): Promise<RawSite[]> => {
  const data = await backendJson<{ items: RawSite[] }>("/directory/sites")
  return data?.items ?? []
})

async function sitesById(): Promise<Map<string, RawSite>> {
  const sites = await safe("sites", [], getRawSites)
  return new Map(sites.map((site) => [site.id, site]))
}

export async function getEmpleados(filters: EmpleadoFilters): Promise<EmpleadosPage> {
  return safe(
    "getEmpleados",
    { items: [], total: 0, page: filters.page, pageSize: PAGE_SIZE },
    async () => {
      const params = new URLSearchParams({ page: String(filters.page), size: String(PAGE_SIZE) })
      if (filters.q) params.set("q", filters.q)
      if (filters.sede && filters.sede !== SEDE_ALL) params.set("site_id", filters.sede)
      const data = await backendJson<RawPage<RawEmployeeSummary>>(
        `/directory/employees?${params.toString()}`
      )
      if (!data) throw new Error("GET /directory/employees -> 404")
      return {
        items: data.items.map((raw) => mapEmpleado(raw)),
        total: data.total,
        page: data.page,
        pageSize: data.size,
      }
    }
  )
}

/** Sites with their employee count, for the dropdown. */
export async function getSedes(): Promise<SedeOption[]> {
  return safe("getSedes", [], async () =>
    (await getRawSites()).filter((site) => site.employee_count > 0).map(mapSede)
  )
}

/** Runs `tasks` with at most `limit` in flight, keeping their order. */
async function inBatches<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  for (let start = 0; start < tasks.length; start += limit) {
    results.push(...(await Promise.all(tasks.slice(start, start + limit).map((task) => task()))))
  }
  return results
}

/**
 * Everyone with a registered birthday, closest first. The API answers one
 * month at a time; three at once keeps a home render from taking the API's
 * whole connection pool. Memoized per request: the home slider and the
 * birthdays page both ask.
 */
export const getProximosCumpleanos = cache(async (now: Date = new Date()): Promise<Empleado[]> => {
  return safe("getProximosCumpleanos", [], async () => {
    const months = await inBatches(
      Array.from(
        { length: 12 },
        (_, index) => () =>
          backendJson<{ month: number; items: RawBirthday[] }>(
            `/directory/employees/birthdays?month=${index + 1}`
          )
      ),
      3
    )
    return months
      .flatMap((data) =>
        (data?.items ?? []).map((raw) => mapEmpleado(raw, birthDateFrom(data!.month, raw.birth_day)))
      )
      .sort(
        (a, b) =>
          diasHastaProximoCumpleanos(a.fechaNacimiento, now) -
          diasHastaProximoCumpleanos(b.fechaNacimiento, now)
      )
  })
})

/** Newest hires first, with area, site and hire date for the home block. */
export async function getNuevosIngresos(limit = 6): Promise<EmpleadoDetalle[]> {
  return safe("getNuevosIngresos", [], async () => {
    const [data, sites] = await Promise.all([
      backendJson<{ items: RawNewHire[] }>(`/directory/employees/new-hires?limit=${limit}`),
      sitesById(),
    ])
    return (data?.items ?? []).map((raw) => mapEmpleadoDetalle(raw, sites))
  })
}

/** `null` makes the route answer 404 (unknown id, or a person who is not public). */
export async function getEmpleadoById(id: string): Promise<EmpleadoDetalle | null> {
  return safe("getEmpleadoById", null, async () => {
    const [raw, sites] = await Promise.all([
      backendJson<RawEmployeeDetail>(`/directory/employees/${encodeURIComponent(id)}`),
      sitesById(),
    ])
    return raw ? mapEmpleadoDetalle(raw, sites) : null
  })
}

/** People of the same area, without the employee. */
export async function getEquipo(id: string, limit = 3): Promise<CompaneroEquipo[]> {
  return safe("getEquipo", [], async () => {
    const data = await backendJson<{ items: RawEmployeeSummary[] }>(
      `/directory/employees/${encodeURIComponent(id)}/team?limit=${limit}`
    )
    return (data?.items ?? []).map(mapCompanero)
  })
}
