"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  adoptZones,
  computeRoute,
  createRoute,
  createZone,
  deleteRoute,
  deleteZone,
  getProspect,
  getProspectFacets,
  getProspectMap,
  getRoute,
  getTerritoryPermissions,
  getZone,
  importProspects,
  listProspectLoads,
  listProspects,
  listRoutes,
  listZones,
  patchProspect,
  patchStop,
  updateRoute,
  updateZone,
} from "../services/commercial-map.service";
import type {
  ProspectFilters,
  ProspectListParams,
  ProspectPatch,
  RouteCreateInput,
  RouteDetail,
  RouteUpdateInput,
  StopPatch,
  ZoneAdoptInput,
  ZoneInput,
  ZoneLayer,
} from "../types/commercial-map.types";

export const territoryKeys = {
  all: ["territory"] as const,
  permissions: () => [...territoryKeys.all, "permissions"] as const,
  prospects: () => [...territoryKeys.all, "prospects"] as const,
  map: (filters: ProspectFilters) => [...territoryKeys.prospects(), "map", filters] as const,
  list: (params: ProspectListParams) => [...territoryKeys.prospects(), "list", params] as const,
  facets: () => [...territoryKeys.prospects(), "facets"] as const,
  detail: (id: string) => [...territoryKeys.prospects(), "detail", id] as const,
  loads: () => [...territoryKeys.prospects(), "loads"] as const,
  zones: () => [...territoryKeys.all, "zones"] as const,
  zoneList: (layer: ZoneLayer) => [...territoryKeys.zones(), "list", layer] as const,
  zone: (id: string) => [...territoryKeys.zones(), "detail", id] as const,
  routes: () => [...territoryKeys.all, "routes"] as const,
  routeList: (params: { page: number; size: number; mine: boolean }) =>
    [...territoryKeys.routes(), "list", params] as const,
  route: (id: string) => [...territoryKeys.routes(), "detail", id] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

// Prospects change about once a month (the load) or by hand on this screen,
// and every mutation here invalidates what it touched.
const STALE = 5 * 60_000;

export function useTerritoryPermissions() {
  return useQuery({
    queryKey: territoryKeys.permissions(),
    queryFn: getTerritoryPermissions,
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useProspectMap(filters: ProspectFilters, enabled = true) {
  return useQuery({
    queryKey: territoryKeys.map(filters),
    queryFn: () => getProspectMap(filters),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    retry: retryTransient,
    enabled,
  });
}

export function useProspects(params: ProspectListParams, enabled = true) {
  return useQuery({
    queryKey: territoryKeys.list(params),
    queryFn: () => listProspects(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    retry: retryTransient,
    enabled,
  });
}

export function useProspectFacets() {
  return useQuery({
    queryKey: territoryKeys.facets(),
    queryFn: getProspectFacets,
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useProspect(id: string | null) {
  return useQuery({
    queryKey: territoryKeys.detail(id ?? ""),
    queryFn: () => getProspect(id as string),
    staleTime: STALE,
    retry: retryTransient,
    enabled: id !== null,
  });
}

/** Moving the point reassigns the commercial zone, so zone counts go stale too. */
export function usePatchProspect() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProspectPatch }) => patchProspect(id, patch),
    onSuccess: (detail, { patch }) => {
      client.setQueryData(territoryKeys.detail(detail.id), detail);
      void client.invalidateQueries({ queryKey: territoryKeys.prospects(), refetchType: "active" });
      if (patch.latitude !== undefined) void client.invalidateQueries({ queryKey: territoryKeys.zones() });
      // A stop mirrors its prospect's visit status.
      if (patch.visit_status !== undefined) void client.invalidateQueries({ queryKey: territoryKeys.routes() });
    },
  });
}

export function useImportProspects() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, apply }: { file: File; apply: boolean }) => importProspects(file, apply),
    onSuccess: (report) => {
      if (!report.applied) return;
      void client.invalidateQueries({ queryKey: territoryKeys.prospects() });
      void client.invalidateQueries({ queryKey: territoryKeys.zones() });
    },
  });
}

export function useProspectLoads(enabled: boolean) {
  return useQuery({
    queryKey: territoryKeys.loads(),
    queryFn: listProspectLoads,
    staleTime: STALE,
    retry: retryTransient,
    enabled,
  });
}

export function useZones(layer: ZoneLayer, enabled = true) {
  return useQuery({
    queryKey: territoryKeys.zoneList(layer),
    queryFn: () => listZones(layer),
    staleTime: STALE,
    retry: retryTransient,
    enabled,
  });
}

export function useZone(id: string | null) {
  return useQuery({
    queryKey: territoryKeys.zone(id ?? ""),
    queryFn: () => getZone(id as string),
    staleTime: STALE,
    retry: retryTransient,
    enabled: id !== null,
  });
}

/** Any change to a commercial zone reassigns prospects on the server. */
function useZoneChanged() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: territoryKeys.zones() });
    void client.invalidateQueries({ queryKey: territoryKeys.prospects() });
  };
}

export function useCreateZone() {
  const changed = useZoneChanged();
  return useMutation({ mutationFn: (input: ZoneInput) => createZone(input), onSuccess: changed });
}

export function useAdoptZones() {
  const changed = useZoneChanged();
  return useMutation({ mutationFn: (input: ZoneAdoptInput) => adoptZones(input), onSuccess: changed });
}

export function useUpdateZone() {
  const changed = useZoneChanged();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ZoneInput> }) => updateZone(id, input),
    onSuccess: changed,
  });
}

export function useDeleteZone() {
  const changed = useZoneChanged();
  return useMutation({ mutationFn: (id: string) => deleteZone(id), onSuccess: changed });
}

export function useRoutes(params: { page: number; size: number; mine: boolean }, enabled = true) {
  return useQuery({
    queryKey: territoryKeys.routeList(params),
    queryFn: () => listRoutes(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: retryTransient,
    enabled,
  });
}

/** An open route never calls the routing service: it reads what was stored. */
export function useRoute(id: string | null) {
  return useQuery({
    queryKey: territoryKeys.route(id ?? ""),
    queryFn: () => getRoute(id as string),
    staleTime: 60_000,
    retry: retryTransient,
    enabled: id !== null,
  });
}

function useStoreRoute() {
  const client = useQueryClient();
  return (detail: RouteDetail) => {
    client.setQueryData(territoryKeys.route(detail.id), detail);
    void client.invalidateQueries({ queryKey: [...territoryKeys.routes(), "list"] });
  };
}

export function useCreateRoute() {
  const store = useStoreRoute();
  return useMutation({ mutationFn: (input: RouteCreateInput) => createRoute(input), onSuccess: store });
}

export function useUpdateRoute() {
  const store = useStoreRoute();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RouteUpdateInput }) => updateRoute(id, input),
    onSuccess: store,
  });
}

export function useComputeRoute() {
  const store = useStoreRoute();
  return useMutation({
    mutationFn: ({ id, optimize }: { id: string; optimize: boolean }) => computeRoute(id, optimize),
    onSuccess: store,
  });
}

export function usePatchStop(routeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, patch }: { stopId: string; patch: StopPatch }) => patchStop(routeId, stopId, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: territoryKeys.routes() });
      // The stop's result is also the prospect's.
      void client.invalidateQueries({ queryKey: territoryKeys.prospects() });
    },
  });
}

export function useDeleteRoute() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: territoryKeys.route(id) });
      void client.invalidateQueries({ queryKey: [...territoryKeys.routes(), "list"] });
    },
  });
}
