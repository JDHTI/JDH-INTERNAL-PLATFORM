import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { SignInButton } from "@/intranet/components/auth/sign-in-button"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"
import { Alert, AlertDescription } from "@/intranet/components/ui/alert"
import { siteConfig } from "@/intranet/config/site"

export const metadata = { title: "Iniciar sesión" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const year = new Date().getFullYear()

  return (
    // `h2`, not `h1`: the showcase panel's headline is the page's single `h1`.
    <Stagger staggerDelay={0.08} className="flex flex-col gap-8">
      <StaggerItem className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          Acceso
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Iniciar sesión
        </h2>
        <p className="text-sm text-muted-foreground">
          Ingresa con tu cuenta corporativa de {siteConfig.company}.
        </p>
      </StaggerItem>

      {params.error ? (
        <StaggerItem>
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              No fue posible iniciar sesión. Verifica que estás usando tu cuenta
              corporativa de Microsoft; si el problema continúa, contacta a la
              mesa de ayuda.
            </AlertDescription>
          </Alert>
        </StaggerItem>
      ) : null}

      <StaggerItem className="flex flex-col gap-3">
        <SignInButton />
        {/* Only the cookies the session needs, so a notice at the door, not a consent banner. */}
        <p className="text-xs text-muted-foreground">
          Al iniciar sesión aceptas las cookies necesarias para mantener tu sesión abierta.{" "}
          <Link
            href="/login/cookies"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Ver la política de cookies
          </Link>
        </p>
      </StaggerItem>

      <StaggerItem className="flex flex-col gap-4 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          El acceso es exclusivo para colaboradores con cuenta corporativa. Si
          no puedes ingresar, contacta a la mesa de ayuda de TI.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          © {year} {siteConfig.companyLegal} · Intranet {siteConfig.version}
        </p>
      </StaggerItem>
    </Stagger>
  )
}
