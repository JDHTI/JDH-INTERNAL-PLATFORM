/**
 * Público del módulo `onboarding` — gate de datos faltantes del perfil
 * (`src/proxy.ts`). A propósito NO se registra en `src/config/modules.ts`:
 * no es una funcionalidad navegable, es un gate; registrarlo lo metería en
 * el catálogo de la home.
 */
export { OnboardingForm } from "./components/onboarding-form"
export type {
  OnboardingInput,
  OnboardingPendiente,
  OnboardingPrefill,
  SedeOption,
} from "./types"
