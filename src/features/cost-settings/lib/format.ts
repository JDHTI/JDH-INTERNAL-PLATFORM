import type { CostParameter, ParameterUnit } from "../types/cost-settings.types";

const decimals = (max: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: max });

/** For an input: decimal comma, no thousands separator. */
const plain = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 8, useGrouping: false });

/** Clears float noise: 0.015000000000000001 → 0.015. */
const tidy = (value: number) => Number(value.toFixed(8));

/**
 * How a value reads: a factor as «1,004 (+0,4 %)», a margin in points («1 punto», «1,5 puntos»).
 */
export function formatParameter(value: string | number, unit: ParameterUnit): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "factor") {
    const pct = tidy((number - 1) * 100);
    const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
    return `${decimals(6).format(number)} (${sign}${decimals(3).format(Math.abs(pct))} %)`;
  }
  const points = tidy(number * 100);
  return `${decimals(3).format(points)} ${Math.abs(points) === 1 ? "punto" : "puntos"}`;
}

/** What the input shows: the factor itself, or the margin in points. */
export function toInputText(value: string, unit: ParameterUnit): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return plain.format(unit === "factor" ? number : tidy(number * 100));
}

/** The typed text as the API's value (points back to a fraction), or null when it is not a number. */
export function fromInputText(text: string, unit: ParameterUnit): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return unit === "factor" ? number : tidy(number / 100);
}

/** Why a typed value is refused, or null when it fits the parameter's range. */
export function parameterError(text: string, parameter: CostParameter): string | null {
  const value = fromInputText(text, parameter.unit);
  if (value === null) return parameter.unit === "factor" ? "Escribe un número, por ejemplo 1,004." : "Escribe los puntos, por ejemplo 1 o 0,5.";
  const min = Number(parameter.minimum);
  const max = Number(parameter.maximum);
  if (value < min || value > max) {
    return `Debe estar entre ${formatParameter(min, parameter.unit)} y ${formatParameter(max, parameter.unit)}.`;
  }
  return null;
}

/** "25/11/2026" */
export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" }).format(new Date(iso));
}

/** "25/11/2026, 3:40 p. m." */
export function formatMoment(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(iso));
}
