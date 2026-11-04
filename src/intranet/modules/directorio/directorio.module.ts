import { Users } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

export const directorioModule = defineModule({
  id: "directorio",
  title: "Directorio",
  description: "Directorio de colaboradores, áreas y sedes de la organización.",
  href: "/directorio",
  icon: Users,
  nav: { section: "main", order: 30 },
  permissions: [PERMISSIONS.directorio.read],
})
