import { toNumber } from "@/shared/lib/format";

import type { QuotationLine, ReviewStatus } from "../types/quotations.types";

/**
 * Where the list's price in force leaves the margin (with support) against the
 * product's target, with half a point of room either way (decided 2026-11-12):
 * under it the item needs an increase, over it the price could come down or the
 * cost be checked. Null without a price or a target to compare.
 */
export type MarginBand = "alza" | "objetivo" | "encima";

/** Half a point, as a fraction. */
export const TARGET_TOLERANCE = 0.005;

export function marginBand(line: QuotationLine): MarginBand | null {
  const margin = toNumber(line.current_margin_with_support_pct);
  const target = toNumber(line.target_margin_pct);
  if (toNumber(line.last_price) === null || margin === null || target === null) return null;
  if (margin < target - TARGET_TOLERANCE) return "alza";
  if (margin > target + TARGET_TOLERANCE) return "encima";
  return "objetivo";
}

/** Needs a look before anything else: under the minimum, no cost to judge it, or a $1 placeholder on the list. */
export function isAlert(line: QuotationLine): boolean {
  if (!line.is_active) return false;
  return line.below_target || toNumber(line.cost) === null || line.problems.includes("precio_marcador");
}

/** The item's review as the table shows it: a loaded item has left the staging. */
export type ReviewView = ReviewStatus | "cargada";

export function reviewOf(line: QuotationLine): ReviewView {
  if (line.loaded) return "cargada";
  return line.review_status ?? "sin_marcar";
}

export const REVIEW_LABELS: Record<ReviewView, string> = {
  sin_marcar: "Sin marcar",
  por_validar: "Por validar",
  validada: "Validada",
  cargada: "Cargada",
};

export const REVIEW_HELP: Record<ReviewView, string> = {
  sin_marcar: "Nadie la ha marcado todavía. Cambiar su precio la deja aquí de nuevo.",
  por_validar: "Su precio está listo y espera a quien valida.",
  validada: "Validada: espera en «Por cargar» a que se cargue en SIESA.",
  cargada: "Ya se cargó en SIESA. Cambiar su precio empieza otra revisión.",
};

/** The filters of a list update's table: the item's review and its margin band. */
export type ListFilter = "all" | ReviewView | MarginBand | "alerta";

export const LIST_FILTERS: Record<Exclude<ListFilter, "all">, (line: QuotationLine) => boolean> = {
  sin_marcar: (line) => reviewOf(line) === "sin_marcar",
  por_validar: (line) => reviewOf(line) === "por_validar",
  validada: (line) => reviewOf(line) === "validada",
  cargada: (line) => reviewOf(line) === "cargada",
  alza: (line) => marginBand(line) === "alza",
  objetivo: (line) => marginBand(line) === "objetivo",
  encima: (line) => marginBand(line) === "encima",
  alerta: isAlert,
};

export const MARGIN_FILTERS: { key: MarginBand | "alerta"; label: string; help: string }[] = [
  { key: "alza", label: "Con alza", help: "Su precio actual deja el margen más de 0,5 puntos bajo el objetivo: hay que subirlo." },
  { key: "objetivo", label: "En el objetivo", help: "Su precio actual deja el margen a menos de 0,5 puntos del objetivo." },
  {
    key: "encima",
    label: "Por encima",
    help: "Su precio actual deja el margen más de 0,5 puntos sobre el objetivo: el precio puede bajar, o hay que revisar el costo.",
  },
  { key: "alerta", label: "Alerta", help: "Bajo el mínimo, sin costo para calcular el margen o con un precio marcador de $1 en la lista." },
];

export const REVIEW_FILTERS: { key: ReviewView; label: string }[] = [
  { key: "sin_marcar", label: "Sin marcar" },
  { key: "por_validar", label: "Por validar" },
  { key: "validada", label: "Validadas" },
  { key: "cargada", label: "Cargadas" },
];
