import { Building2, ClipboardList, HeartPulse } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Estructura del SIG. Los módulos y sus secciones son fijos en código; el
 * contenido de cada sección (texto o archivo) lo publica el equipo SIG en el
 * CMS, marcando cada `documento` con su `seccion`. Cambiar un valor de
 * `cmsValue` exige cambiar la enumeración del CMS en el mismo despliegue.
 */

export const SIG_BASE_PATH = "/sig"
export const CONTROL_DOCUMENTAL_PATH = "/sig/control-documental"

export const SIG_SECCION_VALUES = [
  "cultura_historia",
  "cultura_mision",
  "cultura_vision",
  "cultura_codigo_etica",
  "sig_politicas",
  "sig_mapa_procesos",
  "sst_seguridad_salud",
  "sst_emergencias",
  "sst_sig",
  "sst_sagrilaft_etica",
  "sst_habeas_data",
] as const
export type SigSeccionValue = (typeof SIG_SECCION_VALUES)[number]

export const SIG_COMPONENTES = [
  { value: "calidad", label: "Calidad" },
  { value: "ambiental", label: "Ambiental" },
  { value: "sst", label: "SST" },
  { value: "rh", label: "Recursos humanos" },
] as const
export type SigComponente = (typeof SIG_COMPONENTES)[number]["value"]

export type SigPresentacion = "pagina" | "descarga"

/**
 * Cómo se pinta una sección de contenido:
 * - `texto`: el documento se lee ahí mismo (historia, misión, mapa de procesos).
 * - `lista`: tarjetas; cada una abre su página de lectura o descarga el archivo.
 * - `politicas`: una tarjeta por componente, arriba del módulo.
 */
export type SigSeccionLayout = "texto" | "lista" | "politicas"

export interface SigSeccionContenido {
  kind: "contenido"
  slug: string
  label: string
  cmsValue: SigSeccionValue
  layout: SigSeccionLayout
  /** Texto del estado vacío, cuando el CMS aún no tiene nada publicado ahí. */
  empty: string
}

/** Sección que no vive en el CMS: lleva a otra pantalla de la intranet. */
export interface SigSeccionEnlace {
  kind: "enlace"
  slug: string
  label: string
  description: string
  href: `/${string}`
  actionLabel: string
}

export type SigSeccion = SigSeccionContenido | SigSeccionEnlace

export const SIG_MODULO_SLUGS = [
  "cultura",
  "gestion",
  "sst-cumplimiento",
] as const
export type SigModuloSlug = (typeof SIG_MODULO_SLUGS)[number]

export interface SigModulo {
  slug: SigModuloSlug
  title: string
  description: string
  icon: LucideIcon
  secciones: SigSeccion[]
}

