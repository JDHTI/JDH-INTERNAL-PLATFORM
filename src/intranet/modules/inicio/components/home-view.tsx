import { buildCalendarGrid, currentMesId } from "@/intranet/lib/date"
import { NuevosIngresos } from "@/intranet/modules/directorio"
import type { Empleado, EmpleadoDetalle } from "@/intranet/modules/directorio"
import { ComunicadoDestacado } from "@/intranet/modules/noticias"
import type { Noticia } from "@/intranet/modules/noticias"

import type {
  ContenidoSemanal as ContenidoSemanalData,
  FraseMotivacional,
  Quinquenio,
} from "../types"
import { ContenidoSemanal } from "./contenido-semanal"
import { HomeGreeting } from "./home-greeting"
import { HomeHero } from "./home-hero"
import { HomeSlider } from "./home-slider"
import { NotaMotivacional } from "./nota-motivacional"
import { QuinqueniosCarousel } from "./quinquenios-carousel"

interface HomeViewProps {
  /** Nombre completo del usuario tal como lo entrega Entra ID. */
  nombreUsuario: string
  /** Instante del render en ISO — `HomeGreeting`/`HomeDate` formatean a partir de aquí. */
  nowIso: string
  comunicadoDestacado: Noticia | null
  contenidoSemanal: ContenidoSemanalData | null
  fraseMotivacional: FraseMotivacional | null
  cumpleanos: Empleado[]
  noticias: Noticia[]
  nuevosIngresos: EmpleadoDetalle[]
  quinquenios: Quinquenio[]
}

/**
 * Vista de la home (`/`). Server Component: recibe todo ya resuelto desde
 * `page.tsx` y solo compone. Cada bloque se degrada solo cuando su fuente no
 * tiene datos (devuelve `null` o un `EmptyState`), así que la página nunca
 * queda a medio renderizar por un CMS caído o un directorio sin sincronizar.
 *
 * Los bloques vienen de sus módulos dueños a través de sus barrels públicos
 * (`@/modules/directorio`, `@/modules/eventos`, `@/modules/noticias`); el
 * contenido semanal y la frase motivacional son los únicos bloques que este
 * módulo sirve directamente (`../server/queries.ts`, ver
 * `.claude/ARCHITECTURE.md` 2026-07-30).
 *
 * Orden de la página, de arriba a abajo:
 * 1. Saludo (grande, alineado a la izquierda, sin breadcrumb) + nota
 *    motivacional (card pequeña, a la derecha en `sm:` y arriba en mobile).
 * 2. Banner (full-bleed).
 * 3. Comunicado destacado — fila propia, ancho completo.
 * 4. Slider de 3 casillas (video / noticia rotando sola / calendario de
 *    cumpleaños del mes) — fila propia, ancho completo.
 * 5. Contenido semanal (2/3) + columna derecha (1/3): carrusel de
 *    quinquenios encima de próximos eventos — dos widgets propios, no un
 *    único bloque, así que la columna es un `flex` vertical en vez de un
 *    ítem más del grid exterior.
 * 6. Nuevos integrantes — slider de 3 (1 en mobile), no una grilla.
 *
 * Nota sobre el catálogo de módulos: la home ya no lo lista. La navegación de
 * módulos vive en el header/mega menú (que sigue derivándose del registro con
 * `modules.visibleTo`), y repetirla aquí competía con el contenido editorial
 * que este diseño pone al frente.
 */
export function HomeView({
  nombreUsuario,
  nowIso,
  comunicadoDestacado,
  contenidoSemanal,
  fraseMotivacional,
  cumpleanos,
  noticias,
  nuevosIngresos,
  quinquenios,
}: HomeViewProps) {
  const mes = currentMesId()
  const dias = buildCalendarGrid(mes)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <HomeGreeting nombreUsuario={nombreUsuario} nowIso={nowIso} />
        <NotaMotivacional frase={fraseMotivacional} />
      </div>

      {/* El hero cierra en ink (su degradado) y el comunicado destacado ES
          ink (`JdhCard variant="inverse"`): pegados por el `space-y-8` del
          contenedor, los dos bloques oscuros se leen como una sola mancha
          full-bleed. Este respiro suma al `space-y-8` del contenedor hasta
          64px en mobile y 96px desde `lg:` — la franja de papel que separa
          las dos manchas, sin dejar un vacío que empuje el comunicado fuera
          de la primera pantalla. Es la única pieza de la página con espacio
          "de más" a propósito: para subir o bajar el comunicado, este `pb-*`
          y el `260px` del alto de `HomeHero` (que desde `lg:` se deriva del
          viewport) son los números a tocar.

          Va como padding de un envoltorio, no como `mb-*` del hero: los
          márgenes verticales de hermanos en flujo colapsan, así que un margen
          se comería contra el `margin-top` que pone `space-y-8` y no
          cambiaría nada. Tampoco como padding del propio `<section>`, que
          estiraría la imagen (`fill` + `overflow-hidden`). */}
      <div className="pb-8 lg:pb-16">
        <HomeHero />
      </div>

      <ComunicadoDestacado noticia={comunicadoDestacado} />

      <HomeSlider
        noticias={noticias}
        cumpleanos={cumpleanos}
        mes={mes}
        dias={dias}
      />

      {/* Contenido semanal (2 de 3 columnas) + próximos eventos (1 de 3).
          `items-start` a propósito: sin comunicado/cumpleaños compartiendo
          alto como en la fila anterior, no hay un criterio de "igualar altos"
          que justifique el stretch por defecto de CSS Grid — cada columna
          toma su alto natural. Cumpleaños ya no va aquí — vive en el slide 3
          del slider de arriba (`HomeSlider` → `CumpleanosMiniCalendario`),
          que además suma navegación de mes y resalta la semana actual.

          Grilla de 3 columnas con `gap-x-4` (no `[2fr_1fr]` + `gap-6`) para
          calzar con las casillas del slider de arriba, que son tercios con
          16px entre ellas (`CarouselItem` → `pl-4`): así la imagen del
          contenido semanal termina justo donde termina la segunda casilla y
          la columna derecha arranca donde arranca el calendario. Un `2fr_1fr`
          reparte el ancho descontando un solo hueco y deja la columna
          izquierda ~11px más corta que las dos casillas de arriba. Si
          `ContenidoSemanal` devuelve `null`, su wrapper se oculta
          (`empty:hidden`, para no sumar un `gap` vacío en mobile) y la columna
          derecha sigue en su tercio gracias a `lg:col-start-3`. */}
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:gap-x-4">
        <div className="empty:hidden lg:col-span-2">
          <ContenidoSemanal contenido={contenidoSemanal} />
        </div>
        <div className="flex flex-col gap-6 lg:col-start-3">
          <QuinqueniosCarousel quinquenios={quinquenios} />
        </div>
      </div>

      <NuevosIngresos empleados={nuevosIngresos} />
    </div>
  )
}
