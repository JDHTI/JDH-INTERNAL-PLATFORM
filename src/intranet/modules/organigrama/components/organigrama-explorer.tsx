"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, SearchX } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { SearchInput } from "@/intranet/components/forms/search-input"
import { FilterSelect } from "@/intranet/components/navigation/filter-select"
import { formatFechaLarga } from "@/intranet/lib/date"

import type { EstadoOrganigrama } from "../organigrama.state"
import { serializarEstado } from "../organigrama.state"
import {
  abrirHastaNivel,
  ancestros,
  buscar,
  construirArbol,
  mismosIds,
  rutasDe,
  type NodoCargo,
} from "../organigrama.tree"
import type { Cargo, DocumentoOrganigrama } from "../types"
import { CargoDetalle } from "./cargo-detalle"
import { LienzoArrastrable } from "./lienzo-arrastrable"
import { ArbolEscritorio, ArbolMovil } from "./organigrama-arbol"
import { OrganigramaProvider } from "./organigrama-context"

interface OrganigramaExplorerProps {
  cargos: Cargo[]
  documento: DocumentoOrganigrama
  estadoInicial: EstadoOrganigrama
}

/** Primer nivel que se puede elegir: las direcciones, con todo cerrado. */
const NIVEL_DIRECCIONES = 3

/**
 * Organigrama navegable. Arranca en la vista panorámica (CEO, Gerente general
 * y sus reportes directos, todo cerrado) y cada rama se abre por separado, o
 * todas a la vez hasta el nivel de detalle que se elija. Se puede buscar un
 * cargo (solo queda visible su camino) y enfocar una rama para verla sola.
 *
 * Esta vista es una excepción al contenedor de la intranet: el encabezado, el
 * buscador y los controles respetan los márgenes, pero el organigrama ocupa
 * todo el ancho de la ventana y puede sobrepasarlo al abrir ramas (se mueve
 * arrastrándolo; ver `LienzoArrastrable`). En pantallas angostas, donde un
 * árbol ancho no sirve, es una lista dentro de los márgenes.
 *
 * El estado vive en la URL (`?abierto=…&rama=…&q=…`), así un enlace comparte
 * exactamente la vista que se está mirando.
 */
