import type { DropdownOption } from "@/shared/components/ui/dropdown";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { SupportState, VocabularyEntry } from "../types/support.types";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 });
const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

const formatWith = (format: (value: number) => string) => (value: Decimal | null | undefined) => {
  const parsed = toNumber(value);
  return parsed === null ? "—" : format(parsed);
};

export const formatCop = formatWith((value) => cop.format(value));

/** The API sends fractions: 0.05 is 5%. */
export const formatPct = formatWith((value) => percent.format(value));

export const formatNumber = formatWith((value) => plain.format(value));

/** Dates are "YYYY-MM-DD"; read as UTC so the day never shifts with the zone. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed);
}

export const STATE_LABELS: Record<SupportState, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  programado: "Programado",
  inactivo: "Inactivo",
  anulado: "Anulado",
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_analisis: "En análisis",
  programado: "Programado",
  implementado: "Implementado",
  descartado: "Descartado",
};

export const PRIORITY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

/** Methods whose supplier value is a fraction, entered and shown as a percentage. */
export const PERCENT_METHODS = ["pct_costo", "pct_precio_lista", "pct_ventas", "puntos_margen", "margen_minimo"];

export const CALC_METHOD_LABELS: Record<string, string> = {
  pct_costo: "% sobre costo",
  pct_precio_lista: "% sobre precio de lista",
  valor_unidad: "Valor por unidad",
  costo_neto: "Costo neto pactado",
  precio_neto: "Precio neto pactado",
  puntos_margen: "Puntos de margen",
  pct_ventas: "% sobre ventas (rebate)",
  margen_minimo: "Margen mínimo",
};

/** "no_vigente" -> "No vigente": a readable fallback for codes the UI does not know. */
export function humanize(code: string | null | undefined): string {
  if (!code) return "—";
  const text = code.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const calcMethodLabel = (code: string | null | undefined) =>
  code ? (CALC_METHOD_LABELS[code] ?? humanize(code)) : "—";

/**
 * What the supplier gives, in the unit the calc method implies: fractions are
 * shown as %, agreed net values and per-unit values as pesos.
 */
export function formatSupplierValue(
  method: string | null,
  raw: Decimal | null
): string {
  const value = toNumber(raw);
  if (value === null) return "—";
  switch (method) {
    case "pct_costo":
    case "pct_precio_lista":
    case "pct_ventas":
    case "margen_minimo":
      return formatPct(value);
    case "puntos_margen":
      return `${plain.format(value * 100)} pp`;
    case "valor_unidad":
    case "costo_neto":
    case "precio_neto":
      return formatCop(value);
    default:
      return formatNumber(value);
  }
}

function entryValue(entry: VocabularyEntry): string {
  return typeof entry === "string" ? entry : (entry.value ?? entry.code ?? entry.name ?? "");
}

function entryLabel(entry: VocabularyEntry): string {
  if (typeof entry === "string") return humanize(entry);
  return entry.label ?? entry.name ?? humanize(entryValue(entry));
}

/**
 * Turns a catalog vocabulary into dropdown options. Free-form lists (regional,
 * channel, program) keep their own spelling; coded ones are humanized.
 */
export function toOptions(
  entries: VocabularyEntry[] | undefined,
  { raw = false }: { raw?: boolean } = {}
): DropdownOption[] {
  return (entries ?? [])
    .map((entry) => {
      const value = entryValue(entry);
      return { value, label: raw && typeof entry === "string" ? entry : entryLabel(entry) };
    })
    .filter((option) => option.value !== "");
}
