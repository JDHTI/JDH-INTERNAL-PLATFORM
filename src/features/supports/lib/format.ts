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

/**
 * Names of the calc methods ("Tipo de apoyo"), the same the API publishes in
 * `form-schema.calc_method_labels`. Screens prefer the API's (useCalcMethodLabel);
 * these cover the time before it loads and the modules that do not read it.
 */
export const CALC_METHOD_LABELS: Record<string, string> = {
  pct_costo: "% sobre costo",
  pct_precio_lista: "% sobre precio lista",
  costo_neto: "Costo apoyado",
  precio_neto: "Precio apoyado sin IVA",
  valor_unidad: "$ por unidad",
  margen_minimo: "Margen mínimo",
  puntos_margen: "Puntos de margen",
  pct_ventas: "% sobre ventas",
};

/** "no_vigente" -> "No vigente": a readable fallback for codes the UI does not know. */
export function humanize(code: string | null | undefined): string {
  if (!code) return "—";
  const text = code.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const calcMethodLabel = (code: string | null | undefined, labels?: Record<string, string>) =>
  code ? (labels?.[code] ?? CALC_METHOD_LABELS[code] ?? humanize(code)) : "—";

/** Readable names for the codes of the closed fields; unknown codes are humanized. */
const CHOICE_LABELS: Record<string, Record<string, string>> = {
  calc_method: CALC_METHOD_LABELS,
  kind: {
    tactico_cliente: "Táctico por cliente",
    actividad_temporal: "Actividad temporal",
    lista_especial: "Lista especial",
    rebate: "Rebate",
    recuperacion_cliente: "Recuperación de cliente",
    liquidacion_inventario: "Liquidación de inventario",
    presupuesto: "Presupuesto",
    excepcion_margen: "Excepción de margen",
  },
  funding: { proveedor: "Proveedor", jdh: "JDH", mixto: "Mixto" },
  settlement_method: {
    nota_credito: "Nota crédito",
    pie_factura: "Pie de factura",
    costo_neto_facturado: "Costo neto facturado",
    rebate_periodico: "Rebate periódico",
  },
  value_unit: { unidad: "Unidad", caja: "Caja", kg: "Kilo" },
};

/** `labels` are the API's own for that field, when it publishes them (calc_method_labels). */
export const choiceLabel = (field: string, code: string, labels?: Record<string, string>) =>
  labels?.[code] ?? CHOICE_LABELS[field]?.[code] ?? humanize(code);

/** What wrote a support's current version (`last_origin`). */
export const ORIGIN_LABELS: Record<string, string> = {
  manual: "Creado a mano",
  lote: "Lote desde el API",
  carga: "Carga masiva",
  edicion: "Edición",
  anulacion: "Anulación",
  vencimiento: "Vencido por una carga",
  aprobacion_jdh: "Aporte JDH aprobado",
  cancelacion_jdh: "Aporte JDH cancelado",
  importacion: "Importación del libro",
};

export const originLabel = (code: string | null | undefined) =>
  code ? (ORIGIN_LABELS[code] ?? humanize(code)) : "—";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/** A moment of the API (ISO with zone), in the browser's zone. */
export function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed);
}

const clock = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayAndClock = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "las 18:00" today, "el 11 nov, 18:00" any other day. */
export function formatPublishFrom(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const today = new Date();
  return parsed.toDateString() === today.toDateString()
    ? `las ${clock.format(parsed)}`
    : `el ${dayAndClock.format(parsed)}`;
}

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
