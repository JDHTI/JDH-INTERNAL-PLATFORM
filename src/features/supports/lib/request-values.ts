import type { RequestMode } from "../types/request.types";
import type { SupplierSupport } from "../types/support.types";

/** What a JDH request asks for. Every new one asks for the margin; the other two are earlier requests. */
export const REQUEST_MODE_LABELS: Record<RequestMode, string> = {
  margen_minimo: "Margen mínimo autorizado JDH",
  margen_proveedor: "Margen mínimo proveedor",
  porcentaje: "% JDH",
  costo_neto: "Costo JDH",
};

/** What a request asks, in the API's words when it sends them («Solicitud de margen proveedor X»). */
export function requestModeLabel(request: { mode: RequestMode; mode_label?: string | null }): string {
  return request.mode_label || REQUEST_MODE_LABELS[request.mode] || request.mode;
}

/**
 * Reads what a person typed into the API's value. Percentages are typed as
 * points and sent as fractions with at most six decimals: the JDH margin must be
 * 0 ≤ v < 100 %, the supplier's minimum margin and the JDH % above -100 % (the
 * API checks the supplier's is below the one in force), the JDH cost a peso amount.
 */
export function requestValue(input: string, mode: RequestMode): number | null {
  const text = input.trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const decimals = text.split(".")[1]?.length ?? 0;
  if (decimals > (mode === "costo_neto" ? 6 : 4)) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  if (mode === "costo_neto") return number >= 0 && number < 1e12 ? number : null;
  if (mode === "margen_minimo") return number >= 0 && number < 100 ? Number((number / 100).toFixed(6)) : null;
  if (mode === "margen_proveedor") return number > -100 && number < 100 ? Number((number / 100).toFixed(6)) : null;
  return number >= -100 && number <= 100 ? Number((number / 100).toFixed(6)) : null;
}

/** Keeps the full contract precision when a reviewer confirms a proposal. */
export function formatRequestValue(value: string | number | null | undefined, mode: RequestMode): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("es-CO", mode === "costo_neto"
    ? { style: "currency", currency: "COP", maximumFractionDigits: 6 }
    : { style: "percent", maximumFractionDigits: 4 }).format(number);
}

/** The support's value in force for what the request asks. */
export function currentJdhValue(support: Partial<SupplierSupport>, mode: RequestMode) {
  if (mode === "margen_minimo") return support.supported_margin_pct;
  if (mode === "margen_proveedor") return support.supplier_min_margin_pct;
  return mode === "costo_neto" ? support.jdh_net_cost : support.jdh_pct;
}
