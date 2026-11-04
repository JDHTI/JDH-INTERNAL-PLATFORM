import { Logo } from "@/intranet/components/common/logo"
import { IntranetProviders } from "@/intranet/components/providers/intranet-providers"
import { requireUser } from "@/intranet/lib/auth"

/**
 * Layout de `/completar-perfil` — sin sidebar ni header a propósito:
 * `src/proxy.ts` manda aquí antes de entrar al resto de la intranet, así que
 * mostrar navegación no tiene sentido. Sigue el tema (claro/oscuro) con los
 * tokens semánticos, igual que `src/app/login/layout.tsx`: fondo `muted`,
 * tarjeta `card` y logo `auto`. Sin tarjeta propia: `children` decide qué va
 * sobre el fondo (el saludo) y qué dentro de la tarjeta (el formulario).
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()

  return (
    <IntranetProviders>
      <div className="intranet-shell flex min-h-svh flex-col items-center gap-8 bg-muted px-4 py-12 text-foreground antialiased">
        <Logo variant="text" tone="auto" height={50} priority />
        {children}
      </div>
    </IntranetProviders>
  )
}
