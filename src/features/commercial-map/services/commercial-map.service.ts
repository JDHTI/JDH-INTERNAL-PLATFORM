import { apiFetch, type Query } from "@/shared/lib/api-client";

import type {
  ImportReport,
  Page,
  ProspectCollection,
  ProspectDetail,
  ProspectFacets,
  ProspectFilters,
  ProspectListParams,
  ProspectLoad,
  ProspectPatch,
  ProspectSummary,
  RouteCreateInput,
  RouteDetail,
  RouteStop,
  RouteSummary,
  RouteUpdateInput,
  StopPatch,
  TerritoryPermissions,
  ZoneAdoptInput,
  ZoneCollection,
  ZoneFeature,
  ZoneInput,
  ZoneLayer,
  ZoneLevel,
} from "../types/commercial-map.types";

const BASE = "/territory";
const prospect = (id: string) => `${BASE}/prospects/${encodeURIComponent(id)}`;
const zone = (id: string) => `${BASE}/zones/${encodeURIComponent(id)}`;
const route = (id: string) => `${BASE}/routes/${encodeURIComponent(id)}`;

/** The client drops `false` from a query, and here "no" is an answer: it travels as text. */
function flag(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

function filterQuery(filters: ProspectFilters): Query {
  return {
    q: filters.q,
    source_zone: filters.source_zone,
    category: filters.category,
    zone_id: filters.zone_id,
    former: flag(filters.former),
    visit_status: filters.visit_status,
  };
}

/** Open to every signed-in person: answers `false` instead of a 403. */
export function getTerritoryPermissions(): Promise<TerritoryPermissions> {
  return apiFetch<TerritoryPermissions>(`${BASE}/permissions`);
}

export function getProspectMap(filters: ProspectFilters): Promise<ProspectCollection> {
  return apiFetch<ProspectCollection>(`${BASE}/prospects/map`, { query: filterQuery(filters) });
}

export function listProspects({ located, page, size, ...filters }: ProspectListParams): Promise<Page<ProspectSummary>> {
  return apiFetch<Page<ProspectSummary>>(`${BASE}/prospects`, {
    query: { ...filterQuery(filters), located: flag(located), page, size },
  });
}

export function getProspectFacets(): Promise<ProspectFacets> {
  return apiFetch<ProspectFacets>(`${BASE}/prospects/facets`);
}

export function getProspect(id: string): Promise<ProspectDetail> {
  return apiFetch<ProspectDetail>(prospect(id));
}

export function patchProspect(id: string, patch: ProspectPatch): Promise<ProspectDetail> {
  return apiFetch<ProspectDetail>(prospect(id), { method: "PATCH", body: patch });
}

/** Simulates unless `apply`; all or nothing either way. */
export function importProspects(file: File, apply: boolean): Promise<ImportReport> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ImportReport>(`${BASE}/prospects/import`, {
    method: "POST",
    query: { apply: String(apply) },
    body,
  });
}

export function listProspectLoads(): Promise<ProspectLoad[]> {
  return apiFetch<ProspectLoad[]>(`${BASE}/prospects/loads`);
}

/** `level` narrows the official layer to communes or municipalities; without it, every level. */
export function listZones(layer: ZoneLayer, level?: ZoneLevel): Promise<ZoneCollection> {
  return apiFetch<ZoneCollection>(`${BASE}/zones`, { query: { layer, level } });
}

/** The full geometry, for editing; the list comes simplified. */
export function getZone(id: string): Promise<ZoneFeature> {
  return apiFetch<ZoneFeature>(zone(id));
}

export function createZone(input: ZoneInput): Promise<ZoneFeature> {
  return apiFetch<ZoneFeature>(`${BASE}/zones`, { method: "POST", body: input });
}

export function adoptZones(input: ZoneAdoptInput): Promise<ZoneFeature> {
  return apiFetch<ZoneFeature>(`${BASE}/zones/adopt`, { method: "POST", body: input });
}

export function updateZone(id: string, input: Partial<ZoneInput>): Promise<ZoneFeature> {
  return apiFetch<ZoneFeature>(zone(id), { method: "PUT", body: input });
}

export function deleteZone(id: string): Promise<void> {
  return apiFetch<void>(zone(id), { method: "DELETE" });
}

export function listRoutes(params: { page: number; size: number; mine: boolean }): Promise<Page<RouteSummary>> {
  return apiFetch<Page<RouteSummary>>(`${BASE}/routes`, {
    query: { page: params.page, size: params.size, mine: String(params.mine) },
  });
}

export function getRoute(id: string): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(route(id));
}

export function createRoute(input: RouteCreateInput): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`${BASE}/routes`, { method: "POST", body: input });
}

export function updateRoute(id: string, input: RouteUpdateInput): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(route(id), { method: "PUT", body: input });
}

/** Spends routing quota. */
export function computeRoute(id: string, optimize: boolean): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`${route(id)}/compute`, { method: "POST", body: { optimize } });
}

export function patchStop(routeId: string, stopId: string, patch: StopPatch): Promise<RouteStop> {
  return apiFetch<RouteStop>(`${route(routeId)}/stops/${encodeURIComponent(stopId)}`, {
    method: "PATCH",
    body: patch,
  });
}

export function deleteRoute(id: string): Promise<void> {
  return apiFetch<void>(route(id), { method: "DELETE" });
}
