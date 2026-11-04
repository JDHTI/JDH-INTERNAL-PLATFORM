import { PendingBackend } from "@/intranet/components/common/pending-backend"
import { HorariosView } from "@/intranet/modules/perfil"
import { getMisFranjasHorario } from "@/intranet/modules/perfil/server/queries"

export const metadata = { title: "Horarios de contacto" }

export default async function Page() {
  const data = await getMisFranjasHorario().catch(() => null)
  if (!data) {
    return (
      <PendingBackend
        title="Horarios de contacto en preparación"
        description="Pronto podrás definir aquí en qué horario te pueden contactar. Mientras tanto, tu perfil muestra el horario corporativo."
      />
    )
  }
  return <HorariosView franjas={data.franjas} configurado={data.configurado} />
}
