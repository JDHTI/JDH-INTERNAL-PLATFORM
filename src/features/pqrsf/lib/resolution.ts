import type { CaseResolution, PqrsfCase } from "../types/pqrsf.types";

export const RESOLUTION_LABELS: Record<CaseResolution, string> = {
  procede: "Procede",
  no_procede: "No procede",
};

export const RESOLUTION_HINTS: Record<CaseResolution, string> = {
  procede: "Respondemos por el producto.",
  no_procede: "No respondemos por el producto.",
};

/** Complaints and claims cannot be finalized without saying how they ended (the API answers 422). */
export function requiresResolution(item: Pick<PqrsfCase, "request_type">): boolean {
  return item.request_type.code === "queja" || item.request_type.code === "reclamo";
}

/** Requests may say how they ended too, but are not forced to. */
export function acceptsResolution(item: Pick<PqrsfCase, "request_type">): boolean {
  return requiresResolution(item) || item.request_type.code === "peticion";
}
