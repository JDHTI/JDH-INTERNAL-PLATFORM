"use client"

import { cn } from "@/intranet/lib/utils"

import type { NodoCargo } from "../organigrama.tree"
import {
  CargoCaja,
  Esquema,
  LineaHorizontal,
  LineaVertical,
} from "./cargo-nodo"
import { useOrganigrama } from "./organigrama-context"

/** Ancho fijo de cada nodo del árbol: el ancho total sale de sumar estos. */
const ANCHO_NODO = "w-32"

type Posicion = "raiz" | "unico" | "primero" | "medio" | "ultimo"

/**
 * Un cargo del árbol de escritorio con su rama debajo: la caja y, si está
 * desplegado, una fila con sus reportes, cada uno con su propia rama. Es el
 * dibujo del organigrama oficial: cada nivel cuelga de un bus horizontal.
 *
 * Los conectores son del propio nodo, sin medir nada: el padre baja una línea
 * desde su caja, y cada hijo dibuja su tramo del bus (de la mitad hacia el
 * lado que le toque, así el bus empieza y termina en el primero y el último)
 * y la bajada hasta su caja.
 *
 * CEO y Gerente general (nivel < 2) y la cabeza de la vista siempre están
 * desplegados y no llevan control de despliegue.
 */
function Rama({
  nodo,
  posicion,
  cabeza,
}: {
  nodo: NodoCargo
  posicion: Posicion
  cabeza: NodoCargo
}) {
  const { visible, estaAbierto } = useOrganigrama()
  const fijo = nodo === cabeza || nodo.nivel < 2
  const hijos =
    fijo || estaAbierto(nodo.cargo.id)
      ? nodo.hijos.filter((hijo) => visible(hijo.cargo.id))
      : []
  const laterales = nodo.laterales.filter((lateral) =>
    visible(lateral.cargo.id)
  )

  return (
    <li className="relative flex flex-col items-center px-1">
      {posicion !== "raiz" ? (
        <>
          {posicion !== "unico" ? (
            <span
              aria-hidden
              className="absolute top-0 h-px bg-[var(--color-border-strong)]"
              style={{
                left: posicion === "primero" ? "50%" : 0,
                right: posicion === "ultimo" ? "50%" : 0,
              }}
            />
          ) : null}
          <LineaVertical className="h-5" />
        </>
      ) : null}

      <div data-cargo-id={nodo.cargo.id} className={cn("relative", ANCHO_NODO)}>
        <CargoCaja
          nodo={nodo}
          variante={nodo.nivel <= 2 ? "direccion" : "nodo"}
          sinToggle={fijo}
        />
        {laterales.map((lateral) => (
          <div
            key={lateral.cargo.id}
            className="absolute top-0 left-full flex items-start"
          >
            <LineaHorizontal className="mt-5 w-8" />
            <div className={ANCHO_NODO}>
              <CargoCaja nodo={lateral} variante="direccion" sinToggle />
            </div>
          </div>
        ))}
      </div>

      {hijos.length > 0 ? (
        <>
          <LineaVertical className="h-5" />
          <ul className="flex items-start">
            {hijos.map((hijo, index) => (
              <Rama
                key={hijo.cargo.id}
                nodo={hijo}
                cabeza={cabeza}
                posicion={
                  hijos.length === 1
                    ? "unico"
                    : index === 0
                      ? "primero"
                      : index === hijos.length - 1
                        ? "ultimo"
                        : "medio"
                }
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  )
}

/**
 * Árbol de escritorio, desde `cabeza` (la raíz o la rama enfocada). Pensado
 * para un lienzo más ancho que la pantalla: al abrir ramas crece a lo ancho,
 * porque cada nivel pone a sus reportes uno junto al otro.
 */
export function ArbolEscritorio({ cabeza }: { cabeza: NodoCargo }) {
  return (
    <ul className="flex">
      <Rama nodo={cabeza} posicion="raiz" cabeza={cabeza} />
    </ul>
  )
}

/**
 * Versión de pantallas angostas: un árbol ancho no cabe, así que cada
 * dirección se apila y su rama se despliega como lista con sangría.
 */
export function ArbolMovil({ cabeza }: { cabeza: NodoCargo }) {
  const { visible, estaAbierto } = useOrganigrama()
  const gerencia =
    cabeza.nivel === 0 && cabeza.hijos.length === 1 ? cabeza.hijos[0] : null
  const columnas = (gerencia ?? cabeza).hijos.filter((nodo) =>
    visible(nodo.cargo.id)
  )
  const laterales = cabeza.laterales.filter((lateral) =>
    visible(lateral.cargo.id)
  )

  return (
    <div className="flex flex-col items-center">
      <div className="w-60">
        <CargoCaja nodo={cabeza} variante="direccion" sinToggle />
      </div>
      {laterales.map((lateral) => (
        <div key={lateral.cargo.id} className="mt-3 w-48">
          <CargoCaja nodo={lateral} variante="direccion" sinToggle />
        </div>
      ))}
      {gerencia ? (
        <>
          <LineaVertical className="h-6" />
          <div className="w-60">
            <CargoCaja nodo={gerencia} variante="direccion" sinToggle />
          </div>
        </>
      ) : null}
      {columnas.length > 0 ? <LineaVertical className="h-6" /> : null}
      <ul className="flex w-full flex-col gap-8">
        {columnas.map((nodo) => (
          <li key={nodo.cargo.id}>
            <CargoCaja nodo={nodo} variante="direccion" />
            {estaAbierto(nodo.cargo.id) && nodo.hijos.length > 0 ? (
              <div className="mt-1">
                <Esquema nodos={nodo.hijos} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
