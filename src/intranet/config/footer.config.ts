/**
 * Footer link columns (DESIGN.md §4.2). The brand column and the sedes column
 * are derived from `siteConfig` in the footer component; these are the middle
 * link columns.
 *
 * `href` is a plain string (not a typed `Route`): these institutional/support
 * pages don't exist yet, so the footer renders them as plain `<a>` anchors.
 * Promote to `<Link>` once the target pages are built.
 */
export interface FooterLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: FooterLink[]
}

export interface FooterConfig {
  columns: FooterColumn[]
  /** Show the JDH sedes column (built from `siteConfig.sedes`). */
  showSedes: boolean
}

export const footerConfig: FooterConfig = {
  columns: [
    {
      title: "Institucional",
      links: [
        { label: "Privacidad", href: "/sig/sst-cumplimiento#habeas-data" },
        { label: "Seguridad de la información", href: "/seguridad" },
        { label: "Código de ética", href: "/sig/cultura#codigo-de-etica" },
      ],
    },
    {
      title: "Soporte",
      links: [
        { label: "Mesa de ayuda TI", href: "/ayuda" },
        { label: "Preguntas frecuentes", href: "/ayuda/faq" },
        { label: "Reportar un incidente", href: "/ayuda/incidente" },
      ],
    },
  ],
  showSedes: true,
}
