import { SigLandingView } from "@/intranet/modules/sig"
import { getSigRecorrido } from "@/intranet/modules/sig/server/queries"

export const metadata = { title: "Sistema Integrado de Gestión" }

export default async function Page() {
  const { data, disponible } = await getSigRecorrido()

  return <SigLandingView documentos={data} disponible={disponible} />
}
