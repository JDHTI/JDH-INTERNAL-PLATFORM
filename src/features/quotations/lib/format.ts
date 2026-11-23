import { toNumber } from "@/shared/lib/format";

import type { Compliance, MarginBasis, QuotationStatus } from "../types/quotations.types";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });
const signedPercent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const plainPrice = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4, useGrouping: true });
// No grouping: "1250,5" reads back as typed, where "1.250,5" would mix a thousands dot with a decimal comma.
const plainQuantity = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2, useGrouping: false });
const integer = new Intl.NumberFormat("es-CO");
const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

type Value = string | number | null | undefined;

const withNumber = (format: (value: number) => string) => (value: Value) => {
  const parsed = toNumber(value);
  return parsed === null ? "—" : format(parsed);
};

export const formatMoney = withNumber((value) => money.format(value));

/** Fractions: 0.18 is "18,0 %". A value that rounds to zero never prints "-0". */
export const formatMargin = withNumber((value) => percent.format(Math.abs(value) < 0.00005 ? 0 : value));

/** Variation with its sign: "+4,2 %", "-1,5 %". */
export const formatVariation = withNumber((value) => signedPercent.format(Math.abs(value) < 0.00005 ? 0 : value));

export const formatCount = (value: number | null | undefined) => (value === null || value === undefined ? "—" : integer.format(value));

/** Sale dates are "YYYY-MM-DD"; read as UTC so the day never shifts. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : day.format(parsed);
}

/** "12 oct", for a dense cell where the year is the current one or close to it; the full date goes in a tooltip. */
export function formatShortDay(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : shortDay.format(parsed).replace(".", "");
}

/** "28 de febrero de 2026", how a validity date reads in a sentence for the customer. */
export function formatLongDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? String(value) : longDay.format(parsed);
}

export const DEFAULT_VALIDITY_DAYS = 15;
export const MAX_VALIDITY_DAYS = 365;

/** Validity typed as days, 1 to 365. */
export function parseValidityDays(text: string): { value: number } | { error: string } {
  const clean = text.trim();
  if (!/^\d+$/.test(clean)) return { error: `Escribe la vigencia en días, por ejemplo ${DEFAULT_VALIDITY_DAYS}.` };
  const days = Number(clean);
  if (days < 1 || days > MAX_VALIDITY_DAYS) return { error: `La vigencia va de 1 a ${MAX_VALIDITY_DAYS} días.` };
  return { value: days };
}

/** Today in Bogotá plus `days`, as a UTC-midnight date for `formatLongDay`; what the API will store. */
export function validityEnd(days: number, from: Date = new Date()): Date {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(from);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  return end;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed);
}

/** A stored price as the editable cell shows it: "3.323,36", no currency sign. */
export function priceInputText(value: Value): string {
  const parsed = toNumber(value);
  return parsed === null ? "" : plainPrice.format(parsed);
}

/**
 * A price typed in the cell, as the whole-peso string the API takes. Prices
 * have no decimals, so every dot or comma is a thousands separator wherever it
 * sits: "3.323" and "3,323" are 3323, and digits typed on top of a formatted
 * price still read ("10.0000" is 100000). A trailing ",00" or ".0" (what Excel
 * pastes) is empty cents and is dropped; one or two other digits after the last
 * separator ("12,5") are a decimal, refused before it reaches the API. Empty is
 * null (remove the new price).
 */
export function parsePriceInput(text: string): { value: string | null } | { error: string } {
  const clean = text.replace(/\s|\$/g, "");
  if (clean === "") return { value: null };
  if (!/^[\d.,]+$/.test(clean)) return { error: "Escribe solo números, en pesos enteros." };

  // One or two zeros are empty cents ("3323,00"); three or more are thousands ("12.000").
  const withoutZeroCents = clean.replace(/[.,]0{1,2}$/, "");
  if (/[.,]\d{1,2}$/.test(withoutZeroCents)) return { error: "El precio va en pesos enteros, sin decimales." };
  const digits = withoutZeroCents.replace(/[.,]/g, "");
  if (digits === "") return { error: "Escribe solo números, en pesos enteros." };

  return { value: digits.replace(/^0+(?=\d)/, "") };
}

/** A stored quantity as its cell shows it: "1250,5". */
export function quantityInputText(value: Value): string {
  const parsed = toNumber(value);
  return parsed === null ? "" : plainQuantity.format(parsed);
}

/**
 * A quantity typed in its cell, in inventory units, as the decimal string the
 * API takes. Up to two decimals with comma or dot ("12,5", "0.75"); a
 * separator followed by exactly three digits is thousands ("1.200"), as in the
 * price cell. Empty is null (no quantity).
 */
