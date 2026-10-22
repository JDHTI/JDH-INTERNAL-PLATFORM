import type { BadgeTone } from "@/shared/components/ui/badge";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

import type { Secuencia } from "../types/dwh-monitoring.types";

export const dwhPath = (area: string, page = "") => `/${area}/${DWH_SEGMENT}${page ? `/${page}` : ""}`;

/** The ready-time estimate that matters now: the running one, else the next one. */
export function currentEta(sequence: Secuencia): string | null {
  return sequence.en_curso ? sequence.eta_datos_listos_en_curso : sequence.eta_datos_listos_proxima;
}

/*
 * The warehouse runs on Bogotá time and so does everyone who reads this
 * module, so instants are shown in that zone whatever the browser says.
 */
export const DWH_TIME_ZONE = "America/Bogota";

/**
 * Colombia has kept UTC-5 all year since 1993, so a Bogotá day starts at a
 * fixed offset; the Gantt needs that to turn instants into minutes of the day.
 */
const BOGOTA_OFFSET = "-05:00";

/** Below this many measured runs, a median is a guess: the ETA says so. */
export const RELIABLE_RUNS = 5;

const number = new Intl.NumberFormat("es-CO");
const pct = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat("es-CO", {
  timeZone: DWH_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const shortDay = new Intl.DateTimeFormat("es-CO", { timeZone: DWH_TIME_ZONE, day: "numeric", month: "short" });
const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: DWH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const longDay = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : number.format(value);
}

/** Percentages arrive from 0 to 100. */
export function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${pct.format(value)} %`;
}

/** The Bogotá calendar day of an instant, "YYYY-MM-DD"; today without an argument. */
export function bogotaDay(value: string | Date = new Date()): string {
  return isoDay.format(typeof value === "string" ? new Date(value) : value);
}

/** "jueves, 22 de octubre", for a "YYYY-MM-DD" day. */
export function formatLongDay(day: string): string {
  const text = longDay.format(new Date(`${day}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "07:52" in Bogotá. */
export function formatClock(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : clock.format(parsed);
}

/**
 * An instant as people say it at work: "hoy 07:52", "ayer 23:10", "mañana
 * 03:00" or "20 oct. 07:52". The day matters as much as the hour here, since a
 * time without it cannot tell today's run from yesterday's.
 */
export function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const day = bogotaDay(parsed);
  const today = bogotaDay();
  const offset = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const prefix = offset === 0 ? "hoy" : offset === -1 ? "ayer" : offset === 1 ? "mañana" : shortDay.format(parsed);
  return `${prefix} ${clock.format(parsed)}`;
}

/** A Bogotá time column, "HH:MM:SS" (sometimes with a fraction, "12:57:25.500000"), as "HH:MM". */
export function formatTimeOfDay(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "—";
}

/** "45 s", "8 min", "1 h 12 min", "3 d 4 h". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days} d` : `${days} d ${restHours} h`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  return minutes === null || minutes === undefined ? "—" : formatDuration(minutes * 60);
}

/** Minutes since a Bogotá day's midnight, for "HH:MM:SS". */
export function timeOfDayMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hours, minutes, seconds = "0"] = value.split(":");
  const total = Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;
  return Number.isFinite(total) ? total : null;
}

/** Minutes from the start of a Bogotá day to an instant; negative or past 1440 when it falls outside it. */
export function minutesIntoDay(value: string | null | undefined, day: string): number | null {
  if (!value) return null;
  const instant = Date.parse(value);
  if (Number.isNaN(instant)) return null;
  return (instant - Date.parse(`${day}T00:00:00${BOGOTA_OFFSET}`)) / 60_000;
}

/** ISO weekday of a "YYYY-MM-DD" day: 1 Monday to 7 Sunday. */
export function isoWeekday(day: string): number {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/**
 * Whether a typical-day row applies on a given weekday. The contract stores
 * weekday numbers; Monday to Saturday read the same in both Postgres
 * conventions, and Sunday is 0 in one and 7 in the other, so both count.
 */
export function runsOnWeekday(days: number[] | null, weekday: number): boolean {
  if (!days || days.length === 0) return true;
  return days.includes(weekday) || (weekday === 7 && days.includes(0));
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** A window from the warehouse's JSON as one readable line. */
export function formatWindow(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 1) return String(entries[0][1]);
    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(", ");
  }
  return JSON.stringify(value);
}

interface StatusLabel {
  label: string;
  tone: BadgeTone;
}

const RUN_STATUS: Record<string, StatusLabel> = {
  running: { label: "En curso", tone: "info" },
  success: { label: "Exitosa", tone: "success" },
  failed: { label: "Fallida", tone: "danger" },
  abandonada: { label: "Abandonada", tone: "warning" },
  orphaned: { label: "Huérfana", tone: "warning" },
};

/** A sequence run or an extraction: running, success, failed, abandonada or orphaned. */
export function runStatus(value: string | null | undefined): StatusLabel {
  if (!value) return { label: "Sin corridas", tone: "neutral" };
  return RUN_STATUS[value] ?? { label: value, tone: "neutral" };
}

const SCHEDULE_TONE: Record<string, BadgeTone> = {
  Activa: "success",
  Inactiva: "neutral",
  Retirada: "neutral",
  "Sin dato de systemd": "warning",
};

/** The warehouse already words these in Spanish; only the tone is added. */
export function scheduleStatus(value: string | null | undefined): StatusLabel {
  if (!value) return { label: "Sin dato", tone: "neutral" };
  return { label: value, tone: SCHEDULE_TONE[value] ?? "neutral" };
}

const FRESHNESS_TONE: Record<string, BadgeTone> = {
  Fresca: "success",
  Atrasada: "warning",
  "Nunca extraída": "danger",
  Deshabilitada: "neutral",
};

export function freshnessStatus(value: string | null | undefined): StatusLabel {
  if (!value) return { label: "Sin dato", tone: "neutral" };
  return { label: value, tone: FRESHNESS_TONE[value] ?? "neutral" };
}

const RECONCILIATION_TONE: Record<string, BadgeTone> = {
  Cuadra: "success",
  Diferencia: "warning",
  "No aplica": "neutral",
};

export function reconciliationStatus(value: string | null | undefined): StatusLabel | null {
  if (!value) return null;
  return { label: value, tone: RECONCILIATION_TONE[value] ?? "neutral" };
}

export const TRIGGER_LABELS: Record<string, string> = {
  scheduled: "Programada",
  manual: "Manual",
  backfill: "Recarga histórica",
};

export function triggerLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return TRIGGER_LABELS[value] ?? value;
}

export const LOAD_STATUS: Record<string, StatusLabel> = {
  success: { label: "Completa", tone: "success" },
  partial: { label: "Parcial", tone: "warning" },
  failed: { label: "Fallida", tone: "danger" },
};
