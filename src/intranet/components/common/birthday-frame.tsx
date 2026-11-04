import { cn } from "@/intranet/lib/utils"

/**
 * Globos por tamaño de avatar: ancho del SVG y cuánto sobresale arriba a la
 * derecha. Proporcionales al avatar (32/36/48/96px) para que el marco se lea
 * igual en una fila de tabla que en el hero del perfil, sin tapar la cara.
 */
const sizeClasses = {
  sm: {
    balloons: "w-[18px] -top-[11px] -right-[9px]",
    ring: "-inset-[3px] border-2",
  },
  md: {
    balloons: "w-[20px] -top-[12px] -right-[10px]",
    ring: "-inset-[3px] border-2",
  },
  lg: {
    balloons: "w-[26px] -top-[15px] -right-[12px]",
    ring: "-inset-[4px] border-2",
  },
  xl: {
    balloons: "w-[46px] -top-[26px] -right-[20px]",
    ring: "-inset-[6px] border-[3px]",
  },
} as const

/**
 * Colores por superficie: `surface` = el avatar va sobre el fondo de la página
 * (sigue a `--color-text`, así se invierte solo en modo oscuro); `ink` = va
 * sobre el chrome negro (header). Monocromo a propósito — DESIGN.md §1 no
 * admite color de acento en la UI; los globos se reconocen por la forma, no
 * por el color.
 */
const toneStyles = {
  surface: {
    ring: "border-[var(--color-text)]",
    front: "var(--color-text)",
    back: "var(--neutral-500)",
    side: "var(--neutral-300)",
    // Fondo de la página: contrasta con el globo frontal (`--color-text`)
    // en ambos temas — blanco sobre ink en claro, ink sobre blanco en oscuro.
    shine: "var(--color-bg)",
    string: "var(--color-text)",
  },
  ink: {
    ring: "border-[var(--color-on-ink)]",
    front: "var(--color-on-ink)",
    back: "var(--neutral-500)",
    side: "var(--neutral-300)",
    shine: "var(--neutral-900)",
    string: "var(--color-on-ink)",
  },
} as const

export interface BirthdayFrameProps {
  size: keyof typeof sizeClasses
  tone?: keyof typeof toneStyles
  children: React.ReactNode
  className?: string
}

/**
 * Marco de cumpleaños para un avatar: aro continuo alrededor y un ramo de
 * tres globos arriba a la derecha que flota suave (`balloon-float` en
 * `globals.css`, solo con `motion-safe` — quieto bajo
 * `prefers-reduced-motion`). Decorativo salvo por el texto `sr-only`, que
 * le cuenta a un lector de pantalla por qué el avatar se ve distinto.
 *
 * Envuelve al avatar en vez de vivir dentro de él: el `Avatar` de shadcn
 * recorta con `overflow-hidden` + `rounded-full`, y los globos tienen que
 * sobresalir del círculo.
 *
 * `pointer-events-none` en el envoltorio: al ser `relative` pinta encima del
 * enlace-overlay de las filas de `DataTable` y atraparía el clic (mismo caso
 * que documenta `directorio-table.tsx` para el avatar). Donde el avatar va
 * dentro de un `<Link>`/`<button>` (header, hero del perfil), el clic cae al
 * contenedor igual.
 */
export function BirthdayFrame({
  size,
  tone = "surface",
  children,
  className,
}: BirthdayFrameProps) {
  const s = sizeClasses[size]
  const c = toneStyles[tone]

  return (
    <span
      className={cn(
        "pointer-events-none relative inline-flex shrink-0",
        className
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-full border-solid",
          s.ring,
          c.ring
        )}
      />
      <svg
        aria-hidden
        viewBox="0 0 40 52"
        className={cn(
          "pointer-events-none absolute h-auto origin-bottom overflow-visible motion-safe:animate-[balloon-float_3.2s_ease-in-out_infinite]",
          s.balloons
        )}
      >
        {/* Hilos: convergen en un solo punto, como un ramo. */}
        <g fill="none" stroke={c.string} strokeWidth="1" strokeLinecap="round">
          <path d="M11 25 C 13 33, 17 39, 20 51" />
          <path d="M29 23 C 27 32, 23 39, 20 51" />
          <path d="M20 32 C 18 38, 22 44, 20 51" />
        </g>
        {/* Globo trasero izquierdo */}
        <ellipse cx="11" cy="13" rx="8" ry="10" fill={c.back} />
        <path d="M9.5 22.6 L11 25 L12.5 22.6 Z" fill={c.back} />
        {/* Globo trasero derecho */}
        <ellipse
          cx="29"
          cy="11.5"
          rx="8"
          ry="10"
          fill={c.side}
          stroke={c.string}
          strokeWidth="0.75"
        />
        <path d="M27.5 21 L29 23.4 L30.5 21 Z" fill={c.side} />
        {/* Globo frontal */}
        <ellipse cx="20" cy="19" rx="9" ry="11" fill={c.front} />
        <path d="M18.4 29.6 L20 32.2 L21.6 29.6 Z" fill={c.front} />
        <ellipse
          cx="16.8"
          cy="14.5"
          rx="2"
          ry="3.2"
          fill={c.shine}
          opacity="0.45"
          transform="rotate(-20 16.8 14.5)"
        />
      </svg>
      <span className="sr-only">Hoy cumple años</span>
    </span>
  )
}
