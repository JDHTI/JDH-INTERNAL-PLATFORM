import { AREAS, type Area } from "./areas.config";

/**
 * Shape of the signed-in user. Field names follow Microsoft Graph's `/me`
 * response so wiring Entra later is a mapping, not a refactor:
 * `displayName`, `mail`/`userPrincipalName`, `jobTitle`, and the photo from
 * `/me/photo/$value`.
 */
export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  /** Null is the normal production case too: plenty of Entra users have no photo. */
  photoUrl: string | null;
  /** Areas this user is assigned to. Drives what the area switcher lists. */
  areaIds: string[];
}

/**
 * PLACEHOLDER — replaced by the Entra session.
 *
 * Deliberately not a realistic-looking employee. A plausible fake name and
 * address would read as a real colleague to anyone opening a screenshot, and
 * would survive into production far longer than an obvious stand-in.
 */
export const PLACEHOLDER_USER: SessionUser = {
  id: "placeholder",
  displayName: "Usuario de prueba",
  email: "usuario@jdh.com.co",
  jobTitle: null,
  photoUrl: null,
  areaIds: AREAS.map((area) => area.id),
};

/**
 * Areas the user may enter. Today every area is granted through the
 * placeholder; once Entra groups are mapped to areas this keeps its signature
 * and the switcher narrows on its own.
 */
export function getAccessibleAreas(user: SessionUser): Area[] {
  return AREAS.filter((area) => user.areaIds.includes(area.id));
}

/** Initials for the avatar fallback, e.g. "Usuario de prueba" → "UP". */
export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}
