import { FileText } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

import {
  CONTROL_DOCUMENTAL_PATH,
  SIG_BASE_PATH,
  SIG_MODULOS,
  sigModuloHref,
} from "./sig.config"

/**
 * El SIG reemplazó a «Documentos y políticas» (2026-11-27). Conserva el
 * permiso `documentos:read` y el tag de caché `documentos`: son
 * identificadores internos, y cambiarlos tocaría los roles y el webhook del
 * CMS sin cambiar nada para el colaborador.
 *
 * Un ítem con `children` se pinta como menú desplegable, no como enlace, así
 * que la portada del SIG va como primer hijo.
 */
export const sigModule = defineModule({
  id: "sig",
  title: "Sistema Integrado de Gestión",
  description:
    "Cultura, políticas, mapa de procesos, SST y cumplimiento normativo, con el control documental de la compañía.",
  href: SIG_BASE_PATH,
  icon: FileText,
  nav: {
    section: "main",
    order: 20,
    label: "SIG",
    children: [
      { label: "Inicio del SIG", href: SIG_BASE_PATH },
      ...SIG_MODULOS.map((modulo) => ({
        label: modulo.title,
        href: sigModuloHref(modulo.slug),
      })),
      { label: "Control documental", href: CONTROL_DOCUMENTAL_PATH },
    ],
  },
  permissions: [PERMISSIONS.documentos.read],
})
