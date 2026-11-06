import { MessageSquareWarning } from "lucide-react"

import type { NotificacionFuente } from "../types"

/**
 * Marca de la fuente en la lista de la campana. Solo PQRSF la lleva: es la que
 * abre otra parte de la plataforma (el workspace) y no una página de la intranet,
 * y el icono avisa de ese salto. Las demás fuentes siguen como estaban.
 */
export function FuenteIcono({ fuente }: { fuente: NotificacionFuente }) {
  if (fuente !== "PQRSF") return null
  return <MessageSquareWarning aria-hidden className="mr-1 inline size-3.5 -translate-y-px align-middle text-muted-foreground" />
}
