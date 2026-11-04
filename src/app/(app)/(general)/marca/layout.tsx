import { PageHeader } from "@/intranet/components/common/page-header"
import { MarcaTabs } from "@/intranet/modules/marca"

/**
 * Shell de la sección Marca e identidad: encabezado común + switch de áreas.
 * Cada área (`/marca`, `/marca/design-system`) es una ruta propia, así que el
 * encabezado no se repite en cada página.
 */
export default function MarcaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Manual de marca e identidad"
        description="Quiénes somos, cómo hablamos y cómo nos vemos. La identidad corporativa de JDH y su traducción al diseño de producto."
      />
      <MarcaTabs />
      {children}
    </div>
  )
}
