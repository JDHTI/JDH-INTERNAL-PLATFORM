import { PendingBackend } from "@/intranet/components/common/pending-backend"
import { ContactoDirectoView } from "@/intranet/modules/perfil"
import { getMiContactoDirecto } from "@/intranet/modules/perfil/server/queries"

export const metadata = { title: "Contacto y sede" }

export default async function Page() {
  const data = await getMiContactoDirecto().catch(() => null)
  if (!data) {
    return (
      <PendingBackend
        title="Contacto y sede en preparación"
        description="Pronto podrás registrar aquí tu sede, tu teléfono y tu celular. Mientras tanto, tu sede la actualiza TI desde el directorio."
      />
    )
  }
  return <ContactoDirectoView contacto={data.contacto} sedes={data.sedes} />
}
