import { CumpleanosView } from "@/intranet/modules/directorio"
import { getProximosCumpleanos } from "@/intranet/modules/directorio/server/queries"

export const metadata = { title: "Directorio · Cumpleaños" }

export default async function Page() {
  const empleados = await getProximosCumpleanos()

  return <CumpleanosView empleados={empleados} />
}
