import type { CheckOutcome } from "../types/order-validator.types";

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

export const ACCEPTED_EXTENSIONS = [".xlsx", ".xlsm", ".csv"] as const;

export const hasAcceptedExtension = (fileName: string) =>
  ACCEPTED_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
