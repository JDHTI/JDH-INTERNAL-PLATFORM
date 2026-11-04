import { requireUser } from "@/intranet/lib/auth"
// Deep imports a los seams de otros módulos: excepción consciente a la regla
// de barrel-only, justificada porque quien compone varios dominios en una
// misma página es la capa de rutas (thin), no un módulo importando internos de
// otro.
import {
  getNuevosIngresos,
  getProximosCumpleanos,
} from "@/intranet/modules/directorio/server/queries"
import {
  HomeView,
  NOTICIAS_LIMIT,
  NUEVOS_INGRESOS_LIMIT,
  QUINQUENIOS_LIMIT,
} from "@/intranet/modules/inicio"
import {
  getContenidoSemanal,
  getFraseMotivacional,
  getQuinquenios,
} from "@/intranet/modules/inicio/server/queries"
import {
  getComunicadoDestacado,
  getUltimasNoticias,
} from "@/intranet/modules/noticias/server/queries"

/**
 * Home de la intranet (`/`). Ruta delgada: resuelve sesión + datos y delega el
 * render en `HomeView`.
 *
 * Las ocho consultas van en un solo `Promise.all` porque son independientes
 * entre sí y pegan a backends distintos (Strapi para noticias/contenido
 * semanal/frase motivacional/quinquenios, el API de la plataforma para el
 * directorio) — en serie la home tardaría la suma de las ocho. Cada query ya
 * degrada a vacío/`null` por su cuenta si su backend falla, así que un
 * `Promise.all` no puede rechazar y tumbar la página.
 */
export const metadata = {
  title: "Inicio",
}

export default async function HomePage() {
  const user = await requireUser()

  const [
    comunicadoDestacado,
    contenidoSemanal,
    fraseMotivacional,
    cumpleanos,
    noticias,
    nuevosIngresos,
    quinquenios,
  ] = await Promise.all([
    getComunicadoDestacado(),
    getContenidoSemanal(),
    getFraseMotivacional(),
    getProximosCumpleanos(),
    getUltimasNoticias(NOTICIAS_LIMIT),
    getNuevosIngresos(NUEVOS_INGRESOS_LIMIT),
    getQuinquenios(QUINQUENIOS_LIMIT),
  ])

  return (
    <HomeView
      nombreUsuario={user.name}
      nowIso={new Date().toISOString()}
      comunicadoDestacado={comunicadoDestacado}
      contenidoSemanal={contenidoSemanal}
      fraseMotivacional={fraseMotivacional}
      cumpleanos={cumpleanos}
      noticias={noticias}
      nuevosIngresos={nuevosIngresos}
      quinquenios={quinquenios}
    />
  )
}
