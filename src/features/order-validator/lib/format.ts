import { formatPct } from "@/features/supports/lib/format";
import type { Decimal } from "@/shared/lib/format";

import type { CheckOutcome, MarginBasis } from "../types/order-validator.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

/** Upload and validation times are instants: shown in the reader's own zone. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed);
}

/** Order dates are "YYYY-MM-DD" with no zone; read as UTC so the day never shifts. */
export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : day.format(parsed);
}

/** The API labels statuses and reasons; this one is the outcome of a single check, which it does not. */
export const OUTCOME_LABELS: Record<CheckOutcome, string> = {
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_evaluable: "No evaluable",
};

/** Which product margin a line was compared against, in the words next to the target. */
export const MARGIN_BASIS_LABELS: Record<MarginBasis, string> = {
  lista: "margen lista",
  mayoristas: "margen mayoristas",
  salsamentarias: "margen salsamentarias",
};

export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 20;

/**
 * Points of margin typed by a person, "0,5" or "0.5", as the text the API takes.
 * Empty is null (use the saved or default threshold); outside 0 to 20 is invalid.
 */
export function parseThresholdPoints(text: string): string | null | "invalid" {
  const clean = text.trim().replace(",", ".");
  if (clean === "") return null;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < THRESHOLD_MIN || parsed > THRESHOLD_MAX) return "invalid";
  return String(parsed);
}

const points = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A margin as a percentage; one that rounds to zero prints "0%", never "-0%". */
export function formatMarginPct(value: Decimal | null | undefined): string {
  const text = formatPct(value);
  return /^-0(,0+)?\s?%$/.test(text) ? "0%" : text;
}

/** "0.50" becomes "0,50 puntos". */
export function formatThreshold(value: string | number | null | undefined): string {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? "—" : `${points.format(parsed)} puntos`;
}

export const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"] as const;

export const hasAcceptedExtension = (fileName: string) =>
  ACCEPTED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
