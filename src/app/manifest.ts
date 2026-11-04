import type { MetadataRoute } from "next"

import { siteConfig } from "@/intranet/config/site"

/**
 * PWA manifest (installable app). `public/sw.js` exists ONLY to receive Web
 * Push (RFC 8291) for the notifications bell — no `fetch` handler, no
 * precaching, so the original reasoning still holds: an intranet with live
 * data gains little from offline caching, this just adds push delivery.
 * Icons are generated from the isotype by `scripts/generate-brand-assets.mjs`.
 * Hex values are intentional here (the manifest is JSON outside the CSS token
 * pipeline).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: siteConfig.locale,
    dir: "ltr",
    categories: ["business", "productivity"],
    background_color: "#ffffff",
    theme_color: "#1D1D1B",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
