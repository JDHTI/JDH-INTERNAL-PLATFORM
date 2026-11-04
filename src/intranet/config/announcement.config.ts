/**
 * Site-wide announcement bar config. Set `enabled: false` to hide it. Change
 * `id` to re-show the bar to users who dismissed a previous announcement.
 */
export interface AnnouncementConfig {
  /** Bump this to re-show after edits (dismissal is keyed to it). */
  id: string
  enabled: boolean
  message: string
  href?: `/${string}`
  linkLabel?: string
  variant: "info" | "warning" | "critical"
  dismissible: boolean
}

export const announcementConfig: AnnouncementConfig = {
  id: "2026-07-mantenimiento",
  enabled: false,
  message:
    "Mantenimiento programado del portal el sábado 26 de julio de 8:00 p. m. a 10:00 p. m.",
  href: "/ayuda",
  linkLabel: "Más información",
  variant: "info",
  dismissible: true,
}
