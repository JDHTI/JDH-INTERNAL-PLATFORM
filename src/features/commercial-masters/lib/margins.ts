import { toNumber, type Decimal } from "@/shared/lib/format";

import type { MarginField, MarginSource } from "../types/commercial-master.types";

export const MARGIN_LABELS: Record<MarginField, string> = {
  margin_list: "Food Service",
  margin_wholesale: "Mayoristas",
  margin_salsamentarias: "Salsamentarias",
  margin_mass_food: "Masivo Food",
  margin_market: "Market Apartadó",
  margin_employee: "Empleado JDH",
};

export const MARGIN_SOURCE_LABELS: Record<MarginSource, string> = {
  importacion: "Importación de Excel",
  manual: "Edición manual",
};

const percent = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2 });

/** The API sends fractions: "0.18" is 18 %. No margin prints a dash. */
export function formatMargin(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : percent.format(parsed);
}

/** What the input shows for a stored fraction: "0.185" becomes "18,5". */
export function fractionToPercentInput(value: Decimal | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  // Rounded away from floating-point noise (0.07 * 100 is 7.000000000000001).
  return String(Math.round(parsed * 1_000_000) / 10_000).replace(".", ",");
}

/**
 * The inverse, for what a person typed. Returns the fraction as text, null for
 * an empty box (which clears the margin), or `invalid` when the number cannot
 * be a margin: the API takes more than 0 and less than 1.
 */
export function percentInputToFraction(text: string): string | null | "invalid" {
  const clean = text.trim().replace("%", "").replace(",", ".").trim();
  if (clean === "") return null;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) return "invalid";
  return String(Math.round(parsed * 10_000) / 1_000_000);
}

/** True when two stored margins are the same number, whatever their spelling. */
export const sameMargin = (a: Decimal | null | undefined, b: Decimal | null | undefined) =>
  Math.abs((toNumber(a) ?? -1) - (toNumber(b) ?? -1)) < 1e-9;
