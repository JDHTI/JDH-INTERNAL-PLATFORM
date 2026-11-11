import type { BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { IncreaseStatus, PriceIncrease } from "../types/price-increases.types";

/** For whoever buys, a cost going up is the warning; going down, the good news. */
export const INCREASE_STATUS: Record<IncreaseStatus, { label: string; tone: BadgeTone }> = {
  subio: { label: "Subió", tone: "warning" },
  bajo: { label: "Bajó", tone: "success" },
  estable: { label: "Estable", tone: "neutral" },
};

const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const changeFormat = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });

/** "15 oct 2026"; a dash without a date. Dates come as "YYYY-MM-DD" and are not shifted by the zone. */
export function formatIncreaseDay(value: string | null): string {
  return value ? dayFormat.format(new Date(`${value}T00:00:00Z`)) : "—";
}

const longDayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dayMonthFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "octubre de 2026" for "2026-10". */
export function formatMonth(month: string): string {
  return monthFormat.format(utc(`${month}-01`));
}

/** The first and last day of the month the range covers whole, if it covers exactly one. */
function wholeMonth(since: string, until: string): string | null {
  const month = since.slice(0, 7);
  if (!since.endsWith("-01") || until.slice(0, 7) !== month) return null;
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Number(until.slice(8)) === last ? month : null;
}

/**
 * The period in words, from the days the API answered with: «del 1 de marzo al
 * 15 de abril de 2026», «en octubre de 2026», «desde el 11 de noviembre de
 * 2025», «en todo el histórico».
 */
export function describePeriod(since: string | null, until: string | null): string {
  if (since && until) {
    const month = wholeMonth(since, until);
    if (month) return `en ${formatMonth(month)}`;
    if (since === until) return `el ${longDayFormat.format(utc(since))}`;
    const start = since.slice(0, 4) === until.slice(0, 4) ? dayMonthFormat : longDayFormat;
    return `del ${start.format(utc(since))} al ${longDayFormat.format(utc(until))}`;
  }
  if (since) return `desde el ${longDayFormat.format(utc(since))}`;
  if (until) return `hasta el ${longDayFormat.format(utc(until))}`;
  return "en todo el histórico";
}

/** "+10,25 %", "-3,97 %", "0 %"; a dash without a value. */
export function formatChange(value: Decimal | null): string {
  const number = toNumber(value);
  return number === null ? "—" : changeFormat.format(number);
}

/**
 * A row's change as the analysis reads it: its new cost against its old one on
 * the same basis (without, then with, the healthy-food tax); the file's
 * `Variacion %` only when neither pair is complete.
 */
export function rowChange(row: PriceIncrease): number | null {
  for (const [old, next] of [
    [row.old_cost, row.new_cost],
    [row.old_cost_with_tax, row.new_cost_with_tax],
  ] as const) {
    const before = toNumber(old);
    const after = toNumber(next);
    if (before !== null && before > 1 && after !== null) return after / before - 1;
  }
  return toNumber(row.variation_pct);
}
