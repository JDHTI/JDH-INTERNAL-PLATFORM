import { Palette } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

export const marcaModule = defineModule({
  id: "marca",
  title: "Marca e identidad",
  description:
    "Manual de marca, identidad corporativa y design system web de JDH.",
  href: "/marca",
  icon: Palette,
  // Después de Certificados (55): es contenido de referencia, no un módulo
  // operativo, así que cierra la fila de módulos principales.
  nav: {
    section: "main",
    order: 60,
    children: [
      { label: "Manual de marca", href: "/marca" },
      { label: "Design system", href: "/marca/design-system" },
      {
        label: "Catálogo de componentes",
        href: "/marca/design-system/componentes",
      },
    ],
  },
  permissions: [PERMISSIONS.marca.read],
})
