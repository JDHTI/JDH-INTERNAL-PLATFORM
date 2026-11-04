import "server-only"

import { hoy as hoyFn } from "../inicio.config"
import type { ContenidoSemanal, FraseMotivacional, Quinquenio } from "../types"
import { mapContenidoSemanal } from "./contenido-semanal.mapper"
import { mapFraseMotivacional } from "./frase-motivacional.mapper"
import { mapQuinquenio } from "./quinquenio.mapper"
import { findContenidoSemanalVigente } from "./strapi-contenido-semanal.service"
import { findFrasesMotivacionales } from "./strapi-frase-motivacional.service"
import { findQuinquenios } from "./strapi-quinquenios.service"

/**
 * Mismo helper `safe()` duplicado en cada seam del proyecto (`noticias`,
 * `eventos`, `directorio`) — no hay una versión compartida todavía. Un CMS
 * caído o sin sembrar se degrada a `null` (la UI ya sabe renderizar sin el
 * bloque) en vez de tumbar la home entera.
 */
async function safe<T>(
  context: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[inicio] fallo leyendo Strapi (${context}):`, error)
    return fallback
  }
}

/**
 * Bloque editorial semanal vigente para la home. `null` si no hay ninguna
 * entrada con `fechaPublicacion` ya pasada (CMS sin sembrar, o caído).
 */
export async function getContenidoSemanal(): Promise<ContenidoSemanal | null> {
  return safe("getContenidoSemanal", null, async () => {
    const res = await findContenidoSemanalVigente(hoyFn())
    const entity = res.data[0]
    return entity ? mapContenidoSemanal(entity) : null
  })
}

/**
 * Una frase motivacional al azar del pool completo, para acompañar el saludo
 * de la home. `null` si el pool está vacío (CMS sin sembrar o caído).
 *
 * El azar se resuelve aquí, DESPUÉS de leer la respuesta cacheada de Strapi
 * (`findFrasesMotivacionales` cachea el pool completo con `next: { tags }`) —
 * así cada visita puede mostrar una frase distinta sin que eso implique
 * saltarse la caché de la petición HTTP en sí.
 */
export async function getFraseMotivacional(): Promise<FraseMotivacional | null> {
  return safe("getFraseMotivacional", null, async () => {
    const res = await findFrasesMotivacionales()
    if (res.data.length === 0) return null
    const frases = res.data.map(mapFraseMotivacional)
    return frases[Math.floor(Math.random() * frases.length)]
  })
}

/**
 * Imágenes conmemorativas de quinquenios para el carrusel de la home. `[]` si
 * el CMS está caído o sin sembrar — el componente ya sabe degradar a nada
 * (`return null`) con un array vacío.
 */
export async function getQuinquenios(limit: number): Promise<Quinquenio[]> {
  return safe("getQuinquenios", [], async () => {
    const res = await findQuinquenios(limit)
    return res.data.map(mapQuinquenio).filter((quinquenio) => quinquenio.image !== "")
  })
}
