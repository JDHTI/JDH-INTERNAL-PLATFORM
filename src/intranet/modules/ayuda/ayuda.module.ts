import { LifeBuoy } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

export const ayudaModule = defineModule({
  id: "ayuda",
  title: "Ayuda y soporte",
  description:
    "Centro de ayuda, preguntas frecuentes y canal de soporte para colaboradores.",
  href: "/ayuda",
  icon: LifeBuoy,
  // Sección secundaria: soporte vive al final del sidebar, no entre los módulos de contenido.
  nav: { section: "secondary", order: 10 },
  permissions: [PERMISSIONS.ayuda.read],
})
