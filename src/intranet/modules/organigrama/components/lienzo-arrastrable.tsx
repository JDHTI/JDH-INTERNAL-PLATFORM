"use client"

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { cn } from "@/intranet/lib/utils"

/** Lo que hay que mover el mouse antes de que un clic pase a ser un arrastre. */
const UMBRAL_ARRASTRE = 5
const PASO_TECLADO = 160

interface Riel {
  visible: boolean
  /** Ancho del pulgar como fracción del riel (0–1). */
  ancho: number
  /** Posición izquierda del pulgar como fracción del riel (0–1). */
  izquierda: number
}

const RIEL_OCULTO: Riel = { visible: false, ancho: 1, izquierda: 0 }

interface LienzoArrastrableProps {
  children: ReactNode
  /**
   * Cambia cuando el contenido cambia de forma (ramas abiertas, rama
   * enfocada, búsqueda). Con la clave nueva el lienzo se recentra, salvo que
   * el cambio venga de desplegar un cargo: ahí conserva ese cargo donde
   * estaba.
   */
  claveContenido: string
  className?: string
}

/**
 * Lienzo horizontal para un contenido más ancho que la pantalla.
 *
 * Sin la barra de scroll nativa: con el organigrama expandido es altísimo y
 * esa barra queda al final del contenedor, fuera de la vista. En su lugar:
 *
 * - **Arrastre con el mouse** sobre el propio lienzo (también hacia arriba y
 *   abajo, moviendo la página). Con touch se deja el scroll nativo.
 * - **Riel propio**, delgado y arrastrable, pegado al borde inferior de la
 *   ventana mientras el lienzo está a la vista, con la misma semántica que
 *   una barra de scroll (rol `scrollbar`, flechas, Inicio y Fin).
 * - La rueda y el gesto horizontal del trackpad siguen funcionando.
 *
 * El contenido va centrado si cabe y se desplaza desde la izquierda si no.
 */
