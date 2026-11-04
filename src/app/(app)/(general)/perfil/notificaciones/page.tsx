import { Bell } from "lucide-react"

import { PendingBackend } from "@/intranet/components/common/pending-backend"
import { PushSettingsView, notificacionesModule } from "@/intranet/modules/notificaciones"

export const metadata = { title: "Notificaciones" }

export default function Page() {
  if (notificacionesModule.enabled === false) {
    return (
      <PendingBackend
        icon={Bell}
        title="Avisos en el navegador en preparación"
        description="Cuando las notificaciones estén activas podrás recibirlas aquí aunque no tengas la intranet abierta."
      />
    )
  }
  return <PushSettingsView />
}