export const SIG_MODULOS: readonly SigModulo[] = [
  {
    slug: "cultura",
    title: "Cultura, valores y propósito",
    description:
      "Quiénes somos, hacia dónde vamos y cómo actuamos. Es el marco común que conviene conocer antes de entrar a cualquier proceso.",
    icon: Building2,
    secciones: [
      {
        kind: "contenido",
        slug: "historia",
        label: "Historia",
        cmsValue: "cultura_historia",
        layout: "texto",
        empty: "La historia de la compañía aún no está publicada.",
      },
      {
        kind: "contenido",
        slug: "mision",
        label: "Misión",
        cmsValue: "cultura_mision",
        layout: "texto",
        empty: "La misión aún no está publicada.",
      },
      {
        kind: "contenido",
        slug: "vision",
        label: "Visión",
        cmsValue: "cultura_vision",
        layout: "texto",
        empty: "La visión aún no está publicada.",
      },
      {
        kind: "contenido",
        slug: "codigo-de-etica",
        label: "Código de ética",
        cmsValue: "cultura_codigo_etica",
        layout: "lista",
        empty: "El código de ética aún no está publicado.",
      },
      {
        kind: "enlace",
        slug: "estructura-organizacional",
        label: "Estructura organizacional",
        description:
          "Cargos, áreas y líneas de reporte de la compañía en el organigrama vigente.",
        href: "/organigrama",
        actionLabel: "Ver el organigrama",
      },
    ],
  },
  {
    slug: "gestion",
    title: "Sistema Integrado de Gestión",
    description:
      "Políticas vigentes de calidad, ambiental y SST, el mapa de procesos y el control documental.",
    icon: ClipboardList,
    secciones: [
      {
        kind: "contenido",
        slug: "politicas",
        label: "Políticas SIG",
        cmsValue: "sig_politicas",
        layout: "politicas",
        empty: "Las políticas del SIG aún no están publicadas.",
      },
      {
        kind: "contenido",
        slug: "mapa-de-procesos",
        label: "Mapa de procesos",
        cmsValue: "sig_mapa_procesos",
        layout: "texto",
        empty: "El mapa de procesos aún no está publicado.",
      },
      {
        kind: "enlace",
        slug: "control-documental",
        label: "Control documental",
        description:
          "Todos los documentos controlados, con código, versión y fecha de revisión. Busca por nombre o filtra por componente.",
        href: CONTROL_DOCUMENTAL_PATH,
        actionLabel: "Abrir el control documental",
      },
    ],
  },
  {
    slug: "sst-cumplimiento",
    title: "SST y cumplimiento normativo",
    description:
      "Seguridad y salud en el trabajo, emergencias y las normas que todos debemos cumplir. Los documentos obligatorios tienen su evaluación de aprobación.",
    icon: HeartPulse,
    secciones: [
      {
        kind: "contenido",
        slug: "seguridad-y-salud",
        label: "Seguridad y salud en el trabajo",
        cmsValue: "sst_seguridad_salud",
        layout: "lista",
        empty: "Aún no hay documentos de seguridad y salud en el trabajo.",
      },
      {
        kind: "contenido",
        slug: "emergencias",
        label: "Emergencias",
        cmsValue: "sst_emergencias",
        layout: "lista",
        empty: "Aún no hay documentos de emergencias.",
      },
      {
        kind: "contenido",
        slug: "sig",
        label: "SIG",
        cmsValue: "sst_sig",
        layout: "lista",
        empty: "Aún no hay documentos del SIG en esta sección.",
      },
      {
        kind: "contenido",
        slug: "sagrilaft-etica",
        label: "SAGRILAFT y ética",
        cmsValue: "sst_sagrilaft_etica",
        layout: "lista",
        empty: "Aún no hay documentos de SAGRILAFT y ética.",
      },
      {
        kind: "contenido",
        slug: "habeas-data",
        label: "Habeas data",
        cmsValue: "sst_habeas_data",
        layout: "lista",
        empty: "Aún no hay documentos de habeas data.",
      },
    ],
  },
]

export function sigModulo(slug: string): SigModulo | undefined {
  return SIG_MODULOS.find((modulo) => modulo.slug === slug)
}

export function sigModuloHref(slug: SigModuloSlug): `/${string}` {
  return `${SIG_BASE_PATH}/${slug}`
}

/** Módulo y sección a los que pertenece un valor de `seccion` del CMS. */
export function sigUbicacion(
  value: SigSeccionValue
): { modulo: SigModulo; seccion: SigSeccionContenido } | undefined {
  for (const modulo of SIG_MODULOS) {
    for (const seccion of modulo.secciones) {
      if (seccion.kind === "contenido" && seccion.cmsValue === value) {
        return { modulo, seccion }
      }
    }
  }
  return undefined
}

export function isSigSeccionValue(value: unknown): value is SigSeccionValue {
  return (SIG_SECCION_VALUES as readonly unknown[]).includes(value)
}

export function isSigComponente(value: unknown): value is SigComponente {
  return SIG_COMPONENTES.some((componente) => componente.value === value)
}

export function componenteLabel(value: SigComponente): string {
  return (
    SIG_COMPONENTES.find((componente) => componente.value === value)?.label ??
    value
  )
}

/** Valores de `seccion` de un módulo, para filtrar sus documentos en el CMS. */
export function moduloCmsValues(modulo: SigModulo): SigSeccionValue[] {
  return modulo.secciones.flatMap((seccion) =>
    seccion.kind === "contenido" ? [seccion.cmsValue] : []
  )
}
