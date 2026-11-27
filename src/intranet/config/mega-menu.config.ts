import type { NavLink } from "@/intranet/lib/navigation"

/**
 * A mega-menu group. `moduleIds` pulls live modules from the registry (their
 * icon/title/description/href resolved client-side); `links` adds extra static
 * links that aren't modules. A group can use either or both.
 */
export interface MegaMenuGroup {
  id: string
  title: string
  /** Module ids to surface in this group (resolved against the registry). */
  moduleIds?: string[]
  /** Extra non-module links. */
  links?: NavLink[]
}

export interface MegaMenuConfig {
  groups: MegaMenuGroup[]
  /** Optional highlighted card at the side of the panel. */
  featured?: {
    title: string
    description: string
    href: `/${string}`
    cta: string
  }
}

/**
 * Content for the "Explorar todo" mega menu. The design only defined the
 * trigger, so the panel is composed here: grouped module shortcuts plus a
 * featured highlight. Keep `href`s pointing at existing module roots until
 * their sub-pages exist (typedRoutes would let a missing route 404).
 */
export const megaMenuConfig: MegaMenuConfig = {
  groups: [
    {
      id: "comunicacion",
      title: "Comunicación",
      moduleIds: ["noticias"],
    },
    {
      id: "recursos",
      title: "Recursos",
      moduleIds: [
        "induccion",
        "sig",
        "directorio",
        "catalogo",
        "marca",
      ],
    },
    {
      id: "servicios",
      title: "Servicios y soporte",
      moduleIds: ["autogestion", "ayuda"],
    },
  ],
  featured: {
    title: "Noticias y comunicados",
    description:
      "Mantente al día con los anuncios corporativos y novedades de la organización.",
    href: "/noticias",
    cta: "Ver novedades",
  },
}
