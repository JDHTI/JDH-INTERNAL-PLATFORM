import type { BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { IncreaseStatus, PriceIncrease } from "../types/price-increases.types";

/** For whoever buys, a cost going up is the warning; going down, the good news. */
export const INCREASE_STATUS: Record<IncreaseStatus, { label: string; tone: BadgeTone }> = {
  subio: { label: "Subió", tone: "warning" },
  bajo: { label: "Bajó", tone: "success" },
  estable: { label: "Estable", tone: "neutral" },
};

const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const changeFormat = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });

/** "15 oct 2026"; a dash without a date. Dates come as "YYYY-MM-DD" and are not shifted by the zone. */
export function formatIncreaseDay(value: string | null): string {
  return value ? dayFormat.format(new Date(`${value}T00:00:00Z`)) : "—";
}

/** "+10,25 %", "-3,97 %", "0 %"; a dash without a value. */
export function formatChange(value: Decimal | null): string {
  const number = toNumber(value);
  return number === null ? "—" : changeFormat.format(number);
}

/**
 * A row's change as the analysis reads it: its new cost against its old one on
 * the same basis (without, then with, the healthy-food tax); the file's
 * `Variacion %` only when neither pair is complete.
 */
export function rowChange(row: PriceIncrease): number | null {
  for (const [old, next] of [
    [row.old_cost, row.new_cost],
    [row.old_cost_with_tax, row.new_cost_with_tax],
  ] as const) {
    const before = toNumber(old);
    const after = toNumber(next);
    if (before !== null && before > 1 && after !== null) return after / before - 1;
  }
  return toNumber(row.variation_pct);
}
