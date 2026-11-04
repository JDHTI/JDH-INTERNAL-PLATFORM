"use client"

import { createContext, useContext } from "react"

/**
 * Estado compartido de la vista: qué ramas están abiertas, qué coincide con
 * la búsqueda y las acciones sobre un cargo. Evita pasar seis props por cada
 * nivel de la recursión de `Esquema`.
 */
export interface OrganigramaContextValue {
  estaAbierto: (id: string) => boolean
  /** Con una búsqueda activa solo son visibles las coincidencias y su camino. */
  visible: (id: string) => boolean
  esCoincidencia: (id: string) => boolean
  buscando: boolean
  alternar: (id: string) => void
  seleccionar: (id: string) => void
}

const OrganigramaContext = createContext<OrganigramaContextValue | null>(null)

export const OrganigramaProvider = OrganigramaContext.Provider

export function useOrganigrama(): OrganigramaContextValue {
  const value = useContext(OrganigramaContext)
  if (!value) {
    throw new Error("useOrganigrama debe usarse dentro de OrganigramaProvider")
  }
  return value
}
