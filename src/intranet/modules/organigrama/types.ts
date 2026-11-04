/** Domain types for the organigrama module. */

/**
 * Cargo que no sigue la línea de mando normal:
 * - `lateral`: órgano que acompaña a un cargo sin depender de él en la
 *   cadena de reporte (la Junta directiva junto al CEO).
 * - `tercerizado`: cargo cubierto por un proveedor externo (`nota` dice cuál).
 */
export type TipoCargo = "lateral" | "tercerizado"

/** Un cargo del organigrama oficial. Son cargos, no personas. */
export interface Cargo {
  id: string
  nombre: string
  /** `null` solo en la raíz (CEO). */
  parentId: string | null
  tipo?: TipoCargo
  nota?: string
}

/** Datos del documento controlado del SIG que originó el organigrama. */
export interface DocumentoOrganigrama {
  codigo: string
  version: string
  /** ISO `YYYY-MM-DD`. */
  fecha: string
}