export function parseQuantityInput(text: string): { value: string | null } | { error: string } {
  const clean = text.replace(/\s/g, "");
  if (clean === "") return { value: null };
  if (!/^[\d.,]+$/.test(clean)) return { error: "Escribe solo números, por ejemplo 12 o 2,5." };
  let normalized: string;
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) normalized = clean.replace(/[.,]/g, "");
  else if (/^\d+([.,]\d{1,2})?$/.test(clean)) normalized = clean.replace(",", ".");
  else return { error: "La cantidad va con máximo dos decimales." };
  if (Number(normalized) <= 0) return { error: "La cantidad debe ser mayor que cero; déjala vacía para quitarla." };
  return { value: normalized.replace(/^0+(?=\d)/, "") };
}

/**
 * A margin typed for a selection, "30", "30,5" or "30 %", as the fraction the
 * API takes ("0.3", "0.305"). It must leave room for a price: above 0 and
 * under 100.
 */
export function parseMarginInput(text: string): { value: string } | { error: string } {
  const clean = text.replace(/\s|%/g, "").replace(",", ".");
  if (clean === "") return { error: "Escribe el margen, por ejemplo 30." };
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return { error: "Escribe el margen en puntos, por ejemplo 30 o 27,5." };
  const points = Number(clean);
  if (points <= 0 || points >= 100) return { error: "El margen va entre 0 y 100 %." };
  // Integer arithmetic on hundredths of a point, so 27.5 is "0.275" and never "0.27499999".
  const fraction = Math.round(points * 100) / 10000;
  return { value: String(fraction) };
}

/**
 * A supplier's minimum margin asked on a «% Margen Garantizado», "8", "-5" or "-2,5 %", as the
 * fraction the API takes ("-0.05"). Unlike a JDH margin it may be 0 or negative: above -100 %.
 * Whether it is under the one in force is checked by whoever calls.
 */
export function parseSupplierMarginInput(text: string): { value: string } | { error: string } {
  const clean = text.replace(/\s|%/g, "").replace(",", ".").replace("−", "-");
  if (clean === "") return { error: "Escribe el margen, por ejemplo 8 o -5." };
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return { error: "Escribe el margen en puntos, por ejemplo 8, 0 o -5." };
  const points = Number(clean);
  if (points <= -100 || points >= 100) return { error: "El margen va entre -100 y 100 %." };
  // Hundredths of a point, as in parseMarginInput; `+ 0` turns a -0 into 0.
  const fraction = Math.round(points * 100) / 10000 + 0;
  return { value: String(fraction) };
}

/** Two decimal strings that mean the same number ("100" and "100.0000"). */
export function samePrice(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "";
  if (b === null || b === undefined || b === "") return false;
  return Number(a) === Number(b);
}

/** Labels for the status filter; the badge itself uses the API's `status_label`. */
export const STATUS_LABELS: Record<QuotationStatus, string> = {
  borrador: "Borrador",
  pendiente_validacion: "Pendiente de validación",
  pendiente_carga: "Pendiente de carga",
  cargada: "Cargada",
};

/** Validated, waiting to be loaded or already loaded: the Excel and the flat file can be downloaded. */
export const isValidated = (status: QuotationStatus) => status === "pendiente_carga" || status === "cargada";

export const COMPLIANCE_LABELS: Record<Compliance, string> = {
  cumple: "Cumple",
  bajo_minimo: "Bajo el mínimo",
  sin_objetivo: "Sin margen objetivo",
  sin_costo: "Sin costo",
};

/** Words next to the target margin: where it comes from. */
export const MARGIN_BASIS_LABELS: Record<MarginBasis, string> = {
  lista: "Margen Food Service",
  mayoristas: "Margen Mayoristas",
  salsamentarias: "Margen Salsamentarias",
  masivo_food: "Margen Masivo Food",
  market: "Margen Market Apartadó",
  apoyo: "Objetivo del apoyo",
};

export const WINDOW_OPTIONS = [6, 12] as const;

export const MAX_REFERENCES_PER_IMPORT = 500;

/**
 * References pasted from a sheet or a message, read the way the API reads
 * them: split on line breaks, commas, semicolons, tabs or spaces; a number
 * Excel printed with decimals ("2537.0") is the reference "2537". The API is
 * the one that decides; this is for the live count and the rows painted
 * while it answers.
 */
export function parseReferenceText(text: string): { skus: string[]; repeated: number } {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => token.trim().replace(/^(\d+)\.0+$/, "$1"))
    .filter(Boolean);
  const skus = Array.from(new Set(tokens));
  return { skus, repeated: tokens.length - skus.length };
}
