/** Lo que le falta a la persona — el formulario solo pide esto. */
export type OnboardingPendiente = "contacto" | "sede"

/** Opción del select de sede (activas, sin la placeholder "Sin sede asignada"). */
export interface SedeOption {
  id: string
  nombre: string
}

/** `GET /me/onboarding` en INTRANET-JDH-API, lo que usa este módulo. */
export interface OnboardingPrefill {
  mobilePhone: string
  landlinePhone: string
  siteId: string | null
  pendientes: OnboardingPendiente[]
  sedes: SedeOption[]
}

/** Payload que envía el formulario a `completarOnboarding`. */
export interface OnboardingInput {
  mobilePhone: string
  landlinePhone: string
  siteId: string
}
