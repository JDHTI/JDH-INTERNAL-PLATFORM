import { Network } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * Va en `order: 45`, justo después de Inducción corporativa (40), y no junto
 * a Directorio (30): la barra móvil toma los cuatro primeros módulos `main`,
 * y un order menor desplazaría a Inducción de ella.
 */
export const organigramaModule = defineModule({
  id: "organigrama",
  title: "Organigrama",
  description:
    "Estructura organizacional de JDH: áreas, cargos y líneas de reporte.",
  href: "/organigrama",
  icon: Network,
  nav: { section: "main", order: 45 },
  permissions: [PERMISSIONS.organigrama.read],
})
