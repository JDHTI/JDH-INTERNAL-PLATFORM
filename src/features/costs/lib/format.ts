import { SUPPLIER_PICKER, type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import type { BadgeTone } from "@/shared/components/ui/badge";
import { toDate, toIso } from "@/shared/lib/iso-date";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { EntryStatus, NoveltyStatus } from "../types/costs.types";

/** A price above or below its quotation is the warning; no quotation at all is a gap to fill. */
export const ENTRY_STATUS: Record<EntryStatus, { label: string; tone: BadgeTone }> = {
  ok: { label: "Sin cambio", tone: "neutral" },
  novedad: { label: "Con novedad", tone: "warning" },
  sin_cotizacion: { label: "Sin cotización", tone: "info" },
};

/** Pending asks for work; waiting on the supplier is information; voided is out of the way. */
export const NOVELTY_STATUS: Record<NoveltyStatus, { label: string; tone: BadgeTone; help: string }> = {
  pendiente: { label: "Pendiente", tone: "warning", help: "Sin motivo todavía." },
  espera_nota_credito: {
    label: "Espera nota crédito",
    tone: "info",
    help: "Su motivo pide la nota crédito del proveedor y aún no está registrada.",
  },
  resuelta: {
    label: "Resuelta",
    tone: "success",
    help: "Tiene nota crédito, o un motivo que no la pide, o dejó de ser novedad.",
  },
  anulada: { label: "Anulada", tone: "neutral", help: "El documento se anuló en SIESA; vuelve si la línea reaparece." },
};

/** The supplier search in a filter row, where the placeholder stands in for the hidden label. */
export const SUPPLIER_FILTER: BasePickerConfig = { ...SUPPLIER_PICKER, placeholder: "Proveedor: nombre o código" };

/** The API's limit for one read of the warehouse. */
export const MAX_RANGE_DAYS = 200;

export function addDays(iso: string, days: number): string {
  const date = toDate(iso)!;
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export const today = () => toIso(new Date());

/** Days from one date to another, both counted. */
export function rangeDays(since: string, until: string): number {
  const ms = new Date(`${until}T00:00:00Z`).getTime() - new Date(`${since}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

const signedCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const signedPct = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });

/** "+$ 1.200", "-$ 35,5"; a dash without a value. */
export function formatSignedCop(value: Decimal | null): string {
  const number = toNumber(value);
  return number === null ? "—" : signedCop.format(number);
}

/** "+2,5 %" for 0.025; a dash without a value. */
export function formatSignedPct(value: Decimal | null): string {
  const number = toNumber(value);
  return number === null ? "—" : signedPct.format(number);
}

/** C.O. as SIESA writes it: three digits. */
export function formatCo(co: string | null): string {
  if (!co) return "—";
  return /^\d+$/.test(co) ? co.padStart(3, "0") : co;
}
