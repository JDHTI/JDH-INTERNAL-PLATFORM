import { toNumber } from "@/shared/lib/format";

import type { Compliance, QuotationLine } from "../types/quotations.types";
import { COMPLIANCE_LABELS } from "./format";
import { offerAmounts } from "./offer";

/**
 * Where a price leaves the margin (with support) against the product's rule:
 * at or over the target, between the minimum and the target (the advisor's own
 * room), or under the minimum.
 */
export type Standing = "objetivo" | "rango" | "minimo";

// Margins come as 4-decimal strings; a price rounded to whole pesos can land a hair under the target.
const TOLERANCE = 0.00005;

export const isLocal = (line: QuotationLine) => line.origin === "local";

function standingOf(margin: number | null, target: number | null, underMinimum: boolean): Standing | null {
  if (underMinimum) return "minimo";
  if (margin === null || target === null) return null;
  return margin + TOLERANCE >= target ? "objetivo" : "rango";
}

/** The new price's standing; null without a new price, or when the rule cannot judge it (no cost, no target). */
export function newPriceStanding(line: QuotationLine): Standing | null {
  if (line.new_price === null || !line.is_active || isLocal(line)) return null;
  if (line.compliance === "bajo_minimo") return "minimo";
  if (line.compliance !== "cumple") return null;
  return standingOf(toNumber(line.new_margin_with_support_pct ?? line.new_margin_pct), toNumber(line.target_margin_pct), false) ?? "objetivo";
}

const roundRatio = (value: number) => Math.round(value * 10000) / 10000;

/**
 * The line as the API would return it with `price` as its new price, to preview the margin
 * while the price is typed and before Enter saves it. Same arithmetic as the API's `reprice`:
 * margin `(price − (cost − support)) / price`, where a «% Margen Garantizado» pays
 * `max(0, cost − price × (1 − g))` at that price and any other support its fixed amount;
 * compliance against the minimum. The API's answer replaces it once saved.
 */
export function previewLine(line: QuotationLine, price: number): QuotationLine {
  const cost = toNumber(line.cost);
  const text = String(price);
  // The API's `variation`: new / last − 1, none without a last price.
  const last = toNumber(line.last_price);
  const variation_pct = last === null || last <= 0 || price <= 0 ? null : String(roundRatio(price / last - 1));
  if (cost === null || price <= 0) {
    const compliance = cost === null ? "sin_costo" : null;
    return {
      ...line,
      variation_pct,
      new_price: text,
      new_margin_pct: null,
      new_margin_with_support_pct: null,
      compliance,
      compliance_label: compliance ? COMPLIANCE_LABELS[compliance] : null,
    };
  }
  const guaranteed = toNumber(line.support?.guaranteed_margin_pct ?? null);
  const support =
    line.support === null
      ? 0
      : guaranteed !== null
        ? Math.max(0, cost - price * (1 - guaranteed))
        : (toNumber(line.support.amount) ?? 0);
  const plain = roundRatio((price - cost) / price);
  const withSupport = roundRatio((price - (cost - support)) / price);
  const minimum = toNumber(line.min_margin_pct);
  const compliance: Compliance = minimum === null ? "sin_objetivo" : withSupport >= roundRatio(minimum) ? "cumple" : "bajo_minimo";
  return {
    ...line,
    variation_pct,
    new_price: text,
    new_margin_pct: String(plain),
    new_margin_with_support_pct: String(withSupport),
    compliance,
    compliance_label: COMPLIANCE_LABELS[compliance],
  };
}

/** The last price's standing; null for a reference never sold in the window. */
export function lastPriceStanding(line: QuotationLine): Standing | null {
  if (toNumber(line.last_price) === null || isLocal(line)) return null;
  return standingOf(toNumber(line.current_margin_with_support_pct), toNumber(line.target_margin_pct), line.below_target);
}

/** What the line will be quoted at: the new price when there is one, the last price otherwise. */
export function lineStanding(line: QuotationLine): Standing | null {
  return line.new_price !== null ? newPriceStanding(line) : lastPriceStanding(line);
}

/** The indicators above the table; each one is also the filter that shows its lines. */
export type Indicator = "all" | Standing | "sin_referencia" | "local" | "sin_precio" | "apoyo";

export const INDICATORS: Record<Indicator, (line: QuotationLine) => boolean> = {
  all: () => true,
  objetivo: (line) => lineStanding(line) === "objetivo",
  rango: (line) => lineStanding(line) === "rango",
  minimo: (line) => lineStanding(line) === "minimo",
  sin_referencia: (line) => !isLocal(line) && toNumber(line.last_price) === null,
  local: isLocal,
  sin_precio: (line) => line.is_active && line.new_price === null,
  apoyo: (line) => line.support !== null,
};

/**
 * The price the customer pays, with VAT and the liquor tax: VAT on the new
 * price, the liquor tax added as a fixed amount per unit. Null without a new price.
 */
export function priceWithVat(line: QuotationLine): number | null {
  const price = toNumber(line.new_price);
  if (price === null) return null;
  const vat = toNumber(line.vat_pct) ?? 0;
  const liquor = toNumber(line.value_tax_amount) ?? 0;
  return Math.round(price * (1 + vat / 100) + liquor);
}

/** Numeric columns the table sorts by. */
export type SortKey =
  | "last_price"
  | "current_margin"
  | "optimal"
  | "new_price"
  | "new_margin"
  | "vat"
  | "final_price"
  | "variation"
  | "quantity"
  | "line_total"
  | "min_price"
  | "consumption_tax"
  /** Only offered to BI, who sees the cost. */
  | "cost";
export type SortDirection = "desc" | "asc";
export interface Sort {
  key: SortKey;
  direction: SortDirection;
}

const SORT_VALUE: Record<SortKey, (line: QuotationLine) => number | null> = {
  last_price: (line) => toNumber(line.last_price),
  current_margin: (line) => (line.last_price === null ? null : toNumber(line.current_margin_with_support_pct)),
  optimal: (line) => toNumber(line.optimal_price),
  new_price: (line) => toNumber(line.new_price),
  new_margin: (line) => (line.new_price === null ? null : toNumber(line.new_margin_with_support_pct ?? line.new_margin_pct)),
  vat: (line) => toNumber(line.vat_pct),
  final_price: priceWithVat,
  variation: (line) => toNumber(line.variation_pct),
  quantity: (line) => toNumber(line.quantity),
  min_price: (line) => toNumber(line.min_price),
  consumption_tax: (line) => toNumber(line.value_tax_amount),
  line_total: (line) => offerAmounts(line)?.total ?? null,
  cost: (line) => toNumber(line.cost),
};

/** A copy sorted by one column; lines without a value go last in either direction. */
export function sortLines(lines: QuotationLine[], sort: Sort | null): QuotationLine[] {
  if (!sort) return lines;
  const value = SORT_VALUE[sort.key];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...lines].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * sign;
  });
}

/** Distinct non-empty values, sorted the way a Spanish reader expects. */
export function distinctValues(lines: QuotationLine[], pick: (line: QuotationLine) => string | null | undefined): string[] {
  const values = new Set<string>();
  for (const line of lines) {
    const value = pick(line)?.trim();
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "es-CO"));
}

export const supplierOf = (line: QuotationLine) => line.supplier_name ?? line.supplier_code;
