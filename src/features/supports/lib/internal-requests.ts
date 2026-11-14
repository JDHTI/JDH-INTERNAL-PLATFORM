import type { InternalDecision, InternalSupportRequest } from "../types/internal-request.types";

const isoDayInBogota = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

/** Today in Bogotá, "YYYY-MM-DD": the default day of the order. */
export const todayInBogota = () => isoDayInBogota.format(new Date());

/** A fraction ("0.16") as the points a person types back ("16"). */
export function marginPointsText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const points = Math.round(Number(value) * 10000) / 100;
  return Number.isFinite(points) ? String(points).replace(".", ",") : "";
}

export const DECISION_LABELS: Record<InternalDecision, string> = {
  persistente: "Registrado como apoyo",
  unica_vez: "Única vez",
};

/** The status as one label: an approval says which kind it was. */
export function internalStatusLabel(request: Pick<InternalSupportRequest, "status" | "decision">): string {
  if (request.status === "aprobada") return request.decision ? `Aprobada · ${DECISION_LABELS[request.decision]}` : "Aprobada";
  return request.status === "rechazada" ? "Rechazada" : "Pendiente";
}

export const internalStatusTone = (status: InternalSupportRequest["status"]) =>
  status === "aprobada" ? "success" : status === "rechazada" ? "danger" : "warning";
