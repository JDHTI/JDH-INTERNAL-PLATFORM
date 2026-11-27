import { SigLandingView } from "@/intranet/modules/sig"
import {
  getSigObligatorios,
  getSigPoliticas,
} from "@/intranet/modules/sig/server/queries"

export const metadata = { title: "Sistema Integrado de Gestión" }

export default async function Page() {
  const [politicas, obligatorios] = await Promise.all([
    getSigPoliticas(),
    getSigObligatorios(),
  ])

  return (
    <SigLandingView
      politicas={politicas.data}
      obligatorios={obligatorios.data}
      disponible={obligatorios.disponible}
    />
  )
}
