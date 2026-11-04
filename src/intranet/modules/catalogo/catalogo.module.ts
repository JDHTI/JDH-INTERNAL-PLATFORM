import { BookImage } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

/**
 * `href` apunta a la antesala interna (`/catalogo`), no al catálogo: la URL
 * externa vive en `catalogo.config.ts` y solo se alcanza desde esa página, que
 * antes presenta qué es y cómo se usa.
 *
 * Va en `order: 58`, entre el portal de autogestión y Marca: es una herramienta
 * de consulta comercial, no un recurso de contenido.
 */
export const catalogoModule = defineModule({
  id: "catalogo",
  title: "Catálogo",
  description:
    "El portafolio de productos JDH con imágenes, categorías y búsqueda, en una experiencia visual e intuitiva.",
  href: "/catalogo",
  icon: BookImage,
  nav: { section: "main", order: 58 },
  permissions: [PERMISSIONS.catalogo.read],
})
