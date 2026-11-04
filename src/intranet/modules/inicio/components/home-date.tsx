import { TIME_ZONE } from "../inicio.config"

const formatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

/**
 * Día y fecha de hoy en Colombia, bajo el saludo de la home — sin hora: la
 * home no necesita ser un reloj, solo situar el día.
 *
 * Server Component (ya no lleva intervalo ni estado): la página raíz es
 * dinámica (`requireUser()` la fuerza a `ƒ`), así que se re-renderiza en cada
 * request y la fecha nunca queda vieja. Sigue recibiendo `nowIso` desde
 * `page.tsx` en vez de leer `new Date()` aquí, para que exista un único punto
 * de "ahora" en toda la vista.
 */
export function HomeDate({ nowIso }: { nowIso: string }) {
  const instante = Date.parse(nowIso)

  return (
    <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
      <time dateTime={new Date(instante).toISOString()}>
        {formatter.format(instante)}
      </time>
    </p>
  )
}
