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

/** The way into the workspace: the guide, with the area selector in the sidebar. */
export const WORKSPACE_PATH = "/workspace";

/**
 * Query flag a guard adds when it sends the person away from somewhere they
 * cannot open: `area` lands on the guide, `modulo` on the area overview.
 */
export const ACCESS_DENIED_PARAM = "sin-acceso";

/** Only accounts of the company tenant can be assigned to an area. */
export const COMPANY_EMAIL_DOMAIN = "jdh.com.co";
