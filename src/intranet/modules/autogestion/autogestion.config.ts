import type { LucideIcon } from "lucide-react"
import { BadgeCheck, CalendarDays, Landmark, ReceiptText } from "lucide-react"

/**
 * El portal de autogestión es una aplicación EXTERNA de Gestión Humana,
 * publicada solo en la red interna de JDH (IP privada, sin DNS ni TLS): desde
 * fuera de la red corporativa el enlace simplemente no resuelve. Por eso el
 * módulo no "envuelve" el portal — su vista es la antesala que explica qué se
 * hace allí, avisa de la restricción de red y redirige.
 *
 * `IdCia` y `NroConexion` son parámetros del propio portal (compañía 1,
 * conexión 1). Si Gestión Humana mueve el servidor o cambia la compañía, esta
 * constante es lo único que hay que tocar.
 */
export const PORTAL_AUTOGESTION_URL =
  "http://192.168.100.4:8900/AuthAG/LoginFormAG?IdCia=1&NroConexion=1"

export interface TramiteAutogestion {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

/**
 * Qué se puede resolver en el portal. Es contenido informativo, no navegación:
 * ninguna de estas tarjetas enlaza a una ruta de la intranet, porque el trámite
 * ocurre del otro lado.
 */
export const TRAMITES: TramiteAutogestion[] = [
  {
    id: "certificados-laborales",
    label: "Certificados laborales",
    description:
      "Genera y descarga tu certificación laboral, con o sin salario, en el momento que la necesites.",
    icon: BadgeCheck,
  },
  {
    id: "certificados-bancarios",
    label: "Certificados bancarios",
    description:
      "Obtén el certificado de la cuenta bancaria en la que recibes tu nómina.",
    icon: Landmark,
  },
  {
    id: "colillas-de-pago",
    label: "Colillas de pago",
    description:
      "Consulta y descarga el desprendible de nómina de cada periodo pagado.",
    icon: ReceiptText,
  },
  {
    id: "vacaciones",
    label: "Información de vacaciones",
    description:
      "Revisa tus días disponibles y el detalle de los periodos causados y pendientes.",
    icon: CalendarDays,
  },
]
