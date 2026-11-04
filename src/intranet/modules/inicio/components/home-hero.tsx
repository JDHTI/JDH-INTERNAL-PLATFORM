import Image from "next/image"

import { siteConfig } from "@/intranet/config/site"

/**
 * Banner principal de la home: la foto corporativa del equipo en bodega
 * (`public/photos/equipo.webp`) a todo el ancho de la PANTALLA, no del
 * contenedor. Encuadre `50% 10%`, no centrado: la foto es 16:9 y el banner
 * ronda 3:1, así que `object-cover` recorta casi un tercio del alto; centrado
 * ese recorte se come las cabezas del equipo, anclado arriba las conserva y
 * lo que se pierde son piernas, que de todas formas tapa el degradado. Rompe
 * deliberadamente el
 * `max-w-[var(--container-wide)]` + `px-6` de `(intranet)/layout.tsx` para que
 * abarque casi todo el viewport, mucho más que el resto del contenido.
 *
 * La técnica (`relative left-1/2 w-screen -translate-x-1/2`) no depende del
 * padding/max-width del ancestro: `left-1/2` desplaza el borde izquierdo al
 * centro del bloque contenedor (que está centrado por `mx-auto`, es decir, al
 * centro real del viewport), y `-translate-x-1/2` retrocede la mitad del
 * ANCHO PROPIO del elemento (`100vw`) — no del contenedor —, dejando el borde
 * izquierdo exactamente en `0`. Funciona sin tocar `layout.tsx` (que afectaría
 * a todas las páginas) y sin depender del valor exacto del padding del
 * `<main>`. Requiere que no haya scroll horizontal visible para que `100vw`
 * coincida con el viewport real — ya se cumple (`scrollbar-width: none` +
 * `overflow-x: hidden` en `body`, ver `.claude/ARCHITECTURE.md` 2026-07-27).
 *
 * El texto vuelve a alinearse al `max-w`/`px-6` de la página (no al borde de
 * la pantalla) para que el título quede en la misma columna que el saludo de
 * arriba — solo la imagen es full-bleed, no la tipografía.
 *
 * Usa `next/image` (y no el `<img>` plano de `OverlayCard`) a propósito: es el
 * LCP de la página, así que `fill` + `sizes` dejan que Next sirva el tamaño que
 * corresponda y `priority` evita el lazy-load que retrasaría justo el elemento
 * que define la métrica. La fuente es el derivado de
 * `scripts/generate-photo-assets.mjs` (antes era el PNG de ~1.8 MB en la raíz
 * de `public/`).
 *
 * Sin bordes redondeados: al ser edge-to-edge, un radio se vería como un
 * corte flotante en vez de una esquina real de la pantalla.
 *
 * Alto: el banner busca presencia sin tragarse la primera pantalla — junto
 * con el respiro que `HomeView` deja debajo, el comunicado destacado asoma
 * apenas al cargar e invita a bajar. Un alto fijo solo cuadraba ese encuadre
 * en una resolución (460px se veía bien en 1280×720 pero quedaba como franja
 * en 1920×1080), así que desde `lg:` el alto se deriva del viewport:
 *
 * - `100svh - 260px`: lo que deja libre el chrome + saludo + respiro de
 *   arriba. En 1280×720 da los mismos 460px de antes; en 1920×1080, 820px.
 * - `min(…, 48vw)`: tope por ancho, para que en pantallas altas y angostas
 *   (tablet vertical, ventana partida) no se vuelva casi cuadrado. Mantiene
 *   la proporción en ~2.3–2.8:1 en los monitores habituales.
 * - `clamp(420px, …, 960px)`: piso para ventanas muy bajas, techo para 4K.
 *
 * Por debajo de `lg:` siguen los altos fijos (320/400px): en mobile y tablet
 * el contenido de arriba se apila y su alto varía demasiado para restarlo.
 * Si cambia el alto del chrome o del saludo, el `260px` es el número a
 * revisar, junto con el `pb-*` de `HomeView`.
 */
export function HomeHero() {
  return (
    <section className="relative left-1/2 h-[320px] w-screen -translate-x-1/2 overflow-hidden sm:h-[400px] lg:h-[clamp(420px,min(calc(100svh_-_260px),48vw),960px)]">
      <Image
        src="/photos/equipo.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_10%]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/85 via-[var(--color-ink)]/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex w-full max-w-[var(--container-wide)] flex-col gap-2 px-6 pb-6 text-[var(--color-on-ink)] sm:pb-8 2xl:gap-3 2xl:pb-12">
          <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase 2xl:text-sm">
            {siteConfig.company}
          </p>
          <h2 className="max-w-3xl text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl 2xl:max-w-4xl 2xl:text-5xl">
            Todo lo que pasa en JDH, en un solo lugar
          </h2>
          <p className="max-w-2xl text-sm text-[var(--color-on-ink-muted)] sm:text-base 2xl:text-lg">
            Noticias, comunicados y el directorio de la compañía.
          </p>
        </div>
      </div>
    </section>
  )
}
