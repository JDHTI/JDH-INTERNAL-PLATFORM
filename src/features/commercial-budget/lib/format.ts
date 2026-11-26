import { toNumber, type Decimal } from "@/shared/lib/format";

import type { BudgetPeriod, Period } from "../types/commercial-budget.types";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const count = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const signedCount = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, signDisplay: "exceptZero" });
const points = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("es-CO", { month: "short", year: "2-digit", timeZone: "UTC" });
const bogotaTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

const dash = "—";

export function formatPesos(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? dash : pesos.format(number);
}

/** A fraction with one decimal: 0.1834 is «18,3 %». */
export function formatPercent(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? dash : percent.format(number);
}

/** A change as a fraction, with its sign: «+12,5 %». */
export function formatChange(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? dash : signedPercent.format(number);
}

/** A margin gap (0.01 is a point) in points with its sign: «−1,2 pts». */
export function formatPoints(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? dash : `${points.format(number * 100)} pts`;
}

export function formatCount(value: Decimal | number | null | undefined): string {
  const number = typeof value === "number" ? value : toNumber(value ?? null);
  return number === null ? dash : count.format(number);
}

export function formatSignedCount(value: Decimal | number | null | undefined): string {
  const number = typeof value === "number" ? value : toNumber(value ?? null);
  return number === null ? dash : signedCount.format(number);
}

/** «Noviembre de 2026». */
export function periodLabel(period: Period): string {
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  const text = monthName.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «nov 25», for the column groups. */
export function shortPeriod(period: Period): string {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : shortMonth.format(date).replace(".", "");
}

/** The three months of the average: «ago–oct 26». */
export function windowLabel(periods: Period[]): string {
  if (periods.length === 0) return "";
  const sorted = [...periods].sort();
  return `${shortPeriod(sorted[0]).split(" ")[0]}–${shortPeriod(sorted[sorted.length - 1])}`;
}

export function formatMoment(value: string | null | undefined): string {
  if (!value) return dash;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : bogotaTime.format(date);
}

/** The month the screen opens on: the current one, or the newest listed. */
export function defaultPeriod(periods: BudgetPeriod[]): Period | null {
  return periods.find((item) => item.is_current)?.period ?? periods[0]?.period ?? null;
}

/** Whole pesos typed with or without thousands dots: «1.250.000» is 1250000. Empty is null. */
export function parsePesos(text: string): string | null | undefined {
  const clean = text.replace(/[.\s$]/g, "").trim();
  if (clean === "") return null;
  return /^\d+$/.test(clean) ? clean : undefined;
}

export function parseWhole(text: string): number | null | undefined {
  const clean = text.replace(/[.\s]/g, "").trim();
  if (clean === "") return null;
  return /^\d+$/.test(clean) ? Number(clean) : undefined;
}

/** Points typed («18», «18,5») as the API's fraction; empty is null. From −100 to 100. */
export function parseMarginPoints(text: string): string | null | undefined {
  const value = text.trim().replace("%", "").replace(",", ".").trim();
  if (value === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) return undefined;
  const number = Number(value);
  if (number < -100 || number > 100) return undefined;
  return String(Math.round(number * 10_000) / 1_000_000);
}

/** A fraction from the API as points for an input: 0.185 is «18,5». */
export function marginInput(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? "" : String(Math.round(number * 1_000_000) / 10_000).replace(".", ",");
}

export function wholeInput(value: Decimal | number | null | undefined): string {
  const number = typeof value === "number" ? value : toNumber(value ?? null);
  return number === null ? "" : String(Math.round(number));
}
