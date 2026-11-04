/**
 * Estado de la vista del organigrama que vive en la URL, para poder compartir
 * un enlace con una vista concreta: `?abierto=a,b&rama=id&q=texto`.
 */
export interface EstadoOrganigrama {
  /** Ids de las ramas abiertas, o `"todo"` si están todas. */
  abiertos: string[] | "todo"
  /** Cargo enfocado: solo se muestra su rama. */
  rama: string | null
  /** Texto de búsqueda. */
  q: string
}

export const ESTADO_INICIAL: EstadoOrganigrama = {
  abiertos: [],
  rama: null,
  q: "",
}

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Lee el estado de `searchParams`; lo que no se reconoce cae al valor inicial. */
export function parseEstadoOrganigrama(raw: RawParams): EstadoOrganigrama {
  const abierto = first(raw.abierto)
  return {
    abiertos:
      abierto === "todo"
        ? "todo"
        : (abierto?.split(",").filter(Boolean) ?? ESTADO_INICIAL.abiertos),
    rama: first(raw.rama) || null,
    q: first(raw.q)?.slice(0, 80) ?? "",
  }
}

/** Query string del estado, sin los valores por defecto (`""` si no hay nada). */
export function serializarEstado(estado: EstadoOrganigrama): string {
  const params = new URLSearchParams()
  if (estado.abiertos === "todo") params.set("abierto", "todo")
  else if (estado.abiertos.length > 0) {
    params.set("abierto", estado.abiertos.join(","))
  }
  if (estado.rama) params.set("rama", estado.rama)
  if (estado.q.trim()) params.set("q", estado.q.trim())
  return params.toString()
}
