import { FadeIn } from "@/intranet/components/motion/fade-in"

import { primerNombre, saludoPara } from "../inicio.config"
import { HomeDate } from "./home-date"

/**
 * Saludo de apertura de la home — grande y alineado a la izquierda del todo
 * de la página (no un `SectionHeader`, que solo llega a `text-3xl sm:text-4xl`
 * incluso en `size="hero"`, y ese tamaño además fuerza el centrado:
 * `const centered = align === "center" || size === "hero"` en
 * `section-header.tsx`, sin forma de pedir "hero" grande + `align="start"").
 *
 * `FadeIn` reemplaza la animación de entrada que daba `SectionHeader` (vía
 * `Stagger`/`StaggerItem`) para no perderla al dejar de usarlo.
 *
 * La frase motivacional ya no vive aquí dentro — es su propia card
 * (`NotaMotivacional`), al lado derecho de este bloque (ver el `flex` que los
 * envuelve en `HomeView`).
 */
export function HomeGreeting({
  nombreUsuario,
  nowIso,
}: {
  nombreUsuario: string
  nowIso: string
}) {
  const nombre = primerNombre(nombreUsuario)
  const saludo = saludoPara(new Date(nowIso))

  return (
    <FadeIn className="min-w-0 flex-1 space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
        {nombre ? `${saludo}, ${nombre}` : saludo}
      </h1>
      <HomeDate nowIso={nowIso} />
    </FadeIn>
  )
}
