import "server-only"

import { backendFetch } from "@/intranet/lib/api/backend-fetch"
import { ONBOARDING_PATH } from "@/intranet/modules/onboarding/onboarding.config"

import type { OnboardingPrefill } from "../types"

/** Qué le falta a la persona y con qué precargar — `GET /me/onboarding` en INTRANET-JDH-API. */
export async function getOnboardingPrefill(): Promise<OnboardingPrefill> {
  const response = await backendFetch(ONBOARDING_PATH)
  if (!response.ok) {
    throw new Error(`GET /me/onboarding -> ${response.status}`)
  }
  const raw = (await response.json()) as OnboardingPrefill
  return {
    mobilePhone: raw.mobilePhone,
    landlinePhone: raw.landlinePhone,
    siteId: raw.siteId,
    pendientes: raw.pendientes,
    sedes: raw.sedes,
  }
}
