import { GraduationCap } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * Ocupa el `order: 40` que antes tenía Eventos en la barra principal (Eventos
 * salió de la barra, ver `eventos.module.ts`): queda entre los cuatro
 * primeros módulos `main`, así que también aparece en la barra móvil.
 */
export const induccionModule = defineModule({
  id: "induccion",
  title: "Inducción corporativa",
  description:
    "Programa de inducción para nuevos colaboradores: historia, cultura, políticas y primeros pasos en JDH.",
  href: "/induccion",
  icon: GraduationCap,
  nav: { section: "main", order: 40, label: "Inducción" },
  permissions: [PERMISSIONS.induccion.read],
})
