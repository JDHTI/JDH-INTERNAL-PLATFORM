/**
 * Contenido del área de Design System, transcrito de `.claude/DESIGN.md`
 * (§1 principios, §5 anti-patrones) y de los tokens de `src/app/globals.css`.
 *
 * Solo se listan aquí los **nombres** de los tokens: los valores se leen en
 * vivo del CSS (`var(--…)`) al renderizar, de modo que la página nunca puede
 * desincronizarse del sistema real. Si un token cambia en `globals.css`, la
 * documentación cambia con él.
 */

export interface DesignPrinciple {
  title: string
  description: string
}

/** DESIGN.md §1. */
export const designPrinciples: DesignPrinciple[] = [
  {
    title: "Minimalismo corporativo, no decorativo",
    description:
      "Cada elemento justifica su presencia. Si algo puede quitarse sin perder claridad, se quita. El espacio en blanco es un componente activo, no un sobrante.",
  },
  {
    title: "Monocromo disciplinado",
    description:
      "La interfaz se construye en negro, blanco y grises cálidos. Sin acento en el chrome: la jerarquía se logra con contraste, peso tipográfico y espacio.",
  },
  {
    title: "El negro es la firma",
    description:
      "Header, footer, botón primario y estados activos son negros. El negro estructura la página; el blanco la deja respirar.",
  },
  {
    title: "Tipografía como voz",
    description:
      "Centrale Sans lleva la personalidad. Jerarquía por tamaño y peso, no por adornos. Titulares grandes y limpios; cuerpo cómodo de leer.",
  },
  {
    title: "Estructura honesta",
    description:
      "Divisores, eyebrows y etiquetas comunican algo verdadero del contenido. No se decora con numeración salvo que el contenido sea de verdad una secuencia.",
  },
  {
    title: "Bordes antes que sombras",
    description:
      "La separación se resuelve con líneas hairline de 1px y superficies planas. Las sombras existen, pero son sutiles y escasas.",
  },
  {
    title: "Movimiento con intención",
    description:
      "Transiciones breves y funcionales: hover, foco, entrada. Nada rebota ni gira. Se respeta prefers-reduced-motion.",
  },
  {
    title: "Accesible por construcción",
    description:
      "Contraste AA, foco siempre visible, HTML semántico y objetivos táctiles de 44px o más. No es una capa final: es requisito de cada componente.",
  },
]

/** DESIGN.md §5 — «nunca en una web JDH». */
export const antiPatterns: string[] = [
  "Color en el chrome. Header, footer y botones son monocromos; el Azul JDH solo aparece en el logo.",
  "Negro puro #000000 como superficie o texto: se usa #1D1D1B.",
  "Valores crudos (#333, 18px, radios de 12px) en el markup: se usan variables y tokens.",
  "Comunicar estado solo con color. En monocromo el estado va con texto, icono y peso o borde.",
  "Eliminar el foco (outline: none) sin reemplazo visible: es violación de WCAG.",
  "Sombras genéricas por todos lados o radios grandes (look «Bootstrap»).",
  "Más de un botón primario compitiendo en el mismo bloque de decisión.",
  "Degradados, sombras de colores, glows o neomorfismo.",
  "Numeración 01/02/03 u otros marcadores de secuencia cuando el contenido no es una secuencia.",
  "Texto secundario en el color del texto primario (o al revés): rompe la jerarquía.",
  "Fuente por defecto (Arial/Times) sin declarar el fallback correcto de Centrale Sans.",
]

/** Rampa de neutrales (globals.css, capa primitiva). */
export const neutralTokens = [
  { name: "--neutral-0", note: "Blanco JDH" },
  { name: "--neutral-100", note: "Fondo sutil" },
  { name: "--neutral-200", note: "Borde" },
  { name: "--neutral-300", note: "Borde fuerte" },
  { name: "--neutral-500", note: "Texto terciario" },
  { name: "--neutral-700", note: "Texto secundario" },
  { name: "--neutral-900", note: "Negro JDH" },
] as const

/** Escala tipográfica (globals.css, --fs-*). */
export const typeScaleTokens = [
  { name: "--fs-display", label: "Display" },
  { name: "--fs-h1", label: "H1" },
  { name: "--fs-h2", label: "H2" },
  { name: "--fs-h3", label: "H3" },
  { name: "--fs-h4", label: "H4" },
  { name: "--fs-h5", label: "H5" },
  { name: "--fs-h6", label: "H6" },
  { name: "--fs-lead", label: "Lead" },
  { name: "--fs-body", label: "Body" },
  { name: "--fs-sm", label: "Small" },
  { name: "--fs-caption", label: "Caption" },
] as const

/** Escala de espacio, base 4px. */
export const spaceTokens = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-6",
  "--space-8",
  "--space-12",
  "--space-16",
  "--space-24",
  "--space-32",
] as const

/** Radios de contenido. */
export const radiusTokens = [
  { name: "--jdh-radius-none", label: "none" },
  { name: "--jdh-radius-sm", label: "sm — controles" },
  { name: "--jdh-radius-md", label: "md — cards" },
  { name: "--jdh-radius-lg", label: "lg — superficies grandes" },
  { name: "--jdh-radius-full", label: "full — pills y avatares" },
] as const

/** Duraciones de movimiento. */
export const durationTokens = [
  { name: "--duration-fast", label: "fast", usage: "Hover y foco" },
  { name: "--duration-base", label: "base", usage: "Transiciones estándar" },
  { name: "--duration-slow", label: "slow", usage: "Entradas y overlays" },
] as const

/** Capas de apilamiento. */
export const zIndexTokens = [
  { name: "--z-base", label: "base" },
  { name: "--z-dropdown", label: "dropdown" },
  { name: "--z-sticky", label: "sticky" },
  { name: "--z-overlay", label: "overlay" },
  { name: "--z-modal", label: "modal" },
  { name: "--z-popover", label: "popover" },
  { name: "--z-toast", label: "toast" },
] as const
