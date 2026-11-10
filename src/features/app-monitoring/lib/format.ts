import type { BadgeTone } from "@/shared/components/ui/badge";
import { APPS_SEGMENT, BOARD_SEGMENT } from "@/shared/config/areas.config";

import type { Aplicativo, Estado, Objetivo } from "../types/app-monitoring.types";

export const appsPath = (area: string, id?: string) =>
  `/${area}/${APPS_SEGMENT}${id ? `/${encodeURIComponent(id)}` : ""}`;

export const boardPath = (area: string) => `/${area}/${BOARD_SEGMENT}`;

interface StatusLabel {
  label: string;
  tone: BadgeTone;
}

const STATUS: Record<Estado, StatusLabel> = {
  up: { label: "Arriba", tone: "success" },
  degraded: { label: "Degradado", tone: "warning" },
  down: { label: "Caído", tone: "danger" },
};

/** A check, an application, the warehouse or the board. Null is "nothing measured yet". */
export function status(value: Estado | null | undefined): StatusLabel {
  return value ? STATUS[value] : { label: "Sin datos", tone: "neutral" };
}

/** A disabled application has no state on purpose; it says so instead of "Sin datos". */
export function applicationStatus(app: Aplicativo): StatusLabel {
  if (!app.habilitado) return { label: "Deshabilitado", tone: "neutral" };
  return status(app.estado);
}

const SEVERITY: Record<string, number> = { down: 0, degraded: 1, null: 2, up: 3 };

/** Worst first, so what needs attention is at the top; the configured order breaks ties. */
export function bySeverity(a: Aplicativo, b: Aplicativo): number {
  return SEVERITY[String(a.estado)] - SEVERITY[String(b.estado)] || a.orden - b.orden;
}

export const TARGET_LABEL: Record<Objetivo, string> = { api: "API", ui: "UI" };

const ms = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const seconds = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** "184 ms", "2,4 s". */
export function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value < 1000) return `${ms.format(value)} ms`;
  return `${seconds.format(value / 1000)} s`;
}

/**
 * `url_base` is only the server: scheme, host and an optional port. The API
 * answers 422 for anything else; saying it on blur saves the round trip.
 */
export function urlBaseProblem(value: string): string | null {
  const text = value.trim();
  if (!text) return "Escribe la dirección del servidor, por ejemplo https://intranet.jdh.com.co.";
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Escríbela completa, con https:// al comienzo.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Debe empezar por https:// o http://.";
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    return "Solo el servidor, sin ruta: la ruta del health y la de la UI van en sus campos.";
  }
  return null;
}

/** Health and UI paths start with a slash, as the API joins them to `url_base`. */
export function pathProblem(value: string): string | null {
  return value.trim().startsWith("/") ? null : "Empieza por «/», por ejemplo /api/health.";
}

/** The page a UI check landed on when it redirected (to the login, usually). */
export function redirectTarget(detail: Record<string, unknown> | null): string | null {
  const target = detail?.redirige_a;
  return typeof target === "string" && target ? target : null;
}
