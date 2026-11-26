import { toNumber } from "@/shared/lib/format";

import type { QuotationLine, ReviewStatus } from "../types/quotations.types";

/**
 * Where the list's price in force leaves the margin (with support) against the
 * product's target, with half a point of room either way (decided 2026-11-12):
 * under it the item needs an increase, over it the price could come down or the
 * cost be checked. An increase counts only from 1 % up (API #106, the same rule
 * as the main lists board's chips): under the target but rising less than that
 * is still «En el objetivo». Null without a price or a target to compare.
 */
export type MarginBand = "alza" | "objetivo" | "encima";

/** Half a point, as a fraction. */
export const TARGET_TOLERANCE = 0.005;

/** The smallest rise that counts as an increase: 1 % over the price in force. */
export const MIN_INCREASE = 0.01;

export function marginBand(line: QuotationLine): MarginBand | null {
  const margin = toNumber(line.current_margin_with_support_pct);
  const target = toNumber(line.target_margin_pct);
  const current = toNumber(line.last_price);
  if (current === null || margin === null || target === null) return null;
  if (margin > target + TARGET_TOLERANCE) return "encima";
  if (margin >= target - TARGET_TOLERANCE) return "objetivo";
  // Under the target: the price it goes to is the new one if set, else the optimal one.
  const goesTo = toNumber(line.new_price) ?? toNumber(line.optimal_price);
  return goesTo !== null && goesTo >= current * (1 + MIN_INCREASE) ? "alza" : "objetivo";
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
  {
    key: "alza",
    label: "Con alza",
    help: "Su precio actual deja el margen más de 0,5 puntos bajo el objetivo y el precio debe subir al menos 1 %: el precio nuevo si ya se puso; si no, el óptimo.",
  },
  {
    key: "objetivo",
    label: "En el objetivo",
    help: "Su precio actual deja el margen a menos de 0,5 puntos del objetivo, o bajo él pero con una subida menor al 1 %.",
  },
  {
    key: "encima",
    label: "Por encima",
    help: "Su precio actual deja el margen más de 0,5 puntos sobre el objetivo: el precio puede bajar, o hay que revisar el costo.",
  },
  { key: "alerta", label: "Alerta", help: "Bajo el mínimo, sin costo para calcular el margen o con un precio marcador de $1 en la lista." },
];

/**
 * The same chips on the main lists board, whose counts come from the API (#142): «Con alza» is
 * the current price under the floor (the highest cost at the minimum margin), and those rows
 * are in neither of the other two. A list update in the editor keeps MARGIN_FILTERS and
 * `marginBand` until Daniel decides whether the floor rule goes there too.
 */
export const BOARD_MARGIN_FILTERS: typeof MARGIN_FILTERS = [
  {
    key: "alza",
    label: "Con alza",
    help: "Precio actual bajo el piso (costo más alto al margen mínimo): hay que subirlo.",
  },
  {
    key: "objetivo",
    label: "En el objetivo",
    help: "Cubre el piso y su margen no pasa de 0,5 puntos sobre el objetivo. Las que están bajo el piso van en «Con alza».",
  },
  {
    key: "encima",
    label: "Por encima",
    help: "Cubre el piso y su margen pasa más de 0,5 puntos sobre el objetivo: el precio puede bajar, o hay que revisar el costo.",
  },
  MARGIN_FILTERS[3],
];

export const REVIEW_FILTERS: { key: ReviewView; label: string }[] = [
  { key: "sin_marcar", label: "Sin marcar" },
  { key: "por_validar", label: "Por validar" },
  { key: "validada", label: "Validadas" },
  { key: "cargada", label: "Cargadas" },
];
