"use client"

import type { Route } from "next"
import Link from "next/link"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/intranet/components/ui/sheet"

import type { NodoCargo } from "../organigrama.tree"

interface CargoDetalleProps {
  nodo: NodoCargo | null
  open: boolean
  onClose: () => void
  onSeleccionar: (id: string) => void
  onEnfocar: (id: string) => void
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

function FilaCargo({
  nodo,
  onSeleccionar,
}: {
  nodo: NodoCargo
  onSeleccionar: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSeleccionar(nodo.cargo.id)}
      className="flex w-full items-center justify-between gap-3 border border-[var(--color-border-strong)] px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-medium">{nodo.cargo.nombre}</span>
      {nodo.descendientes > 0 ? (
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {nodo.descendientes}
        </span>
      ) : null}
    </button>
  )
}

/**
 * Detalle de un cargo: a quién reporta, su equipo directo y cuánto cuelga de
 * él. Se navega por la jerarquía desde aquí sin cerrar el panel.
 *
 * `nodo` se conserva mientras el panel se cierra (`open` controla la
 * visibilidad) para que no se vacíe durante la animación de salida.
 */
export function CargoDetalle({
  nodo,
  open,
  onClose,
  onSeleccionar,
  onEnfocar,
}: CargoDetalleProps) {
  return (
    <Sheet open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent className="gap-0 overflow-y-auto sm:max-w-md">
        {nodo ? (
          <>
            <SheetHeader>
              <SheetTitle>{nodo.cargo.nombre}</SheetTitle>
              <SheetDescription>
                Nivel {nodo.nivel + 1} del organigrama
                {nodo.descendientes > 0
                  ? ` · ${nodo.descendientes} ${nodo.descendientes === 1 ? "cargo" : "cargos"} en su estructura`
                  : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-4">
              {nodo.cargo.tipo === "tercerizado" ? (
                <p className="border border-dashed border-[var(--color-border-strong)] px-3 py-2 text-sm">
                  Cargo tercerizado
                  {nodo.cargo.nota ? ` · ${nodo.cargo.nota}` : ""}
                </p>
              ) : null}
              {nodo.cargo.tipo === "lateral" ? (
                <p className="border border-dashed border-[var(--color-border-strong)] px-3 py-2 text-sm">
                  Cargo lateral: acompaña a {nodo.padre?.cargo.nombre} sin
                  depender de él en la línea de mando.
                </p>
              ) : null}

              <section className="space-y-2">
                <Titulo>
                  {nodo.cargo.tipo === "lateral" ? "Junto a" : "Reporta a"}
                </Titulo>
                {nodo.padre ? (
                  <FilaCargo nodo={nodo.padre} onSeleccionar={onSeleccionar} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Es la cabeza del organigrama.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <Titulo>Equipo directo ({nodo.hijos.length})</Titulo>
                {nodo.hijos.length > 0 ? (
                  <ul className="space-y-2">
                    {nodo.hijos.map((hijo) => (
                      <li key={hijo.cargo.id}>
                        <FilaCargo nodo={hijo} onSeleccionar={onSeleccionar} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ningún cargo le reporta directamente.
                  </p>
                )}
              </section>
            </div>

            <SheetFooter>
              {nodo.hijos.length > 0 && nodo.padre ? (
                <JdhButton onClick={() => onEnfocar(nodo.cargo.id)}>
                  Enfocar esta rama
                </JdhButton>
              ) : null}
              <JdhButton variant="secondary" asChild>
                <Link
                  href={
                    `/directorio?q=${encodeURIComponent(nodo.cargo.nombre)}` as Route
                  }
                >
                  Buscar en el directorio
                </Link>
              </JdhButton>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
