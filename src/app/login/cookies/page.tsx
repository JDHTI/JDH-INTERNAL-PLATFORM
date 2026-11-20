import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { siteConfig } from "@/intranet/config/site"

export const metadata = { title: "Política de cookies" }

/*
 * What the platform keeps in the browser, cookie by cookie. Public (it hangs
 * from /login, which needs no session) and kept to the facts: the names and
 * durations are the API's (`app/core/config.py`) and this app's. When one is
 * added or changes, this page changes with it.
 */
const COOKIES: { name: string; purpose: string; lasts: string }[] = [
  {
    name: "internal_platform_access",
    purpose: "Tu sesión: dice a la plataforma quién eres en cada consulta.",
    lasts: "1 hora",
  },
  {
    name: "internal_platform_refresh",
    purpose: "Renueva la sesión sin pedirte entrar de nuevo cada hora.",
    lasts: "30 días, o hasta que cierres sesión",
  },
  {
    name: "internal_platform_oidc_state",
    purpose: "Protege el paso por la cuenta de Microsoft mientras inicias sesión.",
    lasts: "10 minutos",
  },
  {
    name: "jdh_perfil_revisado",
    purpose: "Recuerda que ya se revisó si a tu perfil le faltan datos.",
    lasts: "Hasta cerrar el navegador",
  },
]

export default function CookiesPolicyPage() {
  return (
    <article className="flex flex-col gap-6 text-sm">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 self-start rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver a iniciar sesión
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Política de cookies</h1>
        <p className="text-muted-foreground">
          La plataforma de {siteConfig.company} usa solo las cookies que necesita para que inicies sesión y la
          sesión siga abierta. No usa cookies de publicidad ni de analítica, y no comparte estos datos con
          terceros.
        </p>
      </header>

      <section aria-labelledby="cookies-list" className="flex flex-col gap-3">
        <h2 id="cookies-list" className="text-base font-semibold text-foreground">Cookies de la plataforma</h2>
        <dl className="flex flex-col divide-y divide-border border-y border-border">
          {COOKIES.map((cookie) => (
            <div key={cookie.name} className="flex flex-col gap-1 py-3">
              <dt className="font-mono text-xs text-foreground">{cookie.name}</dt>
              <dd className="text-muted-foreground">{cookie.purpose}</dd>
              <dd className="text-xs text-muted-foreground">Duración: {cookie.lasts}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground">
          Son necesarias: sin ellas no se puede entrar. Las de sesión no se leen desde el navegador, solo las
          recibe el servidor.
        </p>
      </section>

      <section aria-labelledby="cookies-microsoft" className="flex flex-col gap-2">
        <h2 id="cookies-microsoft" className="text-base font-semibold text-foreground">Cuenta de Microsoft</h2>
        <p className="text-muted-foreground">
          Al iniciar sesión pasas por la página de Microsoft, que guarda sus propias cookies según su
          declaración de privacidad.
        </p>
      </section>

      <section aria-labelledby="cookies-preferences" className="flex flex-col gap-2">
        <h2 id="cookies-preferences" className="text-base font-semibold text-foreground">Preferencias en tu navegador</h2>
        <p className="text-muted-foreground">
          Algunas preferencias se guardan solo en este navegador, no son cookies y no salen de tu equipo: el tema
          claro u oscuro, las notas rápidas, el ancho de las columnas, los filtros que eliges ver en el cotizador
          y los paneles que dejas plegados. Si borras los datos del sitio, vuelven a como venían.
        </p>
      </section>

      <section aria-labelledby="cookies-control" className="flex flex-col gap-2">
        <h2 id="cookies-control" className="text-base font-semibold text-foreground">Cómo borrarlas</h2>
        <p className="text-muted-foreground">
          Cerrar sesión borra las cookies de sesión. También puedes borrarlas desde la configuración de tu
          navegador; la próxima vez tendrás que iniciar sesión de nuevo. Si tienes preguntas, escribe a la mesa
          de ayuda de TI.
        </p>
      </section>
    </article>
  )
}
