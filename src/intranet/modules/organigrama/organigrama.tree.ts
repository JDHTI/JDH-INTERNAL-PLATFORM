import type { Cargo } from "./types"

/**
 * Lógica pura del organigrama: armar el árbol desde la lista plana, buscar y
 * calcular qué ramas abrir. Sin React ni dependencias, para poder probarla
 * con `node` directamente.
 */

export interface NodoCargo {
  cargo: Cargo
  /** Profundidad desde la raíz: 0 = CEO, 1 = Gerente general, 2 = direcciones. */
  nivel: number
  padre: NodoCargo | null
  /** Línea de mando, en el orden del organigrama. */
  hijos: NodoCargo[]
  /** Cargos laterales (p. ej. Junta directiva): cuelgan del nodo sin estar en su línea de mando. */
  laterales: NodoCargo[]
  /** Cargos bajo este nodo en toda su estructura, sin contarlo a él. */
  descendientes: number
}

export interface Arbol {
  raiz: NodoCargo
  porId: Map<string, NodoCargo>
  total: number
  /** Nivel más profundo, 1-based tal como se muestra al usuario (CEO = 1). */
  nivelMaximo: number
}

/** Los dos primeros niveles (CEO y Gerente general) no se colapsan. */
const NIVEL_PRIMERA_DIRECCION = 2

export function construirArbol(cargos: Cargo[]): Arbol {
  const porId = new Map<string, NodoCargo>()
  for (const cargo of cargos) {
    if (porId.has(cargo.id)) throw new Error(`Cargo duplicado: ${cargo.id}`)
    porId.set(cargo.id, {
      cargo,
      nivel: 0,
      padre: null,
      hijos: [],
      laterales: [],
      descendientes: 0,
    })
  }

  let raiz: NodoCargo | undefined
  for (const nodo of porId.values()) {
    const { parentId } = nodo.cargo
    if (parentId === null) {
      if (raiz) throw new Error("El organigrama tiene más de una raíz")
      raiz = nodo
      continue
    }
    const padre = porId.get(parentId)
    if (!padre) {
      throw new Error(`"${nodo.cargo.id}" apunta a un padre inexistente`)
    }
    nodo.padre = padre
    ;(nodo.cargo.tipo === "lateral" ? padre.laterales : padre.hijos).push(nodo)
  }
  if (!raiz) throw new Error("El organigrama no tiene raíz")

  let nivelMaximo = 0
  const medir = (nodo: NodoCargo, nivel: number): number => {
    nodo.nivel = nivel
    nivelMaximo = Math.max(nivelMaximo, nivel + 1)
    let cuenta = 0
    for (const hijo of [...nodo.hijos, ...nodo.laterales]) {
      cuenta += 1 + medir(hijo, nivel + 1)
    }
    nodo.descendientes = cuenta
    return cuenta
  }
  medir(raiz, 0)

  if (porId.size !== 1 + raiz.descendientes) {
    throw new Error("Hay cargos desconectados de la raíz")
  }

  return { raiz, porId, total: porId.size, nivelMaximo }
}

/** Ancestros de un nodo, de la raíz hacia abajo, sin incluirlo. */
export function ancestros(nodo: NodoCargo): NodoCargo[] {
  const ruta: NodoCargo[] = []
  for (let actual = nodo.padre; actual; actual = actual.padre) {
    ruta.unshift(actual)
  }
  return ruta
}

/** Minúsculas y sin tildes, para que "logistica" encuentre "Logístico". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

/**
 * Raíz aproximada de una palabra: sin la terminación a/o/as/os/es, para que
 * "logística" encuentre "logístico" y "ventas" encuentre "venta".
 */
function raiz(palabra: string): string {
  return palabra.length >= 5 ? palabra.replace(/(as|os|es|a|o)$/, "") : palabra
}

/**
 * Cargos cuyo nombre (o nota) contiene todas las palabras de la búsqueda.
 * `desde` limita la búsqueda a esa rama, incluyéndola.
 */
export function buscar(
  arbol: Arbol,
  consulta: string,
  desde: NodoCargo = arbol.raiz
): Set<string> {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean).map(raiz)
  const coincidencias = new Set<string>()
  if (palabras.length === 0) return coincidencias

  const visitar = (nodo: NodoCargo) => {
    const texto = normalizar(`${nodo.cargo.nombre} ${nodo.cargo.nota ?? ""}`)
    if (palabras.every((p) => texto.includes(p))) {
      coincidencias.add(nodo.cargo.id)
    }
    for (const hijo of [...nodo.hijos, ...nodo.laterales]) visitar(hijo)
  }
  visitar(desde)
  return coincidencias
}

/** Coincidencias más todos sus ancestros: el camino que hay que dejar visible. */
export function rutasDe(arbol: Arbol, coincidencias: Set<string>): Set<string> {
  const ruta = new Set<string>()
  for (const id of coincidencias) {
    const nodo = arbol.porId.get(id)
    if (!nodo) continue
    ruta.add(id)
    for (const ancestro of ancestros(nodo)) ruta.add(ancestro.cargo.id)
  }
  return ruta
}

/**
 * Ids a dejar abiertos para ver todos los cargos hasta `nivel` (1-based, CEO
 * = 1). El nivel 3 son las direcciones: el estado inicial, con todo cerrado.
 */
export function abrirHastaNivel(arbol: Arbol, nivel: number): Set<string> {
  const abiertos = new Set<string>()
  for (const nodo of arbol.porId.values()) {
    if (
      nodo.nivel >= NIVEL_PRIMERA_DIRECCION &&
      nodo.hijos.length > 0 &&
      nodo.nivel + 1 < nivel
    ) {
      abiertos.add(nodo.cargo.id)
    }
  }
  return abiertos
}

export function mismosIds(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}
