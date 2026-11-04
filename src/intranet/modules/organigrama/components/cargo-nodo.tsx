"use client"

import { ChevronDown } from "lucide-react"

import { cn } from "@/intranet/lib/utils"

import type { NodoCargo } from "../organigrama.tree"
import { useOrganigrama } from "./organigrama-context"

const GUIA = "bg-[var(--color-border-strong)]"

function etiquetaCargos(cantidad: number) {
  return cantidad === 1 ? "1 cargo" : `${cantidad} cargos`
}

interface CargoCajaProps {
  nodo: NodoCargo
  /**
   * - `direccion`: nodo de jerarquía alta (CEO, Gerente, direcciones), con
   *   borde grueso y el nombre en negrita.
   * - `nodo`: nodo del árbol de escritorio más abajo en la jerarquía.
   * - `cargo`: fila de la lista con sangría (móvil).
   *
   * `direccion` y `nodo` son verticales (nombre arriba, contador y control de
   * despliegue debajo); `cargo` lleva el control a la derecha.
   */
  variante?: "direccion" | "nodo" | "cargo"
  /** Sin control de despliegue: CEO, Gerente general y cargos laterales. */
  sinToggle?: boolean
  className?: string
}

/**
 * Caja de un cargo. El nombre abre su detalle; el control de despliegue
 * (con el total de cargos que dependen de él) abre y cierra su rama. Son dos
 * botones distintos para que cada uno diga con claridad qué hace.
 */
export function CargoCaja({
  nodo,
  variante = "cargo",
  sinToggle = false,
  className,
}: CargoCajaProps) {
  const { estaAbierto, esCoincidencia, buscando, alternar, seleccionar } =
    useOrganigrama()
  const { cargo, hijos, descendientes } = nodo
  const abierto = estaAbierto(cargo.id)
  const vertical = variante !== "cargo"
  const expandible = !sinToggle && hijos.length > 0
  const coincide = esCoincidencia(cargo.id)

  return (
    <div
      data-coincidencia={coincide || undefined}
      className={cn(
        "flex w-full bg-card text-foreground",
        vertical ? "flex-col" : "items-stretch",
        variante === "direccion"
          ? "border-2 border-foreground"
          : "border border-[var(--color-border-strong)]",
        cargo.tipo && "border-dashed",
        coincide && "bg-accent ring-2 ring-foreground",
        className
      )}
    >
      <button
        type="button"
        onClick={() => seleccionar(cargo.id)}
        aria-haspopup="dialog"
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2 leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          vertical ? "items-center text-center" : "px-2.5 text-left",
          variante === "direccion" && "font-bold",
          variante === "nodo" && "font-medium"
        )}
      >
        <span className={variante === "nodo" ? "text-[13px]" : "text-sm"}>
          {cargo.nombre}
        </span>
        {cargo.tipo === "tercerizado" ? (
          <span className="text-xs font-normal text-muted-foreground">
            Tercerizado{cargo.nota ? ` · ${cargo.nota}` : ""}
          </span>
        ) : null}
      </button>

      {expandible ? (
        <button
          type="button"
          data-toggle
          onClick={() => alternar(cargo.id)}
          disabled={buscando}
          aria-expanded={abierto}
          aria-label={`${abierto ? "Contraer" : "Expandir"} ${cargo.nombre}, ${etiquetaCargos(descendientes)}`}
          className={cn(
            "flex shrink-0 items-center justify-center gap-1.5 text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none",
            vertical ? "border-t py-1.5" : "border-l px-2"
          )}
        >
          <span className="font-mono tabular-nums">
            {vertical ? etiquetaCargos(descendientes) : descendientes}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              abierto && "rotate-180"
            )}
          />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Cargos de una rama en lista con sangría y guías a la izquierda (móvil).
 * Cada `li` dibuja su propio tramo de guía (hasta su caja si es el último),
 * así la guía termina exactamente en el último cargo.
 *
 * Recursivo: cada cargo abierto monta su propio `Esquema`. Los cerrados no
 * montan nada, así que lo que no se ve tampoco recibe foco con el teclado.
 */
export function Esquema({ nodos }: { nodos: NodoCargo[] }) {
  const { visible, estaAbierto } = useOrganigrama()
  const visibles = nodos.filter((nodo) => visible(nodo.cargo.id))
  if (visibles.length === 0) return null

  const ultimo = visibles.length - 1
  return (
    <ul className="ml-3 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0">
      {visibles.map((nodo, index) => (
        <li
          key={nodo.cargo.id}
          className={cn(
            "relative pt-2 pl-3",
            "before:absolute before:top-0 before:left-0 before:w-px",
            "after:absolute after:top-[1.7rem] after:left-0 after:h-px after:w-3",
            "before:bg-[var(--color-border-strong)] after:bg-[var(--color-border-strong)]",
            index === ultimo ? "before:h-[1.7rem]" : "before:bottom-0"
          )}
        >
          <CargoCaja nodo={nodo} />
          {estaAbierto(nodo.cargo.id) ? <Esquema nodos={nodo.hijos} /> : null}
        </li>
      ))}
    </ul>
  )
}

export function LineaVertical({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block w-px", GUIA, className)} />
}

export function LineaHorizontal({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-px", GUIA, className)} />
}
