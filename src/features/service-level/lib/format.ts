import type { BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { Bands } from "../types/service-level.types";

const pct = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const compactCop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const day = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/** «99,5 %» for 0.995; a dash when nothing was asked. */
export function formatPct(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : pct.format(parsed);
}

export function formatCop(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : cop.format(parsed);
}

/** «$ 1,2 mil M» for the cards and the chart labels, where the full figure does not fit. */
export function formatCompactCop(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : compactCop.format(parsed);
}

export function formatNumber(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : number.format(parsed);
}

export function formatDay(value: string | null | undefined): string {
  return value ? day.format(Date.parse(`${value.slice(0, 10)}T00:00:00Z`)) : "—";
}

/** «3 nov», for the daily chart's axis. */
export function formatShortDay(value: string): string {
  return shortDay.format(Date.parse(`${value.slice(0, 10)}T00:00:00Z`)).replace(".", "").replace(" de ", " ");
}

const localDay = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

/** The local day of a timestamp: a change at 23:00 in Bogotá is that day, not the next one in UTC. */
export function formatDayOf(value: string | null | undefined): string {
  return value ? localDay.format(new Date(value)) : "—";
}

export function formatWhen(value: string | null | undefined): string {
  return value ? when.format(new Date(value)) : "—";
}

export type Band = "green" | "amber" | "red";

/** Green above `green_above`, amber from `amber_from`, red below; null without a level. */
export function bandOf(value: Decimal | null | undefined, bands: Bands | undefined): Band | null {
  const parsed = toNumber(value);
  if (parsed === null || !bands) return null;
  if (parsed > Number(bands.green_above)) return "green";
  if (parsed >= Number(bands.amber_from)) return "amber";
  return "red";
}

/** Each band with its semantic tone and the words that say it, so the color is never alone. */
export function bandLook(band: Band, bands: Bands): { tone: BadgeTone; label: string; color: string } {
  const green = formatPct(bands.green_above);
  const amber = formatPct(bands.amber_from);
  switch (band) {
    case "green":
      return { tone: "success", label: `Sobre ${green}`, color: "var(--success)" };
    case "amber":
      return { tone: "warning", label: `Entre ${amber} y ${green}`, color: "var(--warning)" };
    case "red":
      return { tone: "danger", label: `Bajo ${amber}`, color: "var(--danger)" };
  }
}

export const CLASS_OPTIONS = [
  { value: "A", label: "Clase A" },
  { value: "B", label: "Clase B" },
  { value: "C", label: "Clase C" },
  { value: "D", label: "Clase D" },
  { value: "none", label: "Sin clase" },
];