export function LienzoArrastrable({
  children,
  claveContenido,
  className,
}: LienzoArrastrableProps) {
  const lienzoId = useId()
  const lienzo = useRef<HTMLDivElement>(null)
  const riel = useRef<HTMLDivElement>(null)
  const ancla = useRef<{ id: string; izquierda: number } | null>(null)
  const arrastre = useRef<{
    x: number
    y: number
    scroll: number
    activo: boolean
  } | null>(null)
  const arrastreRiel = useRef<{ x: number; scroll: number } | null>(null)

  const [arrastrando, setArrastrando] = useState(false)
  const [medidas, setMedidas] = useState<Riel>(RIEL_OCULTO)

  const medir = useCallback(() => {
    const el = lienzo.current
    if (!el) return
    const maximo = el.scrollWidth - el.clientWidth
    if (maximo <= 1) {
      setMedidas((previas) => (previas.visible ? RIEL_OCULTO : previas))
      return
    }
    const ancho = el.clientWidth / el.scrollWidth
    setMedidas({
      visible: true,
      ancho,
      izquierda: (el.scrollLeft / maximo) * (1 - ancho),
    })
  }, [])

  // El contenido crece o encoge al abrir ramas: hay que volver a medir.
  useEffect(() => {
    const el = lienzo.current
    if (!el) return
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    if (el.firstElementChild) observador.observe(el.firstElementChild)
    return () => observador.disconnect()
  }, [medir])

  useLayoutEffect(() => {
    const el = lienzo.current
    if (!el) return
    const anclaPrevia = ancla.current
    ancla.current = null

    const caja = anclaPrevia
      ? el.querySelector<HTMLElement>(
          `[data-cargo-id="${CSS.escape(anclaPrevia.id)}"]`
        )
      : null
    if (anclaPrevia && caja) {
      el.scrollLeft += caja.getBoundingClientRect().left - anclaPrevia.izquierda
    } else {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
    }
    medir()
  }, [claveContenido, medir])

  // Antes de que cambie el estado, se anota dónde está el cargo que se va a
  // desplegar para dejarlo en el mismo lugar cuando el contenido se reacomode.
  const alPulsar = (event: MouseEvent<HTMLDivElement>) => {
    const control = (event.target as HTMLElement).closest("[data-toggle]")
    const caja = control?.closest<HTMLElement>("[data-cargo-id]")
    if (caja?.dataset.cargoId) {
      ancla.current = {
        id: caja.dataset.cargoId,
        izquierda: caja.getBoundingClientRect().left,
      }
    }
  }

  const iniciarArrastre = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    arrastre.current = {
      x: event.clientX,
      y: event.clientY,
      scroll: event.currentTarget.scrollLeft,
      activo: false,
    }
  }

  const moverArrastre = (event: PointerEvent<HTMLDivElement>) => {
    const actual = arrastre.current
    if (!actual) return
    const dx = event.clientX - actual.x
    const dy = event.clientY - actual.y
    if (!actual.activo) {
      if (Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return
      actual.activo = true
      // Con el puntero capturado, el clic que sigue al arrastre ya no llega
      // al botón sobre el que empezó.
      event.currentTarget.setPointerCapture(event.pointerId)
      setArrastrando(true)
      actual.y = event.clientY
      return
    }
    event.currentTarget.scrollLeft = actual.scroll - dx
    window.scrollBy({ top: actual.y - event.clientY, behavior: "instant" })
    actual.y = event.clientY
  }

  const terminarArrastre = (event: PointerEvent<HTMLDivElement>) => {
    if (arrastre.current?.activo) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    arrastre.current = null
    setArrastrando(false)
  }

  const moverA = (scroll: number) => {
    const el = lienzo.current
    if (!el) return
    const maximo = el.scrollWidth - el.clientWidth
    el.scrollLeft = Math.min(maximo, Math.max(0, scroll))
  }

  const iniciarArrastreRiel = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    arrastreRiel.current = {
      x: event.clientX,
      scroll: lienzo.current?.scrollLeft ?? 0,
    }
  }

  const moverArrastreRiel = (event: PointerEvent<HTMLDivElement>) => {
    const actual = arrastreRiel.current
    const el = lienzo.current
    const pista = riel.current
    if (!actual || !el || !pista) return
    // Un píxel del pulgar equivale a `scrollWidth / ancho del riel` de scroll.
    moverA(
      actual.scroll +
        (event.clientX - actual.x) * (el.scrollWidth / pista.clientWidth)
    )
  }

  const terminarArrastreRiel = (event: PointerEvent<HTMLDivElement>) => {
    if (arrastreRiel.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    arrastreRiel.current = null
  }

  /** Clic en el riel fuera del pulgar: el pulgar se centra donde se pulsó. */
  const saltarEnRiel = (event: PointerEvent<HTMLDivElement>) => {
    const el = lienzo.current
    if (!el) return
    const caja = event.currentTarget.getBoundingClientRect()
    const fraccion = (event.clientX - caja.left) / caja.width
    const maximo = el.scrollWidth - el.clientWidth
    moverA(((fraccion - medidas.ancho / 2) / (1 - medidas.ancho)) * maximo)
  }

  const teclasRiel = (event: KeyboardEvent<HTMLDivElement>) => {
    const el = lienzo.current
    if (!el) return
    const paginas = el.clientWidth * 0.9
    const destino: Record<string, number> = {
      ArrowLeft: el.scrollLeft - PASO_TECLADO,
      ArrowRight: el.scrollLeft + PASO_TECLADO,
      PageUp: el.scrollLeft - paginas,
      PageDown: el.scrollLeft + paginas,
      Home: 0,
      End: el.scrollWidth,
    }
    if (event.key in destino) {
      event.preventDefault()
      moverA(destino[event.key])
    }
  }

  const progreso =
    medidas.ancho < 1
      ? Math.round((medidas.izquierda / (1 - medidas.ancho)) * 100)
      : 0

  return (
    <div className={cn("relative", className)}>
      <div
        ref={lienzo}
        id={lienzoId}
        data-lenis-prevent-horizontal
        onScroll={medir}
        onClickCapture={alPulsar}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        className={cn(
          "[scrollbar-width:none] overflow-x-auto select-none [&::-webkit-scrollbar]:hidden",
          arrastrando ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="mx-auto w-max px-4 py-2">{children}</div>
      </div>

      {medidas.visible ? (
        <div className="sticky bottom-3 z-10 mx-auto mt-2 w-full max-w-[var(--container-wide)] px-6">
          <div
            ref={riel}
            onPointerDown={saltarEnRiel}
            className="relative h-3.5 cursor-pointer rounded-full border border-border bg-card/90 shadow-sm backdrop-blur-sm"
          >
            <div
              role="scrollbar"
              tabIndex={0}
              aria-label="Desplazar el organigrama"
              aria-controls={lienzoId}
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progreso}
              onPointerDown={iniciarArrastreRiel}
              onPointerMove={moverArrastreRiel}
              onPointerUp={terminarArrastreRiel}
              onPointerCancel={terminarArrastreRiel}
              onKeyDown={teclasRiel}
              className="absolute inset-y-0 cursor-grab touch-none rounded-full bg-foreground/60 outline-none hover:bg-foreground/80 focus-visible:bg-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing"
              style={{
                width: `${medidas.ancho * 100}%`,
                left: `${medidas.izquierda * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
