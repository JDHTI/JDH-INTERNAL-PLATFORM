import { House, type LucideIcon } from "lucide-react";

/*
 * The general view is the intranet (src/intranet, routes in
 * src/app/(app)/(general)); its navigation lives in src/intranet/config. The
 * workspace only needs the way back to it.
 */

export interface GeneralLink {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
}

/** The workspace's way back to the general view (sidebar footer). */
export const HOME_LINK: GeneralLink = { id: "inicio", name: "Inicio", path: "/", icon: House };

/** Where "Mi espacio de trabajo" returns to: the area the person last opened. */
export const LAST_AREA_STORAGE_KEY = "jdh-last-area";
