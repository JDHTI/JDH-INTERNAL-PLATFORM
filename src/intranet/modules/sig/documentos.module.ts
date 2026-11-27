import { FileText } from "lucide-react"

import { PERMISSIONS } from "@/intranet/config/permissions"
import { defineModule } from "@/intranet/lib/modules"

export const documentosModule = defineModule({
  id: "documentos",
  title: "Documentos y políticas",
  description:
    "Repositorio de documentos corporativos, políticas y procedimientos vigentes.",
  href: "/documentos",
  icon: FileText,
  nav: { section: "main", order: 20 },
  permissions: [PERMISSIONS.documentos.read],
})
