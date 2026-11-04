import { Bell } from "lucide-react"

import { PendingBackend } from "@/intranet/components/common/pending-backend"
import { NotificacionesView, notificacionesModule } from "@/intranet/modules/notificaciones"

export const metadata = { title: "Notificaciones" }

export default function Page() {
  if (notificacionesModule.enabled === false) {
    return (
      <PendingBackend
        icon={Bell}
        title="Notificaciones en preparación"
        description="Pronto verás aquí los avisos de noticias y comunicados dirigidos a ti."
      />
    )
  }
  return <NotificacionesView />
}
