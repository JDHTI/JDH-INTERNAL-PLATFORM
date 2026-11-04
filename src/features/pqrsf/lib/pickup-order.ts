import type { CauseRoute, PickupOrderAnswer } from "../types/pqrsf.types";

export const PICKUP_ORDER_LABELS: Record<PickupOrderAnswer, string> = {
  yes: "Sí",
  no: "No",
  unknown: "No sabe",
};

/** «Sí, número OR-55», «No», or empty when nobody answered. */
export function pickupOrderText(
  answer: PickupOrderAnswer | null | undefined,
  number: string | null | undefined,
): string {
  if (!answer) return "";
  const label = PICKUP_ORDER_LABELS[answer];
  return answer === "yes" && number ? `${label}, número ${number}` : label;
}

/** How the cause is treated: escalated to the manufacturer, a JDH process, or neither. */
export const ROUTE_LABELS: Record<CauseRoute, string> = {
  supplier: "Proveedor",
  internal: "Interna",
  none: "Sin ruta",
};
