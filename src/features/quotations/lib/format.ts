import { toNumber } from "@/shared/lib/format";

import type { Compliance, MarginBasis } from "../types/quotations.types";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });
const signedPercent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const plainPrice = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4, useGrouping: true });
const integer = new Intl.NumberFormat("es-CO");
const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });
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

export const MAX_PRICE_DECIMALS = 4;

/**
 * A price typed in the cell, as the decimal string the API takes. Accepts the
 * Colombian form ("3.323,36") and the plain one ("3323.36"). A single dot
 * followed by exactly three digits is a thousands separator ("3.323" is 3323),
 * because that is how the cell itself prints whole prices. Empty is null
 * (remove the new price).
 */
export function parsePriceInput(text: string): { value: string | null } | { error: string } {
  const clean = text.replace(/\s|\$/g, "");
  if (clean === "") return { value: null };
  if (!/^[\d.,]+$/.test(clean)) return { error: "Escribe solo números, con coma para los decimales." };

  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = clean.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = clean.split(".").join("").replace(",", ".");
    if ((clean.match(/,/g) ?? []).length > 1) return { error: "Usa una sola coma para los decimales." };
  } else {
    const dots = (clean.match(/\./g) ?? []).length;
    const afterDot = clean.length - lastDot - 1;
    normalized = dots > 1 || (dots === 1 && afterDot === 3) ? clean.split(".").join("") : clean;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return { error: "Revisa el número: sobran separadores." };
  const decimals = normalized.split(".")[1]?.length ?? 0;
  if (decimals > MAX_PRICE_DECIMALS) return { error: `El precio admite hasta ${MAX_PRICE_DECIMALS} decimales.` };
  const [whole, fraction] = normalized.split(".");
  const trimmedWhole = whole.replace(/^0+(?=\d)/, "");
  return { value: fraction ? `${trimmedWhole}.${fraction}` : trimmedWhole };
}

/** Two decimal strings that mean the same number ("100" and "100.0000"). */
export function samePrice(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "";
  if (b === null || b === undefined || b === "") return false;
  return Number(a) === Number(b);
}

export const COMPLIANCE_LABELS: Record<Compliance, string> = {
  cumple: "Cumple",
  bajo_minimo: "Bajo el mínimo",
  sin_objetivo: "Sin margen objetivo",
  sin_costo: "Sin costo",
};

/** Words next to the target margin: where it comes from. */
export const MARGIN_BASIS_LABELS: Record<MarginBasis, string> = {
  lista: "Margen lista 1",
  mayoristas: "Margen mayoristas",
  salsamentarias: "Margen salsamentarias",
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
