import { Newspaper } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

export const noticiasModule = defineModule({
  id: "noticias",
  title: "Noticias y comunicados",
  description:
    "Anuncios corporativos, comunicados y novedades para toda la organización.",
  href: "/noticias",
  icon: Newspaper,
  nav: { section: "main", order: 10 },
  permissions: [PERMISSIONS.noticias.read],
})
