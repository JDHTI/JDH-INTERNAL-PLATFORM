import "server-only"

import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import {
  CONTACT_SCHEDULE_PATH,
  contactSchedulePath,
  ONBOARDING_PATH,
} from "@/intranet/modules/onboarding/onboarding.config"
import { requireUser } from "@/intranet/lib/auth"
import { getEmpleadoById } from "@/intranet/modules/directorio/server/queries"

import {
  agruparFranjas,
  FRANJAS_SUGERIDAS,
  HORARIO_POR_DEFECTO,
} from "../perfil.config"
import type {
  ContactoDirecto,
  FranjaHorario,
  HorarioContacto,
  MiPerfil,
  SedeOpcion,
} from "../types"

/**
 * Mismo shape que `OnboardingPrefill` en INTRANET-JDH-API
 * (`src/onboarding/onboarding.service.ts`) — duplicado aquí (en vez de
 * importado desde `modules/onboarding`) porque un módulo nunca importa los
 * internos de otro (ver `src/modules/README.md`); ambos módulos llaman al
 * mismo endpoint `GET/POST /me/onboarding` de forma independiente.
 */
interface OnboardingPrefillResponse {
  mobilePhone: string
  landlinePhone: string
  showInDirectory: boolean
  siteId: string | null
  sedes: SedeOpcion[]
}

/**
 * Lanza si el API falla en vez de devolver vacío: un formulario en blanco se
 * leería como "no tengo datos guardados", y al guardarlo se pisaría lo que
 * sí hay (pasó con los 429 del tier `strict`).
 */
async function getOnboardingData(): Promise<OnboardingPrefillResponse> {
  const response = await backendFetch(ONBOARDING_PATH)
  if (!response.ok) {
    throw new Error(`GET /me/onboarding -> ${response.status}`)
  }
  return (await response.json()) as OnboardingPrefillResponse
}

export async function getMiPerfil(): Promise<MiPerfil> {
  const user = await requireUser()
  const empleado = user.employeeId
    ? await getEmpleadoById(user.employeeId)
    : null

  return {
    name: user.name,
    // El cargo del directorio (cargado del DWH) manda; el `jobTitle` de
    // Entra solo queda de respaldo si la identidad no se vinculó a un
    // empleado o el DWH aún no le asignó cargo.
    jobTitle: empleado?.cargo || user.jobTitle,
    email: user.email,
    employeeId: user.employeeId,
    photoUrl: user.photoUrl,
    birthDate: empleado?.fechaNacimiento ?? null,
    hireDate: empleado?.fechaIngreso ?? null,
    sede: empleado?.sede ?? null,
    direccion: empleado?.direccion ?? null,
  }
}

/** Lee `GET /me/onboarding` — mismo endpoint que usa `/completar-perfil`. */
export async function getMiContactoDirecto(): Promise<{
  contacto: ContactoDirecto
  sedes: SedeOpcion[]
}> {
  const onboarding = await getOnboardingData()
  return {
    contacto: {
      sedeId: onboarding.siteId ?? "",
      telefono: onboarding.landlinePhone,
      celular: onboarding.mobilePhone,
      celularVisible: onboarding.showInDirectory,
    },
    sedes: onboarding.sedes,
  }
}

/**
 * Horario de contacto de cualquier empleado, listo para mostrar en su perfil
 * del directorio (`GET /empleados/:id/horario-contacto`). Cada colaborador
 * lo define desde `/perfil/horarios`; quien no ha guardado el suyo (o si la
 * API falla) muestra el horario corporativo por defecto.
 */
export async function getHorarioContacto(
  id: string
): Promise<HorarioContacto[]> {
  try {
    const response = await backendFetch(contactSchedulePath(id))
    if (!response.ok) return HORARIO_POR_DEFECTO
    const { franjas } = (await response.json()) as { franjas: FranjaHorario[] }
    return franjas.length > 0 ? agruparFranjas(franjas) : HORARIO_POR_DEFECTO
  } catch {
    return HORARIO_POR_DEFECTO
  }
}

/**
 * Franjas propias para el editor de `/perfil/horarios`
 * (`GET /me/horario-contacto`). `configurado: false` cuando la persona aún
 * no ha guardado ninguna — el editor arranca entonces con
 * `FRANJAS_SUGERIDAS`. Un fallo de la API se propaga (no se disfraza de
 * "sin horario": guardar encima borraría el real).
 */
export async function getMisFranjasHorario(): Promise<{
  franjas: FranjaHorario[]
  configurado: boolean
}> {
  const response = await backendFetch(CONTACT_SCHEDULE_PATH)
  if (!response.ok) {
    throw new Error(`GET /me/horario-contacto -> ${response.status}`)
  }
  const { franjas } = (await response.json()) as { franjas: FranjaHorario[] }
  return franjas.length > 0
    ? { franjas, configurado: true }
    : { franjas: FRANJAS_SUGERIDAS, configurado: false }
}
