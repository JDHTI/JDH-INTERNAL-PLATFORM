import { toNumber } from "@/shared/lib/format";

import type { Quotation, QuotationLine } from "../types/quotations.types";
import { formatLongDay } from "./format";

export const MAX_CONDITIONS = 20;
export const MAX_CONDITION_LENGTH = 300;

/** The validity as the customer reads it; always the first condition, never typed. */
export const validityCondition = (quotation: Quotation) => `Precios válidos hasta el ${formatLongDay(quotation.valid_until)}`;

/** Every condition the customer sees, the validity first. */
export const offerConditions = (quotation: Quotation) => [validityCondition(quotation), ...quotation.conditions];

/** The lines that go in the customer's offer; the API decides with `offer_scope`. */
export const offerLines = (quotation: Quotation) => quotation.lines.filter((line) => line.in_offer);

export interface OfferLineAmounts {
  /** Offer price before VAT, per unit. */
  price: number;
  /** Per unit, VAT on the price plus the liquor tax as a fixed amount. */
  priceWithVat: number;
  vatPct: number;
  liquor: number;
  /** Only with a quantity: what that quantity costs, rounded per line like the API. */
  base: number | null;
  vat: number | null;
  total: number | null;
}

/**
 * One line's figures for the offer. The totals mirror the API's
 * `offer_summary` (round the base, round the VAT on it, liquor per unit times
 * quantity), so the preview and the workbook never disagree.
 */
export function offerAmounts(line: QuotationLine): OfferLineAmounts | null {
  const price = toNumber(line.offer_price);
  if (price === null) return null;
  const vatPct = toNumber(line.vat_pct) ?? 0;
  const liquor = toNumber(line.value_tax_amount) ?? 0;
  const quantity = toNumber(line.quantity);
  const base = quantity === null ? null : Math.round(quantity * price);
  const vat = base === null ? null : Math.round((base * vatPct) / 100);
  const liquorTotal = quantity === null ? 0 : Math.round(quantity * liquor);
  return {
    price,
    priceWithVat: Math.round(price * (1 + vatPct / 100) + liquor),
    vatPct,
    liquor,
    base,
    vat,
    total: base === null || vat === null ? null : base + vat + liquorTotal,
  };
}

export interface OfferTotals {
  itemCount: number;
  subtotal: number;
  vatGroups: { vatPct: number; base: number; vat: number }[];
  liquorTax: number;
  total: number;
}

/** The API's `offer_summary` as numbers; computed the same way here when the API has not sent it. */
export function offerTotals(quotation: Quotation): OfferTotals | null {
  if (!quotation.quote_quantities) return null;
  const summary = quotation.offer_summary;
  if (summary) {
    return {
      itemCount: summary.item_count,
      subtotal: toNumber(summary.subtotal) ?? 0,
      vatGroups: summary.vat_groups.map((group) => ({
        vatPct: toNumber(group.vat_pct) ?? 0,
        base: toNumber(group.base) ?? 0,
        vat: toNumber(group.vat) ?? 0,
      })),
      liquorTax: toNumber(summary.liquor_tax) ?? 0,
      total: toNumber(summary.total) ?? 0,
    };
  }
  const groups = new Map<number, { base: number; vat: number }>();
  let itemCount = 0;
  let liquorTax = 0;
  for (const line of offerLines(quotation)) {
    const amounts = offerAmounts(line);
    if (!amounts || amounts.base === null || amounts.vat === null || amounts.total === null) continue;
    itemCount += 1;
    const group = groups.get(amounts.vatPct) ?? { base: 0, vat: 0 };
    groups.set(amounts.vatPct, { base: group.base + amounts.base, vat: group.vat + amounts.vat });
    liquorTax += amounts.total - amounts.base - amounts.vat;
  }
  const vatGroups = [...groups].map(([vatPct, group]) => ({ vatPct, ...group })).sort((a, b) => b.vatPct - a.vatPct);
  const subtotal = vatGroups.reduce((sum, group) => sum + group.base, 0);
  const vat = vatGroups.reduce((sum, group) => sum + group.vat, 0);
  return { itemCount, subtotal, vatGroups, liquorTax, total: subtotal + vat + liquorTax };
}

/** A file name the customer can keep: "Cotizacion Supermercado La Esquina 2026-11-09". */
export function offerFileName(quotation: Quotation): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const customer = quotation.customer_name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s-]/g, "").trim();
  return `Cotizacion ${customer} ${today}`;
}
