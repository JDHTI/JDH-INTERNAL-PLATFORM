"use server"

import { revalidatePath } from "next/cache"

import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import {
  CONTACT_SCHEDULE_PATH,
  ONBOARDING_PATH,
} from "@/intranet/modules/onboarding/onboarding.config"
import { PERMISSIONS } from "@/intranet/config/permissions"
import { requirePermissions } from "@/intranet/lib/auth"

import { contactoDirectoSchema } from "../schemas/contacto.schema"
import { franjaHorarioListSchema } from "../schemas/horario.schema"
import type { ContactoDirecto, FranjaHorario } from "../types"

/**
 * Persiste hacia `POST /me/onboarding` en INTRANET-JDH-API — el MISMO
 * endpoint de `/completar-perfil` (`src/modules/onboarding`). Quien omitió
 * esa pantalla y llena su contacto o su sede desde acá ya no la verá por
 * eso: el gate revisa los datos, no una marca. La sede solo se envía si se
 * eligió una; el API valida que sea una sede activa y no la placeholder, y
 * actualiza la dirección del contacto con la de la sede.
 */
export async function actualizarContactoDirecto(input: ContactoDirecto) {
  await requirePermissions([PERMISSIONS.perfil.manage])
  const data = contactoDirectoSchema.parse(input)

  const response = await backendFetch(ONBOARDING_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobilePhone: data.celular,
      landlinePhone: data.telefono,
      showInDirectory: data.celularVisible,
      ...(data.sedeId ? { siteId: data.sedeId } : {}),
    }),
  })
  if (!response.ok) {
    throw new Error(`POST /me/onboarding -> ${response.status}`)
  }

  revalidatePath("/perfil", "layout")
  revalidatePath("/directorio", "layout")
  return { success: true as const, data }
}

/**
 * Reemplaza el horario de contacto del usuario actual vía
 * `PUT /me/horario-contacto` (INTRANET-JDH-API, `ContactSchedule`). La API
 * resuelve el empleado desde la sesión: no hay forma de editar el de otro.
 * Los errores de negocio (franjas cruzadas, perfil sin completar) vuelven
 * como `{ success: false, message }` para mostrarlos tal cual.
 */
export async function actualizarHorarioContacto(input: FranjaHorario[]) {
  await requirePermissions([PERMISSIONS.perfil.manage])
  const parsed = franjaHorarioListSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Horario inválido.",
    }
  }

  const response = await backendFetch(CONTACT_SCHEDULE_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ franjas: parsed.data }),
  })
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message
    return {
      success: false as const,
      message: message ?? "Horario inválido.",
    }
  }
  if (!response.ok) {
    throw new Error(`PUT /me/horario-contacto -> ${response.status}`)
  }

  const { franjas } = (await response.json()) as { franjas: FranjaHorario[] }
  revalidatePath("/perfil", "layout")
  revalidatePath("/directorio", "layout")
  return { success: true as const, data: franjas }
}
