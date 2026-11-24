import type { BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { BreakdownBy, CostBasis, ItemStatus, Period, SettlementPeriod } from "../types/support-settlements.types";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("es-CO", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const bogotaTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const day = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

/** Pesos without decimals; a dash without a value. */
export function formatPesos(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? "—" : pesos.format(number);
}

/** A fraction from the API with two decimals: 0.1834 is «18,34 %». */
export function formatPercent(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? "—" : percent.format(number);
}

export function formatCount(value: Decimal | null | undefined): string {
  const number = toNumber(value);
  return number === null ? "—" : count.format(number);
}

/** «octubre de 2026», with a capital: it heads a selector and a title. */
export function periodLabel(period: Period): string {
  const date = new Date(`${period}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  const text = monthName.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A moment the API stamped, in Bogotá's time. */
export function formatMoment(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : bogotaTime.format(date);
}

/** A "YYYY-MM-DD" date, read as UTC so the day never shifts. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : day.format(date);
}

/** Where a month stands, for the selector and the state card. */
export function periodState(item: SettlementPeriod): { label: string; tone: BadgeTone } {
  if (item.is_current) return { label: "En curso · vista previa", tone: "info" };
  if (!item.settlement) return { label: "Sin calcular", tone: "warning" };
  return item.settlement.status === "cerrado" ? { label: "Cerrado", tone: "success" } : { label: "Borrador", tone: "neutral" };
}

/**
 * The month the screen opens on: the last finished one (in November, October), which is the one
 * to settle; the current month only when nothing else is listed.
 */
export function defaultPeriod(periods: SettlementPeriod[]): Period | null {
  const finished = periods.filter((item) => item.is_finished).sort((a, b) => b.period.localeCompare(a.period));
  return finished[0]?.period ?? periods[0]?.period ?? null;
}

/** The two cost bases (API #122): the long name for the selector, the short one for a month's status. */
export const COST_BASES: { value: CostBasis; label: string; short: string }[] = [
  { value: "cotizacion", label: "Costo cotización proveedor", short: "Cotización" },
  { value: "inventario", label: "Costo inventario (facturado)", short: "Inventario" },
];

export const basisShort = (basis: CostBasis) => COST_BASES.find((item) => item.value === basis)?.short ?? basis;

/**
 * A month's status on each basis, which can differ: «Cotización: Cerrado · Inventario: Borrador».
 * The current month is a preview on both.
 */
export function basesStatus(item: SettlementPeriod): string {
  if (item.is_current) return "En curso · vista previa";
  return COST_BASES.map(({ value, short }) => {
    const settlement = item.settlements?.find((entry) => entry.cost_basis === value);
    return `${short}: ${settlement ? (settlement.status === "cerrado" ? "Cerrado" : "Borrador") : "Sin calcular"}`;
  }).join(" · ");
}

/** Settled is the only status that adds to the total; the rest are calculated but not claimed. */
export const ITEM_STATUS: Record<ItemStatus, { label: string; tone: BadgeTone }> = {
  liquidado: { label: "Liquidado", tone: "success" },
  en_revision: { label: "Apoyo en revisión", tone: "warning" },
  escalas: { label: "Con escalas", tone: "info" },
  minimo_no_cumplido: { label: "Mínimo no cumplido", tone: "warning" },
  descontado_en_factura: { label: "Descontado en factura", tone: "neutral" },
  sin_valor: { label: "No se pudo calcular", tone: "danger" },
};

/** The statuses «No liquidados» filters by, in the order a reviewer goes through them. */
export const UNSETTLED_STATUSES: Exclude<ItemStatus, "liquidado">[] = [
  "en_revision",
  "escalas",
  "minimo_no_cumplido",
  "sin_valor",
  "descontado_en_factura",
];

export const BREAKDOWN_LABELS: Record<BreakdownBy, string> = {
  regional: "Regional",
  business_unit: "Unidad de negocio",
  salesperson: "Vendedor",
  customer: "Cliente",
};
