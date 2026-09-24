import type { LucideIcon } from "lucide-react";

export interface UserRef {
  id: string;
  email: string;
  display_name: string | null;
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
  my_role: { id: string; name: string } | null;
  is_responsible: boolean;
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
}
