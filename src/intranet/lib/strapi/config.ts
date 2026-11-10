import "server-only"

/**
 * Configuración de conexión al CMS Strapi. Se lee con el mismo patrón que
 * `src/config/brand.config.ts` (plain `process.env` + `??` default, sin
 * t3-env/zod — ver `.claude/ARCHITECTURE.md` 2026-07-20).
 *
 * Ambas variables van **sin** el prefijo `NEXT_PUBLIC_`: este módulo es
 * `server-only`, la lectura de datos ocurre en el servidor y el token no debe
 * llegar nunca al cliente (contrato `.claude/STRAPI.md` §3).
 *
 * En desarrollo local con el `docker compose` del CMS levantado, los defaults
 * bastan **para leer** (Strapi en `localhost:1337`, lectura pública habilitada
 * en el rol `Public`). La única variable sin default es `STRAPI_WEBHOOK_SECRET`,
 * necesaria solo si se quiere probar la invalidación por webhook en local.
 *
 * Dos URLs, porque las usan lados distintos:
 *   - `url` (`STRAPI_URL`): la que usa ESTE servidor para leer la API REST.
 *   - `publicUrl` (`STRAPI_PUBLIC_URL`, default = `url`): la base que se
 *     embebe en el HTML para lo que carga el NAVEGADOR (media y descargas).
 *     En producción es el propio origen de la intranet
 *     (`https://intranet.jdh.com.co/cms`, que Caddy reenvía al CMS): así ver
 *     una imagen no depende del certificado de un segundo dominio.
 */
export const strapiConfig = {
  url: process.env.STRAPI_URL ?? "http://localhost:1337",
  publicUrl:
    process.env.STRAPI_PUBLIC_URL ??
    process.env.STRAPI_URL ??
    "http://localhost:1337",
  token: process.env.STRAPI_API_TOKEN,
  /**
   * Secreto compartido que el CMS envía en el header `x-webhook-secret` al
   * llamar `POST /api/revalidate`. Sin valor configurado el endpoint rechaza
   * todo (fail-closed): un webhook mal configurado debe fallar ruidosamente,
   * no invalidar caché a pedido de cualquiera.
   */
  webhookSecret: process.env.STRAPI_WEBHOOK_SECRET,
} as const

/** Base de la API REST de Strapi (`<url>/api`). */
export const STRAPI_API_BASE = `${strapiConfig.url}/api`
