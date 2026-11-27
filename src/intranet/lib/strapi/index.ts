/**
 * Cliente HTTP reutilizable para el CMS Strapi. Server-only: consumido desde
 * la capa `server/` de cada módulo (nunca desde el cliente). Ver
 * `.claude/STRAPI.md` para el contrato de integración.
 */
export { strapiFindMany, strapiFindOne, type StrapiFetchInit } from "./client"
export { buildStrapiQuery } from "./query"
export { strapiMediaUrl } from "./media"
export { strapiConfig, STRAPI_API_BASE } from "./config"
export { resolveTagsForModel } from "./webhook-tag-map"
export {
  mapBlocks,
  type ArticleBlock,
  type ArticleInline,
  type StrapiBlock,
} from "./blocks"
export type {
  StrapiEntity,
  StrapiListResponse,
  StrapiSingleResponse,
  StrapiMedia,
  StrapiMediaFormat,
  StrapiMediaFormatName,
  StrapiRequestParams,
  StrapiWebhookEvent,
  StrapiWebhookPayload,
} from "./types"
