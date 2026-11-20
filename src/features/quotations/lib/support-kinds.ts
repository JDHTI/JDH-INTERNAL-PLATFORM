import type { BadgeTone } from "@/shared/components/ui/badge";

import type { LineSupport } from "../types/quotations.types";

/**
 * What applied to a line, each with its own color so they tell apart at a glance (decided
 * 2026-11-20): the supplier's money (a tactical support), a temporary discount, and the margin
 * JDH authorized (an exception, an approved internal request, or the floor a support carries).
 */
export type AppliedKind = "proveedor" | "temporal" | "margen";

export const APPLIED_LOOK: Record<AppliedKind, { label: string; tone: BadgeTone; help: string }> = {
  proveedor: { label: "Apoyo táctico", tone: "info", help: "Dinero del proveedor por unidad: baja el costo y sube el margen." },
  temporal: { label: "Descuento temporal", tone: "warning", help: "Actividad de descuento del proveedor con vigencia corta." },
  margen: { label: "Margen autorizado", tone: "success", help: "Margen mínimo que JDH autorizó para la referencia: el precio puede bajar hasta él." },
};

/**
 * Everything the applied support brings, in order: its money (tactical or temporary) and, when
 * it carries JDH's authorized floor or is a margin exception, the authorized margin. A tactical
 * support with an authorized margin shows both; the API applies one support per line.
 */
export function appliedKinds(support: LineSupport | null): AppliedKind[] {
  if (!support) return [];
  if (support.kind === "excepcion_margen") return ["margen"];
  const kinds: AppliedKind[] = [support.kind === "actividad_temporal" ? "temporal" : "proveedor"];
  if (support.authorized_margin_pct != null) kinds.push("margen");
  return kinds;
}
