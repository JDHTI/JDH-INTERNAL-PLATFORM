import { Contact, House, Lightbulb, Settings, type LucideIcon } from "lucide-react";

/*
 * The general view, for everyone signed in, with or without areas. Noticias,
 * Eventos and Documentos join once the API serves their Strapi content.
 */

export interface GeneralLink {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
}

/** The portal's main navigation, in the header. */
export const GENERAL_LINKS: GeneralLink[] = [
  { id: "inicio", name: "Inicio", path: "/", icon: House },
  { id: "directorio", name: "Directorio", path: "/directorio", icon: Contact },
];

/** Per-person pages, in the account menu. */
export const ACCOUNT_LINKS: GeneralLink[] = [
  { id: "configuracion", name: "Configuración", path: "/configuracion", icon: Settings },
  { id: "sugerencias", name: "Sugerencias", path: "/sugerencias", icon: Lightbulb },
];

export const HOME_LINK = GENERAL_LINKS[0]!;

/** Whether the link is the current page or one of its pages. */
export function isGeneralLinkActive(link: GeneralLink, pathname: string): boolean {
  if (link.path === "/") return pathname === "/";
  return pathname === link.path || pathname.startsWith(`${link.path}/`);
}

/** Where "Espacio de trabajo" returns to: the area the person last opened. */
export const LAST_AREA_STORAGE_KEY = "jdh-last-area";
