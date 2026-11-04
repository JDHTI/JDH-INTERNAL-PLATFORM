import type { StrapiRequestParams } from "./types"

/**
 * Serializa un valor anidado a la notación de brackets que espera Strapi
 * (estilo `qs`), acumulando pares `clave=valor` en `out`. Evita añadir la
 * dependencia `qs`: el alcance de anidamiento que usamos es acotado.
 *
 * Ejemplos que produce:
 *   { tipo: { $eq: "comunicado" } }        con prefix "filters"  → filters[tipo][$eq]=comunicado
 *   { $or: [{ zona: { code: { $eq: "x" }}}]} con prefix "filters" → filters[$or][0][zona][code][$eq]=x
 *   ["area", "categoria"]                   con prefix "populate" → populate[0]=area&populate[1]=categoria
 *
 * Los corchetes de la clave se dejan literales (como hace `qs`); solo se
 * codifican los valores hoja.
 */
function serialize(value: unknown, keyPath: string, out: string[]): void {
  if (value === undefined || value === null) return

  if (Array.isArray(value)) {
    value.forEach((item, index) => serialize(item, `${keyPath}[${index}]`, out))
    return
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>
    )) {
      serialize(nested, keyPath ? `${keyPath}[${key}]` : key, out)
    }
    return
  }

  out.push(`${keyPath}=${encodeURIComponent(String(value))}`)
}

/**
 * Construye la query string de una petición Strapi a partir de parámetros
 * estructurados. `sort` se une por comas (`sort=a:desc,b:desc`), forma que
 * Strapi acepta; `filters`, `pagination`, `fields` y `populate` (cuando es
 * arreglo u objeto) se serializan en notación de brackets.
 */
export function buildStrapiQuery(params: StrapiRequestParams = {}): string {
  const out: string[] = []

  if (params.filters) serialize(params.filters, "filters", out)
  if (params.pagination) serialize(params.pagination, "pagination", out)
  if (params.fields) serialize(params.fields, "fields", out)

  if (params.populate !== undefined) {
    if (typeof params.populate === "string") {
      out.push(`populate=${encodeURIComponent(params.populate)}`)
    } else {
      serialize(params.populate, "populate", out)
    }
  }

  if (params.sort !== undefined) {
    const sort = Array.isArray(params.sort)
      ? params.sort.join(",")
      : params.sort
    out.push(`sort=${encodeURIComponent(sort)}`)
  }

  return out.join("&")
}
