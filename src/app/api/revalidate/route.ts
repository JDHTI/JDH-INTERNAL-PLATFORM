import { revalidateTag } from "next/cache"
import type { NextRequest } from "next/server"

import { resolveTagsForModel, strapiConfig } from "@/intranet/lib/strapi"
import type { StrapiWebhookPayload } from "@/intranet/lib/strapi"

/**
 * Receptor del webhook del CMS: invalida la caché de Next en cuanto un
 * contenido cambia en Strapi, en vez de esperar a que expire el `revalidate`
 * por tiempo de `strapiFetch` (que queda como red de seguridad, no como
 * mecanismo primario).
 *
 * Configuración del lado CMS (Strapi admin → Settings → Webhooks), sin código
 * custom en el CMS:
 *   - URL:     `<URL pública de esta app>/api/revalidate`
 *   - Header:  `x-webhook-secret: <mismo valor que STRAPI_WEBHOOK_SECRET>`
 *   - Eventos: entry.create / update / delete / publish / unpublish
 *
 * Es genérico: qué tag invalida cada colección vive en `webhook-tag-map.ts`,
 * así un módulo nuevo se integra añadiendo una línea allí, sin tocar esta ruta.
 */

const SECRET_HEADER = "x-webhook-secret"

/**
 * Perfil de revalidación de Next 16 (segundo argumento, obligatorio desde v16).
 *
 * `{ expire: 0 }` = expiración inmediata, y es lo que los docs de Next indican
 * explícitamente para webhooks de sistemas externos. La alternativa recomendada
 * para el caso general, `"max"`, aplica stale-while-revalidate: serviría el
 * contenido viejo una vez más y refrescaría en segundo plano — o sea, el editor
 * publica en Strapi, recarga la intranet y **sigue viendo lo anterior**. Ese es
 * justamente el comportamiento que este webhook viene a eliminar.
 */
const REVALIDATE_PROFILE = { expire: 0 } as const

export async function POST(request: NextRequest) {
  const expected = strapiConfig.webhookSecret

  // Fail-closed: sin secreto configurado el endpoint no acepta nada. Una app
  // desplegada sin la env var no debe quedar con un invalidador abierto.
  if (!expected) {
    console.error("[revalidate] STRAPI_WEBHOOK_SECRET no está configurado")
    return Response.json({ revalidated: false }, { status: 401 })
  }

  if (request.headers.get(SECRET_HEADER) !== expected) {
    console.warn("[revalidate] rechazado: secreto ausente o incorrecto")
    return Response.json({ revalidated: false }, { status: 401 })
  }

  let payload: StrapiWebhookPayload
  try {
    payload = (await request.json()) as StrapiWebhookPayload
  } catch {
    return Response.json(
      { revalidated: false, error: "body inválido: se esperaba JSON" },
      { status: 400 }
    )
  }

  const { event, model } = payload
  if (typeof event !== "string") {
    return Response.json(
      { revalidated: false, error: "payload sin `event`" },
      { status: 400 }
    )
  }

  // El botón "Trigger" del panel de Strapi (test de conectividad, no un
  // cambio de contenido real) manda `{ event: "trigger-test" }` sin `model`.
  // No es un payload malformado, así que se trata como no-op, igual que un
  // modelo no mapeado — no un 400.
  const tags =
    typeof model === "string" ? resolveTagsForModel(model) : undefined

  if (!tags) {
    console.log(
      `[revalidate] no-op: modelo "${model ?? "(ninguno)"}" sin tags mapeados (${event})`
    )
    return Response.json({ revalidated: false, model: model ?? null, event })
  }

  for (const tag of tags) {
    revalidateTag(tag, REVALIDATE_PROFILE)
  }

  console.log(`[revalidate] ${event} en "${model}" → tags: ${tags.join(", ")}`)
  return Response.json({ revalidated: true, model, event, tags })
}
