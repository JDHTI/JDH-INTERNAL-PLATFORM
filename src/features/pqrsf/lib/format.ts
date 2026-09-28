import { parseIsoDate } from "./business-days";
import type { CaseOrigin, Person, PqrsfCase } from "../types/pqrsf.types";

/** The API counts days in Bogotá; "today" has to be Bogotá's today too. */
export const PQRSF_TIME_ZONE = "America/Bogota";

const isoDateInBogota = new Intl.DateTimeFormat("en-CA", {
  timeZone: PQRSF_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayIso(): string {
  return isoDateInBogota.format(new Date());
}

// Numeric (24/09/2026): fixed width, so dates line up down the column.
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats a calendar date ("YYYY-MM-DD") without shifting it by time zone. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormatter.format(parseIsoDate(iso)) : "";
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: PQRSF_TIME_ZONE,
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

const relativeFormatter = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

/** "hace 5 minutos", "ayer": for timeline entries, with the exact time in a tooltip. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "hace un momento";
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormatter.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return relativeFormatter.format(Math.round(seconds / 86_400), "day");
  return formatDateTime(iso);
}

function calendarDaysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

/** "hoy", "mañana", "en 3 días", "hace 2 días". Calendar days, the unit people read. */
export function relativeDay(iso: string, today = todayIso()): string {
  const days = calendarDaysBetween(today, iso);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

export type DueTone = "danger" | "warning" | "neutral";

export interface DueInfo {
  tone: DueTone;
  /** Short state word, always shown next to the date: color is never alone. */
  label: string | null;
  date: string;
  relative: string;
}

/**
 * How the due date reads in a row. `is_overdue` comes from the API and is
 * not recomputed here; "vence hoy" only compares dates, which is not a rule.
 */
export function dueInfo(
  item: Pick<PqrsfCase, "due_on" | "is_overdue" | "closed_at">,
  today = todayIso()
): DueInfo | null {
  if (!item.due_on) return null;
  const base = { date: formatDate(item.due_on), relative: relativeDay(item.due_on, today) };
  if (item.closed_at) return { ...base, tone: "neutral", label: null };
  if (item.is_overdue) return { ...base, tone: "danger", label: "Vencido" };
  if (item.due_on === today) return { ...base, tone: "warning", label: "Vence hoy" };
  return { ...base, tone: "neutral", label: null };
}

export type StatusTone = "neutral" | "info" | "warning" | "success";

/**
 * Seeded statuses map to badge tokens by code (DESIGN.md §7.5). A status a
 * manager adds later reads neutral with its own name; the hex the API sends
 * stays out of the UI, because an inline color is a bug here.
 */
export function statusTone(code: string): StatusTone {
  switch (code) {
    case "leida":
      return "info";
    case "en_curso":
      return "warning";
    case "finalizada":
      return "success";
    default:
      return "neutral";
  }
}

export function personName(person: Person | null | undefined): string {
  if (!person) return "";
  return person.display_name || person.email || "Usuario sin nombre";
}

const ORIGIN_LABELS: Record<CaseOrigin, string> = {
  public_form: "Formulario público",
  internal: "Registro interno",
  import: "Importado del Excel",
};

export function originLabel(origin: string): string {
  return ORIGIN_LABELS[origin as CaseOrigin] ?? origin;
}

/** Name kept by the spreadsheet import when the person had no platform user. */
export function legacyAssignee(item: Pick<PqrsfCase, "assignee" | "legacy">): string | null {
  if (item.assignee) return null;
  const name = item.legacy?.responsable;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function documentName(item: {
  document_type: { name: string } | null;
  description: string | null;
}): string {
  return item.document_type?.name ?? item.description ?? "Documento sin tipo";
}

/** "+3" / "−2" / "0", with a real minus sign so the column aligns. */
export function signedDays(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${-value}`;
  return "0";
}

export function pluralDays(value: number): string {
  return Math.abs(value) === 1 ? "día" : "días";
}
