import type { LucideIcon } from "lucide-react"
import { Images, LayoutGrid, Search, Smartphone } from "lucide-react"

/**
 * El catálogo digital es una aplicación EXTERNA publicada en la red interna de
 * JDH (`tienda.jdh.local`, IP privada), no una ruta de la intranet: por eso el
 * módulo no lo embebe ni lo replica — su vista es la antesala que explica qué es
 * y redirige. Si el despliegue cambia de dominio, esta constante es lo único que
 * hay que tocar.
 */
export const CATALOGO_URL = "https://tienda.jdh.local/"

export interface VentajaCatalogo {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

/**
 * Qué gana el colaborador al usar el catálogo digital. Es contenido informativo,
 * no navegación: ninguna de estas tarjetas enlaza a una ruta de la intranet,
 * porque todo ocurre del otro lado.
 */
export const VENTAJAS: VentajaCatalogo[] = [
  {
    id: "imagenes",
    label: "Productos con imagen",
    description:
      "Cada referencia se ve antes de pedirla: fotografía del producto, presentación y marca, no solo un código en una lista.",
    icon: Images,
  },
  {
    id: "navegacion",
    label: "Navegación intuitiva",
    description:
      "Recorre el portafolio por categorías y marcas, con un orden pensado para encontrar, no para buscar.",
    icon: LayoutGrid,
  },
  {
    id: "busqueda",
    label: "Búsqueda directa",
    description:
      "Escribe el nombre o la referencia y llega al producto en un paso, sin abrir archivos ni filtrar hojas de cálculo.",
    icon: Search,
  },
  {
    id: "dispositivos",
    label: "Desde cualquier dispositivo",
    description:
      "Funciona igual en el computador, la tableta o el celular conectados a la red de la empresa.",
    icon: Smartphone,
  },
]
