import { apiFetch } from "@/shared/lib/api-client";

import type {
  BreakdownPage,
  BreakdownParams,
  ClassRun,
  ClassStatus,
  Dashboard,
  LineParams,
  LinesPage,
  Pareto,
  ParetoKind,
  ServiceLevelFilters,
  ServiceLevelLine,
  ServiceLevelOptions,
  ServiceLevelPermissions,
  ServiceLevelReason,
} from "../types/service-level.types";

const BASE = "/service-level";

/** The query every read takes. Empty values are dropped by the client, so the API reads its defaults (the current month). */
function filterQuery(filters: ServiceLevelFilters) {
  return {
    since: filters.since,
    until: filters.until,
    co: filters.co,
    warehouse: filters.warehouse,
    supplier: filters.supplier,
    seller: filters.seller,
    customer: filters.customer,
    q: filters.q,
    reason: filters.reason,
    responsible: filters.responsible,
    product_class: filters.product_class,
    customer_class: filters.customer_class,
  };
}

/** Open: a role without the keys answers false, not 403. */
export function getServiceLevelPermissions(): Promise<ServiceLevelPermissions> {
  return apiFetch<ServiceLevelPermissions>(`${BASE}/permissions`);
}

/** The C.O., warehouses, suppliers and sellers of the period, and the reasons' responsibles. */
export function getServiceLevelOptions(since: string, until: string): Promise<ServiceLevelOptions> {
  return apiFetch<ServiceLevelOptions>(`${BASE}/options`, { query: { since, until } });
}

export function listLines(params: LineParams): Promise<LinesPage> {
  return apiFetch<LinesPage>(`${BASE}/lines`, {
    query: {
      ...filterQuery(params),
      pending: params.pending,
      sort: params.sort,
      order: params.order,
      page: params.page,
      size: params.size,
    },
  });
}

/** A pending line's reason, or none; 422 for a line with nothing pending or a switched-off reason. */
export function setLineReason(lineKey: string, reasonId: string | null, note: string | null): Promise<ServiceLevelLine> {
  return apiFetch<ServiceLevelLine>(`${BASE}/lines/${encodeURIComponent(lineKey)}/reason`, {
    method: "PUT",
    body: { reason_id: reasonId, note },
  });
}

/** The same reason for up to 500 pending lines. */
export function setLinesReason(
  lineKeys: string[],
  reasonId: string | null,
  note: string | null
): Promise<{ updated: number; items: ServiceLevelLine[] }> {
  return apiFetch(`${BASE}/lines/reason`, { method: "PUT", body: { line_keys: lineKeys, reason_id: reasonId, note } });
}

export function getDashboard(filters: ServiceLevelFilters): Promise<Dashboard> {
  return apiFetch<Dashboard>(`${BASE}/dashboard`, { query: filterQuery(filters) });
}

export function getBreakdown(params: BreakdownParams): Promise<BreakdownPage> {
  return apiFetch<BreakdownPage>(`${BASE}/dashboard/breakdown`, {
    query: {
      ...filterQuery(params),
      dimension: params.dimension,
      sort: params.sort,
      order: params.order,
      page: params.page,
      size: params.size,
    },
  });
}

/** The last classification's Pareto curve; it does not take the period. */
export function getPareto(kind: ParetoKind, co: string): Promise<Pareto> {
  return apiFetch<Pareto>(`${BASE}/pareto`, { query: { kind, co } });
}

export function getClassStatus(): Promise<ClassStatus> {
  return apiFetch<ClassStatus>(`${BASE}/classes`);
}

export function recomputeClasses(): Promise<ClassRun> {
  return apiFetch<ClassRun>(`${BASE}/classes/recompute`, { method: "POST" });
}

export function listReasons(includeInactive: boolean): Promise<ServiceLevelReason[]> {
  return apiFetch<ServiceLevelReason[]>(`${BASE}/reasons`, { query: { include_inactive: includeInactive } });
}

export function listResponsibles(): Promise<string[]> {
  return apiFetch<string[]>(`${BASE}/reasons/responsibles`);
}

export function createReason(name: string, responsible: string): Promise<ServiceLevelReason> {
  return apiFetch<ServiceLevelReason>(`${BASE}/reasons`, { method: "POST", body: { name, responsible } });
}

/** Renames, changes who answers for it or switches it off; lines keep it either way. */
export function updateReason(
  id: string,
  patch: { name?: string; responsible?: string; is_active?: boolean }
): Promise<ServiceLevelReason> {
  return apiFetch<ServiceLevelReason>(`${BASE}/reasons/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}
