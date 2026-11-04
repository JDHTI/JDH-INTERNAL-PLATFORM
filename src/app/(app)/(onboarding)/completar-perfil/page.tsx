import { redirect } from "next/navigation"

import { requireUser } from "@/intranet/lib/auth"
import { safeNextPath } from "@/intranet/lib/auth/onboarding"
import { OnboardingForm } from "@/intranet/modules/onboarding"
import { getOnboardingPrefill } from "@/intranet/modules/onboarding/server/queries"

export const metadata = { title: "Completa tu perfil" }

/** "Daniel Osorio" → "Daniel". Nombre vacío → "". */
function primerNombre(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ""
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await requireUser()
  const next = safeNextPath((await searchParams).next)

  const prefill = await getOnboardingPrefill().catch(() => null)
  // Nada pendiente (p. ej. llegó por historial), o el API aún no tiene el
  // endpoint: `verificar` marca la sesión y lo devuelve a donde iba.
  if (!prefill || prefill.pendientes.length === 0) {
    redirect(`/completar-perfil/verificar?next=${encodeURIComponent(next)}`)
  }

  const nombre = primerNombre(user.name)
  const pideSede = prefill.pendientes.includes("sede")
  const pideContacto = prefill.pendientes.includes("contacto")
  const intro =
    pideSede && pideContacto
      ? "Cuéntanos en qué sede trabajas y déjanos tus datos de contacto para que tus compañeros puedan ubicarte desde el directorio."
      : pideSede
        ? "Cuéntanos en qué sede trabajas para que tus compañeros puedan ubicarte desde el directorio."
        : "Déjanos tus datos de contacto para que tus compañeros puedan ubicarte desde el directorio."

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-1 text-left">
        <h1 className="text-xl font-semibold text-foreground">
          {nombre ? `Hola, ${nombre}` : "Hola"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido a la intranet de JDH. {intro}
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-[var(--jdh-radius-md)] border border-border bg-card p-6 sm:p-8">
        <OnboardingForm prefill={prefill} next={next} />
      </div>
    </>
  )
}
