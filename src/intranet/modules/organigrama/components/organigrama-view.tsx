import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { cargos, documentoOrganigrama } from "../organigrama.data"
import type { EstadoOrganigrama } from "../organigrama.state"
import { OrganigramaExplorer } from "./organigrama-explorer"

export function OrganigramaView({
  estadoInicial,
}: {
  estadoInicial: EstadoOrganigrama
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Intranet", href: "/" }, { label: "Organigrama" }]}
      />
      <PageHeader
        title="Organigrama"
        description="Estructura de cargos y líneas de reporte de JDH. Despliega cada área con la flecha para ver quién le reporta, o toca un cargo para ver su detalle."
      />
      <OrganigramaExplorer
        cargos={cargos}
        documento={documentoOrganigrama}
        estadoInicial={estadoInicial}
      />
    </div>
  )
}
