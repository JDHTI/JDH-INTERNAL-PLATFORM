import { PerfilView } from "@/intranet/modules/perfil"
import { getMiPerfil } from "@/intranet/modules/perfil/server/queries"

export const metadata = { title: "Perfil" }

export default async function Page() {
  const perfil = await getMiPerfil()
  return <PerfilView perfil={perfil} />
}
