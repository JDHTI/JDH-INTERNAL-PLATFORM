import { FileText } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

import { SIG_BASE_PATH } from "./sig.config"

/**
 * El SIG reemplazó a «Documentos y políticas» (2026-11-27). Conserva el
 * permiso `documentos:read` y el tag de caché `documentos`: son
 * identificadores internos, y cambiarlos tocaría los roles y el webhook del
 * CMS sin cambiar nada para el colaborador.
 *
 * En el menú es un enlace directo a `/sig`, no un desplegable: la entrada es
 * el recorrido, que empieza por la cultura. Los módulos sueltos y el control
 * documental se abren desde las pestañas del propio SIG (`SigTabs`).
 */
export const sigModule = defineModule({
  id: "sig",
  title: "Sistema Integrado de Gestión",
  description:
    "Cultura, políticas, mapa de procesos, SST y cumplimiento normativo, con el control documental de la compañía.",
  href: SIG_BASE_PATH,
  icon: FileText,
  nav: { section: "main", order: 20, label: "SIG" },
  permissions: [PERMISSIONS.documentos.read],
})
