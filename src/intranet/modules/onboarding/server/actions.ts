"use server"

import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import { ONBOARDING_PATH } from "@/intranet/modules/onboarding/onboarding.config"
import { requireUser } from "@/intranet/lib/auth"
import { markProfileReviewed } from "@/intranet/lib/auth/onboarding"

import { contactoSchema, sedeSchema } from "../schemas/onboarding.schema"
import type { OnboardingInput } from "../types"
import { getOnboardingPrefill } from "./queries"

export interface CompletarOnboardingResult {
  success: boolean
  fieldErrors?: Partial<Record<keyof OnboardingInput, string[]>>
}

/**
 * Guarda lo que le falta a la persona (`POST /me/onboarding` en
 * INTRANET-JDH-API). Qué secciones se validan y se envían lo decide el API
 * (`pendientes`), no el cliente: así nadie puede saltarse una sección ni
 * pisar algo que ya tenía. Si con esto queda completo, marca la sesión como
 * revisada para que `src/proxy.ts` deje de redirigir. No llama a
 * `redirect()`: el componente navega tras ver `{ success: true }`.
 */
export async function completarOnboarding(
  input: OnboardingInput
): Promise<CompletarOnboardingResult> {
  await requireUser()
  const { pendientes } = await getOnboardingPrefill()

  const fieldErrors: CompletarOnboardingResult["fieldErrors"] = {}
  const payload: Record<string, string> = {}

  if (pendientes.includes("contacto")) {
    const parsed = contactoSchema.safeParse(input)
    if (parsed.success) Object.assign(payload, parsed.data)
    else Object.assign(fieldErrors, parsed.error.flatten().fieldErrors)
  }
  if (pendientes.includes("sede")) {
    const parsed = sedeSchema.safeParse(input)
    if (parsed.success) Object.assign(payload, parsed.data)
    else Object.assign(fieldErrors, parsed.error.flatten().fieldErrors)
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors }
  }

  if (Object.keys(payload).length > 0) {
    const response = await backendFetch(ONBOARDING_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return { success: false }
  }

  const after = await getOnboardingPrefill()
  if (after.pendientes.length > 0) return { success: false }
  await markProfileReviewed()
  return { success: true }
}

/** "Omitir por ahora": deja pasar solo durante esta sesión (ver `PROFILE_REVIEWED_COOKIE`). */
export async function omitirOnboarding(): Promise<void> {
  await requireUser()
  await markProfileReviewed()
}
