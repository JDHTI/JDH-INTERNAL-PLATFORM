import type { CostParameter, ParameterUnit } from "../types/cost-settings.types";

const decimals = (max: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: max });

/** For an input: decimal comma, no thousands separator. */
const plain = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 8, useGrouping: false });

/** Clears float noise: 0.015000000000000001 → 0.015. */
const tidy = (value: number) => Number(value.toFixed(8));

/**
 * How a value reads. An increment is a fraction over the cost: 0.004 reads «+0,4 %», and 0
 * «0 % (costo estándar)». A margin is in points: «1 punto», «1,5 puntos».
 */
export function formatParameter(value: string | number, unit: ParameterUnit): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "incremento") {
    const pct = tidy(number * 100);
    if (pct === 0) return "0 % (costo estándar)";
    return `${pct > 0 ? "+" : "−"}${decimals(2).format(Math.abs(pct))} %`;
  }
  const points = tidy(number * 100);
  return `${decimals(3).format(points)} ${Math.abs(points) === 1 ? "punto" : "puntos"}`;
}

/** A range bound without the «+» or the standard-cost note: «0 %», «10 %», «1 punto». */
function formatBound(value: string | number, unit: ParameterUnit): string {
  if (unit !== "incremento") return formatParameter(value, unit);
  const number = Number(value);
  return Number.isFinite(number) ? `${decimals(2).format(tidy(number * 100))} %` : "—";
}

/** «Entre 0 % y 10 %», for the card's help and the range error. */
export function formatRange(parameter: CostParameter): string {
  return `Entre ${formatBound(parameter.minimum, parameter.unit)} y ${formatBound(parameter.maximum, parameter.unit)}`;
}

/** What the input shows: both units are typed ×100 (percent or points). */
export function toInputText(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return plain.format(tidy(number * 100));
}

/** The typed text (percent or points, «%» allowed) as the API's fraction, or null when it is not a number. */
export function fromInputText(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace("%", "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return tidy(Number(normalized) / 100);
}

/** Why a typed value is refused, or null when it fits the parameter's range. */
export function parameterError(text: string, parameter: CostParameter): string | null {
  const value = fromInputText(text);
  if (value === null) {
    return parameter.unit === "incremento" ? "Escribe el porcentaje, por ejemplo 0,4 o 0." : "Escribe los puntos, por ejemplo 1 o 0,5.";
  }
  const min = Number(parameter.minimum);
  const max = Number(parameter.maximum);
  if (value < min || value > max) return `${formatRange(parameter)}.`;
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