export function OrganigramaExplorer({
  cargos,
  documento,
  estadoInicial,
}: OrganigramaExplorerProps) {
  const arbol = useMemo(() => construirArbol(cargos), [cargos])

  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    if (estadoInicial.abiertos === "todo") {
      return abrirHastaNivel(arbol, arbol.nivelMaximo)
    }
    // Se descartan ids desconocidos: la URL la puede haber editado cualquiera.
    return new Set(
      estadoInicial.abiertos.filter(
        (id) => (arbol.porId.get(id)?.hijos.length ?? 0) > 0
      )
    )
  })
  const [rama, setRama] = useState<string | null>(() => {
    const nodo = estadoInicial.rama ? arbol.porId.get(estadoInicial.rama) : null
    return nodo && nodo.nivel >= 1 && nodo.hijos.length > 0
      ? nodo.cargo.id
      : null
  })
  const [q, setQ] = useState(estadoInicial.q)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  const foco = rama ? (arbol.porId.get(rama) ?? null) : null
  const cabeza = foco ?? arbol.raiz
  const buscando = q.trim().length > 0

  const coincidencias = useMemo(
    () => (buscando ? buscar(arbol, q, cabeza) : new Set<string>()),
    [arbol, q, cabeza, buscando]
  )
  const camino = useMemo(
    () => rutasDe(arbol, coincidencias),
    [arbol, coincidencias]
  )
  // Con búsqueda activa se abre todo el camino hasta cada coincidencia.
  const abiertosBusqueda = useMemo(() => {
    const abiertosPorBusqueda = new Set<string>()
    for (const id of camino) {
      const nodo = arbol.porId.get(id)
      if (nodo?.hijos.some((hijo) => camino.has(hijo.cargo.id))) {
        abiertosPorBusqueda.add(id)
      }
    }
    return abiertosPorBusqueda
  }, [arbol, camino])

  const todasAbiertas = useMemo(
    () => abrirHastaNivel(arbol, arbol.nivelMaximo),
    [arbol]
  )

  // Niveles de detalle elegibles y cuál coincide con lo abierto ahora: si el
  // usuario abrió ramas a mano, ninguno coincide y el select queda en blanco.
  const niveles = useMemo(
    () =>
      Array.from(
        { length: arbol.nivelMaximo - NIVEL_DIRECCIONES + 1 },
        (_, i) => NIVEL_DIRECCIONES + i
      ),
    [arbol.nivelMaximo]
  )
  const nivelActual = niveles.find((nivel) =>
    mismosIds(abrirHastaNivel(arbol, nivel), abiertos)
  )

  // URL: el estado se refleja sin recargar ni apilar entradas en el historial.
  useEffect(() => {
    const estado: EstadoOrganigrama = {
      abiertos:
        todasAbiertas.size > 0 && mismosIds(abiertos, todasAbiertas)
          ? "todo"
          : [...abiertos],
      rama,
      q,
    }
    const query = serializarEstado(estado)
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    )
  }, [abiertos, rama, q, todasAbiertas])

  const estaAbierto = useCallback(
    (id: string) => (buscando ? abiertosBusqueda.has(id) : abiertos.has(id)),
    [buscando, abiertosBusqueda, abiertos]
  )
  const visible = useCallback(
    (id: string) => !buscando || camino.has(id),
    [buscando, camino]
  )
  const esCoincidencia = useCallback(
    (id: string) => buscando && coincidencias.has(id),
    [buscando, coincidencias]
  )
  const alternar = useCallback(
    (id: string) => {
      if (buscando) return
      setAbiertos((previos) => {
        const siguientes = new Set(previos)
        if (!siguientes.delete(id)) siguientes.add(id)
        return siguientes
      })
    },
    [buscando]
  )
  const seleccionar = useCallback((id: string) => {
    setSeleccionadoId(id)
    setDetalleAbierto(true)
  }, [])
  const enfocar = useCallback(
    (id: string | null) => {
      setRama(id && id !== arbol.raiz.cargo.id ? id : null)
      setDetalleAbierto(false)
    },
    [arbol.raiz.cargo.id]
  )

  const contexto = useMemo(
    () => ({
      estaAbierto,
      visible,
      esCoincidencia,
      buscando,
      alternar,
      seleccionar,
    }),
    [estaAbierto, visible, esCoincidencia, buscando, alternar, seleccionar]
  )

  // Forma del contenido: cuando cambia, el lienzo se recentra o se reancla.
  const claveContenido = useMemo(
    () =>
      [
        rama ?? "",
        buscando ? q.trim() : "",
        [...(buscando ? abiertosBusqueda : abiertos)].sort().join(","),
      ].join("|"),
    [rama, buscando, q, abiertosBusqueda, abiertos]
  )

  // Cargos que se ven ahora. CEO y Gerente general nunca se colapsan.
  const cargosVisibles = useMemo(() => {
    const contar = (nodo: NodoCargo): number => {
      const desplegado =
        nodo === cabeza || nodo.nivel < 2 || estaAbierto(nodo.cargo.id)
      if (!desplegado) return 1
      const hijos = nodo.hijos.filter((hijo) => visible(hijo.cargo.id))
      return (
        1 +
        (nodo === arbol.raiz ? nodo.laterales.length : 0) +
        hijos.reduce((suma, hijo) => suma + contar(hijo), 0)
      )
    }
    return contar(cabeza)
  }, [arbol.raiz, cabeza, estaAbierto, visible])
  const totalEnVista = cabeza.descendientes + 1

  const sinResultados = buscando && coincidencias.size === 0
  const seleccionado = seleccionadoId
    ? (arbol.porId.get(seleccionadoId) ?? null)
    : null

  return (
    <OrganigramaProvider value={contexto}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:max-w-md lg:flex-1">
            <SearchInput
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar un cargo…"
              aria-label="Buscar un cargo"
            />
          </div>
          <FilterSelect
            label="Nivel de detalle"
            placeholder="Nivel de detalle"
            value={nivelActual ? String(nivelActual) : ""}
            onChange={(valor) =>
              setAbiertos(abrirHastaNivel(arbol, Number(valor)))
            }
            options={niveles.map((nivel) => ({
              value: String(nivel),
              label:
                nivel === NIVEL_DIRECCIONES
                  ? `Hasta nivel ${nivel} · Direcciones`
                  : `Hasta nivel ${nivel}`,
            }))}
          />
          <div className="flex gap-2">
            <JdhButton
              variant="secondary"
              className="h-11"
              disabled={buscando}
              onClick={() => setAbiertos(new Set(todasAbiertas))}
            >
              Expandir todo
            </JdhButton>
            <JdhButton
              variant="secondary"
              className="h-11"
              disabled={buscando}
              onClick={() => setAbiertos(new Set())}
            >
              Contraer todo
            </JdhButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <p aria-live="polite">
            {buscando
              ? `${coincidencias.size} ${coincidencias.size === 1 ? "coincidencia" : "coincidencias"}`
              : `${cargosVisibles} de ${totalEnVista} cargos visibles`}
          </p>
          <p>
            Línea punteada: cargo lateral o tercerizado.
            <span className="hidden lg:inline">
              {" "}
              Arrastra el organigrama para moverte.
            </span>
          </p>
        </div>

        {foco ? (
          <nav
            aria-label="Rama enfocada"
            className="flex flex-wrap items-center gap-1 text-sm"
          >
            <button
              type="button"
              onClick={() => enfocar(null)}
              className="underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Organigrama completo
            </button>
            {ancestros(foco)
              .slice(1)
              .map((ancestro) => (
                <span
                  key={ancestro.cargo.id}
                  className="flex items-center gap-1"
                >
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => enfocar(ancestro.cargo.id)}
                    className="underline decoration-1 underline-offset-2 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ancestro.cargo.nombre}
                  </button>
                </span>
              ))}
            <ChevronRight
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            <span aria-current="page" className="font-medium">
              {foco.cargo.nombre}
            </span>
          </nav>
        ) : null}

        {sinResultados ? (
          <EmptyState
            icon={SearchX}
            title={`Ningún cargo coincide con “${q.trim()}”`}
            description="Prueba con otra palabra, por ejemplo “coordinador”, “logística” o “ventas”."
          >
            <JdhButton variant="secondary" onClick={() => setQ("")}>
              Limpiar búsqueda
            </JdhButton>
          </EmptyState>
        ) : (
          <>
            {/* Escritorio: sale del contenedor y ocupa todo el ancho de la ventana. */}
            <div className="ml-[calc(50%-50vw)] hidden w-screen lg:block">
              <LienzoArrastrable claveContenido={claveContenido}>
                <ArbolEscritorio cabeza={cabeza} />
              </LienzoArrastrable>
            </div>
            <div className="lg:hidden">
              <ArbolMovil cabeza={cabeza} />
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Documento {documento.codigo} · Versión {documento.version} ·{" "}
          {formatFechaLarga(documento.fecha)}
        </p>
      </div>

      <CargoDetalle
        nodo={seleccionado}
        open={detalleAbierto}
        onClose={() => setDetalleAbierto(false)}
        onSeleccionar={seleccionar}
        onEnfocar={enfocar}
      />
    </OrganigramaProvider>
  )
}
