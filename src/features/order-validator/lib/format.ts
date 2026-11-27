import { formatPct } from "@/features/supports/lib/format";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { AlertCode, CheckOutcome, MarginBasis, OrderLine, RuleEffect, ValidationOrder } from "../types/order-validator.types";

/** Alerts that only inform (API #147): they never mark a line's edge as one to review. */
export const INFO_ALERTS: ReadonlySet<AlertCode> = new Set<AlertCode>(["costo_distinto"]);

/** File rows the order's alerts point at, to mark those lines; informative ones are left out. */
export function alertedRows(order: ValidationOrder): Set<number> {
  return new Set((order.alerts ?? []).filter((alert) => !INFO_ALERTS.has(alert.code)).flatMap((alert) => alert.row_numbers));
}

/** A line's own alerts that ask for a look (not the informative ones). */
export const reviewAlerts = (line: OrderLine): AlertCode[] => (line.alerts ?? []).filter((code) => !INFO_ALERTS.has(code));

/** The margin a line brings to the order: with its support when one with money decided it. */
export function lineOrderMargin(line: OrderLine): number | null {
  return toNumber(line.order_margin_pct) ?? toNumber(line.effective_margin_pct) ?? toNumber(line.margin_pct);
}

/** Two margins that print the same are the same to the reader. */
export const differs = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) > 0.00005;

const pointsFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** A gap in margin points from a fraction: 0.052 is "5,2 puntos". */
export function formatPointsGap(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : `${pointsFormat.format(parsed * 100)} puntos`;
}

/** How each effect of a rule reads on its badge. */
export const RULE_EFFECT_LABELS: Record<RuleEffect, string> = {
  libera: "Libera",
  retiene: "Retiene",
  alerta: "Alerta",
  informa: "Informa",
};

/**
 * Names for the keys of a rule's `parameters`; the values always come from the
 * API. A key the UI does not know yet is shown with its code made readable.
 */
export const RULE_PARAMETER_LABELS: Record<string, string> = {
  margen_minimo_pedido: "Margen mínimo del pedido",
  lineas_maximas: "Líneas máximas por debajo del objetivo",
  puntos_maximos: "Puntos máximos por debajo del objetivo",
  umbral: "Umbral",
};

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
  lista: "margen Food Service",
  mayoristas: "margen Mayoristas",
  salsamentarias: "margen Salsamentarias",
  masivo_food: "margen Masivo Food",
  market: "margen Market Apartadó",
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
