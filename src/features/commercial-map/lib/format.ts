import type { BadgeTone } from "@/shared/components/ui/badge";

import type {
  AreaStatus,
  LocationQuality,
  PaletteKey,
  RouteGeometryStatus,
  RoutePerson,
  VisitStatus,
  ZoneLevel,
} from "../types/commercial-map.types";

export const VISIT_STATUSES: VisitStatus[] = ["pending", "visited", "interested", "discarded"];

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  pending: "Pendiente",
  visited: "Visitado",
  interested: "Interesado",
  discarded: "Descartado",
};

export const VISIT_STATUS_TONE: Record<VisitStatus, BadgeTone> = {
  pending: "neutral",
  visited: "info",
  interested: "success",
  discarded: "danger",
};

export const LOCATION_QUALITY_LABEL: Record<LocationQuality, string> = {
  exact: "Ubicación exacta",
  approximate: "Ubicación aproximada",
  manual: "Ubicación corregida a mano",
  missing: "Sin ubicación",
};

export const AREA_STATUS_LABEL: Record<AreaStatus, string> = {
  inside: "Dentro del área",
  outside: "Fuera del área",
  unlocated: "Por ubicar",
};

export const PALETTE_LABEL: Record<PaletteKey, string> = {
  blue: "Azul",
  orange: "Naranja",
  green: "Verde",
  purple: "Morado",
  yellow: "Amarillo",
  pink: "Rosado",
  brown: "Café",
  red: "Rojo",
  gray: "Gris",
};

export const ZONE_LEVEL_LABEL: Record<ZoneLevel, string> = {
  department: "Departamento",
  municipality: "Municipio",
  commune: "Comuna",
  neighborhood: "Barrio",
  custom: "Zona",
};

export const GEOMETRY_STATUS_LABEL: Record<RouteGeometryStatus, string> = {
  road: "Trazada por calles",
  straight: "En línea recta",
  pending: "Sin calcular",
};

export const GEOMETRY_STATUS_TONE: Record<RouteGeometryStatus, BadgeTone> = {
  road: "success",
  straight: "warning",
  pending: "neutral",
};

const integer = new Intl.NumberFormat("es-CO");
const oneDecimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export function formatCount(value: number): string {
  return integer.format(value);
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return "—";
  return meters < 1000 ? `${integer.format(Math.round(meters))} m` : `${oneDecimal.format(meters / 1000)} km`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

/** `2026-03-01` as «marzo de 2026». */
export function formatMonth(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : monthFormat.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date);
}

export function personName(person: RoutePerson | null): string | null {
  if (!person) return null;
  return person.display_name || person.email || null;
}
