import { Bell } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * Sin `nav`: la superficie principal es la campana del header
 * (`NotificationsPopover`), no un ítem de la barra lateral. `/notificaciones`
 * es solo la página "ver todas".
 *
 * Apagado hasta que internal-platform-api sirva las notificaciones
 * (docs/intranet-port.md): sin él, la campana se oculta y las páginas dicen
 * que está en preparación.
 */
export const notificacionesModule = defineModule({
  enabled: false,
  id: "notificaciones",
  title: "Notificaciones",
  description: "Avisos de noticias y comunicados dirigidos a ti.",
  href: "/notificaciones",
  icon: Bell,
  permissions: [PERMISSIONS.notificaciones.read],
})
