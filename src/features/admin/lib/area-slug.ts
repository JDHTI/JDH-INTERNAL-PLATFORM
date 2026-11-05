import { UI_RESERVED_SLUGS } from "@/shared/config/areas.config";

/**
 * The URL segment of an area, derived from its name: "Gestión Humana" is
 * /gestion-humana. Nobody types it and the panel never shows it, but the API
 * still keys the area by it and it is immutable once created.
 */
export function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

/** Slugs the UI routes itself. The API keeps its own list and answers 409 for those. */
export function isReservedSlug(slug: string): boolean {
  return (UI_RESERVED_SLUGS as readonly string[]).includes(slug);
}
