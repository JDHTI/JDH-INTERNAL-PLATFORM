import type { LucideIcon } from "lucide-react";

export interface UserRef {
  id: string;
  email: string;
  display_name: string | null;
}

/** What a role may do on a module. `manage` includes `read`. */
export type ModuleAction = "read" | "manage";

/** A role as other resources name it. `is_leader` marks the area's fixed role with every permission. */
export interface RoleRefDto {
  id: string;
  name: string;
  is_leader: boolean;
}

/** GET /areas and GET /areas/{slug}, as the API returns them. */
export interface AreaDto {
  id: string;
  slug: string;
  name: string;
  remit: string | null;
  /** lucide-react component name, e.g. "ClipboardCheck". */
  icon: string | null;
  sort_order: number;
  responsible: UserRef | null;
  my_role: RoleRefDto | null;
  is_responsible: boolean;
  /** Module key -> action the caller holds there. Admins get every module as `manage`. */
  my_modules: Record<string, ModuleAction>;
  created_at: string;
  updated_at: string;
}

/**
 * An area is a company department with its own space and its own assigned
 * people. Every route in the platform belongs to exactly one area, so the
 * sidebar always has an area in context and the URL is the source of truth
 * for which one is active. The slug is the first URL segment.
 */
export interface Area {
  id: string;
  slug: string;
  name: string;
  path: string;
  /** Square mark in the switcher. */
  icon: LucideIcon;
  /** One line describing the area's remit, shown on its overview page. */
  remit: string | null;
  responsible: UserRef | null;
  /** The caller's role in the area; null for admins and moderators without a membership. */
  myRole: RoleRefDto | null;
  isResponsible: boolean;
  /** Modules the caller may at least read here, by API module key. */
  myModules: Record<string, ModuleAction>;
}

/** Whether the person may open a module of the area. A module with no key is open to every member. */
export function canUseModule(area: Pick<Area, "myModules">, moduleKey: string | undefined): boolean {
  return moduleKey === undefined || moduleKey in area.myModules;
}
