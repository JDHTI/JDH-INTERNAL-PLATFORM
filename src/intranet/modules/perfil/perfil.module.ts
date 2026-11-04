import { UserRound } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * Sin `nav`: no es un ítem del header/sidebar principal — se llega desde
 * "Mi perfil" en el dropdown de usuario (`UserMenu`), que enlaza directo a
 * `href`. El propio módulo monta su rail permanente (`PerfilShell`) para
 * navegar entre sus secciones.
 */
export const perfilModule = defineModule({
  id: "perfil",
  title: "Mi perfil",
  description:
    "Configura tu foto de perfil, datos de contacto directo y horarios de atención.",
  href: "/perfil",
  icon: UserRound,
  permissions: [PERMISSIONS.perfil.read],
})
