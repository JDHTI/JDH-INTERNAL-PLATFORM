import { Quote } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"

import type { FraseMotivacional } from "../types"

/**
 * Card pequeña con la frase motivacional del pool (`getFraseMotivacional`),
 * al lado derecho del bloque de saludo + fecha (`HomeGreeting`) — ver el
 * `flex` que los envuelve en `HomeView`. Antes vivía como una línea suelta en
 * cursiva dentro del propio saludo; pasó a ser su propia card para separarse
 * visualmente de "Buenos días, ..." sin competir con él.
 *
 * `JdhCard` en `size="sm"` (el más compacto del catálogo) — es literalmente
 * "una nota", no un bloque de contenido. `shrink-0` + `max-w-xs`: no debe
 * crecer para ocupar el espacio que le sobra a `HomeGreeting` (`flex-1` en el
 * contenedor de `HomeView`), solo el ancho de una nota corta.
 *
 * Sin borde y completamente cuadrada (`border-0 rounded-none`, pisando el
 * `border border-border` + `rounded-[var(--jdh-radius-md)]` que trae el
 * variant `default` de `JdhCard`) — el relieve lo da un `shadow` en vez del
 * borde: `shadow-[var(--shadow-md)]` consume directo el token JDH (definido
 * en `globals.css` como variable CSS suelta, no registrado en el `@theme` de
 * Tailwind, así que se consume con sintaxis de valor arbitrario — mismo
 * patrón que `rounded-[var(--jdh-radius-md)]` en vez del `shadow-md` de
 * Tailwind, que resolvería al gris genérico por defecto, no al tinte ink de
 * DESIGN.md).
 *
 * Se omite por completo si no hay frase (CMS sin sembrar o caído) — igual que
 * el resto de bloques de la home.
 */
export function NotaMotivacional({
  frase,
}: {
  frase: FraseMotivacional | null
}) {
  if (!frase) return null

  return (
    <JdhCard
      size="sm"
      className="w-full shrink-0 rounded-none border-0 shadow-[var(--shadow-md)] sm:max-w-xs"
    >
      <JdhCard.Body className="flex-row items-start gap-3">
        <JdhCard.IconBox>
          <Quote aria-hidden />
        </JdhCard.IconBox>
        <p className="text-sm text-muted-foreground italic">{frase.texto}</p>
      </JdhCard.Body>
    </JdhCard>
  )
}
