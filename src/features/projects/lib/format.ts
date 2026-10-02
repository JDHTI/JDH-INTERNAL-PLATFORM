import type { BadgeTone } from "@/shared/components/ui/badge";

import type { CatalogOption, Person, Project } from "../types/project.types";

/** Labels the UI uses until the catalog arrives, and if it fails to. */
export const STATUS_LABELS: Record<string, string> = {
  created: "Creado",
  ideation: "En ideación",
  in_progress: "En progreso",
  on_hold: "En pausa",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const COLOR_LABELS: Record<string, string> = {
  default: "Predeterminado",
  gray: "Gris",
  brown: "Marrón",
  orange: "Naranja",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  purple: "Morado",
  pink: "Rosado",
  red: "Rojo",
};

/** The catalog's options, or the built-in labels while it loads or if it fails. */
export function optionsOf(
  fromCatalog: CatalogOption[] | undefined,
  fallback: Record<string, string>
): CatalogOption[] {
  return fromCatalog ?? Object.entries(fallback).map(([value, label]) => ({ value, label }));
}

export function labelOf(options: CatalogOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Badge tone per status (DESIGN.md §7.5). The label always goes with it;
 * the tone only helps scanning a long list.
 */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "in_progress":
      return "info";
    case "on_hold":
      return "warning";
    case "completed":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function personName(person: Pick<Person, "display_name" | "email"> | null | undefined): string {
  if (!person) return "";
  return person.display_name || person.email || "Usuario sin nombre";
}

// Numeric (24/09/2026): fixed width, so dates line up down the column.
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** A calendar date ("YYYY-MM-DD") read as UTC, so no time zone shifts it a day. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormatter.format(new Date(`${iso}T00:00:00Z`)) : "";
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Bogotá's today as "YYYY-MM-DD", the default start date of a new project. */
export function todayIso(): string {
  return todayFormatter.format(new Date());
}

/** Gap the API suggests at either end of a folder, so later drops have room. */
const EDGE_GAP = 1024;

/**
 * Position for a project dropped at `index` of `siblings` (the folder's
 * list without it): the midpoint of its new neighbours, or one gap past the
 * edge.
 */
export function positionAt(siblings: Project[], index: number): number {
  const before = siblings[index - 1];
  const after = siblings[index];
  if (before && after) return (before.position + after.position) / 2;
  if (after) return after.position - EDGE_GAP;
  if (before) return before.position + EDGE_GAP;
  return 0;
}

export function byPosition(a: Project, b: Project): number {
  return a.position - b.position || a.created_at.localeCompare(b.created_at);
}

/** Active projects per folder, recounted from the list we hold. */
export function countByFolder(projects: Project[] | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects ?? []) {
    if (project.is_archived) continue;
    counts.set(project.folder_id, (counts.get(project.folder_id) ?? 0) + 1);
  }
  return counts;
}
