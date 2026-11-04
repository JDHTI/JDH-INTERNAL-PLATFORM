/**
 * Huso horario de la operación. Toda la compañía está en Colombia, así que el
 * saludo y la fecha de la home se resuelven contra este huso y NO contra el
 * reloj del servidor (que en un contenedor suele estar en UTC: a las 8 p. m.
 * de Bogotá saludaría "buenas noches" un día, y en producción otro).
 */
export const TIME_ZONE = "America/Bogota"

/** Cuántas noticias corporativas trae el carrusel de la home. */
export const NOTICIAS_LIMIT = 6

/**
 * Video del primer slide del slider de la home (`HomeVideoSlide`). Fuente
 * fija en código (no vía CMS, por ahora): acepta tanto una ruta/URL de
 * archivo propio (mp4/webm) como un link de YouTube o Vimeo — `resolveHomeVideo`
 * decide cuál es. Hardcodeado a un video de YouTube para probar el embed.
 */
export const HOME_VIDEO_SRC = "https://www.youtube.com/watch?v=aUKdXJNPbak"
/** Miniatura mostrada antes de reproducir un archivo propio. Sin efecto en un embed de YouTube/Vimeo (traen su propia miniatura). */
export const HOME_VIDEO_POSTER: string | undefined = undefined

export type HomeVideoEmbed =
  | { kind: "iframe"; embedUrl: string; title: string }
  | { kind: "file"; src: string }

/**
 * Agrega los parámetros de autoplay a una URL de embed. Los navegadores solo
 * permiten autoplay si el video arranca silenciado (`mute`/`muted`) — no hay
 * forma de saltarse esa política, así que el autoplay implica arrancar sin
 * audio; el usuario lo puede reactivar desde los controles del reproductor.
 * `playsinline` evita que YouTube/Vimeo se abran a pantalla completa solos en
 * iOS al arrancar.
 */
function withAutoplayParams(embedUrl: string, muteParam: "mute" | "muted"): string {
  const url = new URL(embedUrl)
  url.searchParams.set("autoplay", "1")
  url.searchParams.set(muteParam, "1")
  url.searchParams.set("playsinline", "1")
  return url.toString()
}

/**
 * Detecta si `src` es un link de YouTube/Vimeo (cualquiera de sus formas:
 * `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `vimeo.com/ID`,
 * `player.vimeo.com/video/ID`) y lo traduce a su URL de embed (con autoplay
 * silenciado, ver `withAutoplayParams`) para un `<iframe>`; cualquier otra
 * cosa (ruta relativa a `public/`, URL de archivo mp4/webm) se trata como
 * archivo propio para el `<video>` nativo. YouTube vía `youtube-nocookie.com`
 * (modo de privacidad ampliada de Google) — menos cookies de terceros en una
 * intranet corporativa.
 */
export function resolveHomeVideo(src: string): HomeVideoEmbed {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return { kind: "file", src }
  }

  const host = url.hostname.replace(/^www\.|^m\./, "")

  if (host === "youtu.be") {
    const id = url.pathname.slice(1)
    if (id) {
      return {
        kind: "iframe",
        embedUrl: withAutoplayParams(
          `https://www.youtube-nocookie.com/embed/${id}`,
          "mute"
        ),
        title: "Video de YouTube",
      }
    }
  }

  if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v")
      if (id) {
        return {
          kind: "iframe",
          embedUrl: withAutoplayParams(
            `https://www.youtube-nocookie.com/embed/${id}`,
            "mute"
          ),
          title: "Video de YouTube",
        }
      }
    }
    const shortsMatch = /^\/shorts\/([^/]+)/.exec(url.pathname)
    if (shortsMatch) {
      return {
        kind: "iframe",
        embedUrl: withAutoplayParams(
          `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`,
          "mute"
        ),
        title: "Video de YouTube",
      }
    }
    const embedMatch = /^\/embed\/([^/]+)/.exec(url.pathname)
    if (embedMatch) {
      return {
        kind: "iframe",
        embedUrl: withAutoplayParams(url.toString(), "mute"),
        title: "Video de YouTube",
      }
    }
  }

  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0]
    if (id) {
      return {
        kind: "iframe",
        embedUrl: withAutoplayParams(
          `https://player.vimeo.com/video/${id}`,
          "muted"
        ),
        title: "Video de Vimeo",
      }
    }
  }

  if (host === "player.vimeo.com") {
    return {
      kind: "iframe",
      embedUrl: withAutoplayParams(url.toString(), "muted"),
      title: "Video de Vimeo",
    }
  }

  return { kind: "file", src }
}

/**
 * Cuántos próximos eventos muestra el panel de la home — a propósito MENOS
 * que en `/eventos` (`PROXIMOS_LIMIT = 7`, definido en `eventos.config.ts`):
 * la home es una vitrina, no el listado completo del módulo.
 */
export const EVENTOS_LIMIT = 4

/** Cuántos nuevos integrantes muestra el slider del pie de la home (3 visibles a la vez en desktop). */
export const NUEVOS_INGRESOS_LIMIT = 10

/** Cuántas imágenes de quinquenios trae el carrusel de la home. */
export const QUINQUENIOS_LIMIT = 8

const HORA_TARDE = 12
const HORA_NOCHE = 19

/**
 * Hora del día (0-23) en Colombia. `hourCycle: "h23"` evita el "24" que
 * devuelven algunas versiones de ICU para la medianoche con `hour12: false`.
 */
function horaEnColombia(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  )
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches", según la hora de Colombia. */
export function saludoPara(now: Date = new Date()): string {
  const hora = horaEnColombia(now)
  if (hora < HORA_TARDE) return "Buenos días"
  if (hora < HORA_NOCHE) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Primer nombre de un nombre completo de Entra ("Daniel Osorio Ruiz" →
 * "Daniel"). El saludo con el nombre completo se lee como una notificación
 * del sistema, no como un saludo. Cadena vacía → cadena vacía, y quien llama
 * decide qué hacer (hoy: saludar sin nombre).
 */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? ""
}

/**
 * Fecha de HOY como "YYYY-MM-DD" en horario de Colombia — para filtrar
 * `getContenidoSemanal` (`fechaPublicacion <= hoy`). Deliberadamente NO usa
 * `todayIsoDate()` de `@/lib/date`: ese helper resuelve contra el reloj LOCAL
 * del servidor (correcto para `eventos`, que ya lo usa así), y en un
 * contenedor en UTC adelantaría el día frente a Bogotá (UTC-5) — el mismo
 * riesgo que ya motivó fijar `TIME_ZONE` para el saludo/fecha de la home. El
 * locale `en-CA` emite directamente el formato ISO `YYYY-MM-DD`, sin parseo
 * manual de partes.
 */
export function hoy(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now)
}
