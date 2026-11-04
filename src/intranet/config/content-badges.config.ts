import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  CircleDashed,
  Megaphone,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react"

/**
 * Editorial content badges — a configurable taxonomy for labelling content
 * (news, documents, cards): "Obligatorio", "Nuevo", "Urgente"… Distinct from
 * `StatusBadge` (object state: dot/count/region). Emphasis is monochrome
 * (fill/outline/dashed/subtle), never color-coded. Resolved by id via
 * `ContentBadge`, so unknown ids from dynamic content render nothing.
 */
export type ContentBadgeEmphasis = "solid" | "outline" | "dashed" | "subtle"

export interface ContentBadgeDef {
  id: string
  label: string
  emphasis: ContentBadgeEmphasis
  /** Rendered inside ContentBadge — never passed across the RSC boundary. */
  icon?: LucideIcon
}

export const contentBadges: readonly ContentBadgeDef[] = [
  {
    id: "obligatorio",
    label: "Obligatorio",
    emphasis: "solid",
    icon: ShieldAlert,
  },
  {
    id: "comunicado",
    label: "Comunicado",
    emphasis: "outline",
    icon: Megaphone,
  },
  { id: "nuevo", label: "Nuevo", emphasis: "subtle", icon: Sparkles },
  { id: "urgente", label: "Urgente", emphasis: "solid", icon: Zap },
  { id: "critico", label: "Crítico", emphasis: "solid", icon: TriangleAlert },
  { id: "actualizado", label: "Actualizado", emphasis: "outline" },
  { id: "borrador", label: "Borrador", emphasis: "dashed" },
  // Estado documental, heredado de la convención del knowledge vault
  // (🟢 oficial · 🟡 derivado · 🔴 pendiente): lo usa la sección de marca para
  // declarar qué está ratificado y qué no, en vez de inventar contenido.
  {
    id: "pendiente",
    label: "Pendiente de formalización",
    emphasis: "dashed",
    icon: CircleDashed,
  },
  { id: "derivado", label: "Estándar derivado", emphasis: "outline" },
  { id: "oficial", label: "Oficial", emphasis: "subtle", icon: BadgeCheck },
]

export function contentBadgeById(id: string): ContentBadgeDef | undefined {
  return contentBadges.find((badge) => badge.id === id)
}
