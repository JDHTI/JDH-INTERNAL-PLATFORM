/**
 * Recursos descargables y enlaces externos de marca.
 *
 * La URL del vault es parametrizable por entorno para que apuntar a otro
 * repositorio (o a un fork privado) no requiera tocar código. `NEXT_PUBLIC_*`
 * porque se consume desde componentes que pueden renderizarse en el cliente:
 * Next la inlinea en build, así que no puede leerse de forma dinámica.
 *
 * `designMd` lo genera `scripts/sync-brand-docs.mjs` en cada `dev`/`build`
 * copiando `.claude/DESIGN.md` a `public/downloads/` — el archivo servido es
 * una copia derivada, nunca una segunda fuente de verdad.
 */
export const brandConfig = {
  vaultUrl:
    process.env.NEXT_PUBLIC_BRAND_VAULT_URL ??
    "https://github.com/JDHTI/JDH-Knowledge-vault/tree/master/JDH-Design-System/JDH-Design-System",
  manualPdf: "/Manual_Imagen_JDH_2026.pdf",
  /** Tamaño del PDF, para anunciar el peso de la descarga. */
  manualPdfSize: "2,2 MB",
  designMd: "/downloads/DESIGN.md",
} as const
