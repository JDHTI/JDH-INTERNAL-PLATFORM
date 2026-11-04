import { UserCog } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * Ocupa en la barra principal (`order: 55`) el slot que dejaron `certificados`
 * y `vacaciones`: es el único punto de entrada a esos trámites mientras los
 * resuelva el portal externo de Gestión Humana.
 *
 * `href` apunta a la antesala interna (`/autogestion`), no al portal: la URL
 * externa vive en `autogestion.config.ts` y solo se alcanza desde esa página,
 * que antes explica la restricción de red corporativa.
 */
export const autogestionModule = defineModule({
  id: "autogestion",
  title: "Portal autogestión",
  description:
    "Certificados laborales y bancarios, colillas de pago y consulta de vacaciones, en el portal de Gestión Humana.",
  href: "/autogestion",
  icon: UserCog,
  nav: { section: "main", order: 55 },
  permissions: [PERMISSIONS.autogestion.read],
})
