"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  getEmployee,
  getMyEmployee,
  getSyncStatus,
  listAdminEmployees,
  listAdminSites,
  listBirthdays,
  listEmployees,
  listNewHires,
  listSites,
  listSyncRuns,
  listTeam,
} from "../services/directory.service";
import { DIRECTORY_PAGE_SIZE } from "../types/directory.types";

export const directoryKeys = {
  all: ["directory"] as const,
  employees: (q: string, siteId: string, page: number) =>
    [...directoryKeys.all, "employees", { q, siteId, page }] as const,
  employee: (id: string) => [...directoryKeys.all, "employee", id] as const,
  team: (id: string) => [...directoryKeys.all, "team", id] as const,
  me: () => [...directoryKeys.all, "me"] as const,
  birthdays: (month: number) => [...directoryKeys.all, "birthdays", month] as const,
  newHires: (limit: number) => [...directoryKeys.all, "new-hires", limit] as const,
  sites: () => [...directoryKeys.all, "sites"] as const,
  admin: {
    all: () => [...directoryKeys.all, "admin"] as const,
    employees: (filters: object) => [...directoryKeys.all, "admin", "employees", filters] as const,
    sites: () => [...directoryKeys.all, "admin", "sites"] as const,
    sync: () => [...directoryKeys.all, "admin", "sync"] as const,
    runs: () => [...directoryKeys.all, "admin", "runs"] as const,
  },
};

// No session, no access, not public and bad input are answers, not glitches.
const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) &&
  count < 1;

/** The directory changes once a night: a minute of freshness is plenty. */
const STALE = 60_000;

export function useEmployees(q: string, siteId: string, page: number) {
  return useQuery({
    queryKey: directoryKeys.employees(q, siteId, page),
    queryFn: () =>
      listEmployees({ q: q || undefined, siteId: siteId || undefined, page, size: DIRECTORY_PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: directoryKeys.employee(id),
    queryFn: () => getEmployee(id),
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useTeam(id: string, limit = 6) {
  return useQuery({
    queryKey: directoryKeys.team(id),
    queryFn: () => listTeam(id, limit),
    staleTime: STALE,
    retry: retryTransient,
  });
}

/** A 404 is normal (dev user, or before the first sync): callers fall back, never block. */
export function useMyEmployee() {
  return useQuery({
    queryKey: directoryKeys.me(),
    queryFn: getMyEmployee,
    staleTime: 5 * STALE,
    retry: false,
  });
}

export function useBirthdays(month: number) {
  return useQuery({
    queryKey: directoryKeys.birthdays(month),
    queryFn: () => listBirthdays(month),
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useNewHires(limit = 6) {
  return useQuery({
    queryKey: directoryKeys.newHires(limit),
    queryFn: () => listNewHires(limit),
    staleTime: STALE,
    retry: retryTransient,
  });
}

export function useSites() {
  return useQuery({
    queryKey: directoryKeys.sites(),
    queryFn: listSites,
    staleTime: 5 * STALE,
    retry: retryTransient,
  });
}

export function useAdminEmployees(filters: {
  q: string;
  siteId: string;
  includeHidden: boolean;
  includeInactive: boolean;
  page: number;
}) {
  return useQuery({
    queryKey: directoryKeys.admin.employees(filters),
    queryFn: () =>
      listAdminEmployees({
        ...filters,
        q: filters.q || undefined,
        siteId: filters.siteId || undefined,
        size: DIRECTORY_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
    retry: retryTransient,
  });
}

export function useAdminSites() {
  return useQuery({
    queryKey: directoryKeys.admin.sites(),
    queryFn: listAdminSites,
    retry: retryTransient,
  });
}

/** Polls while a sync runs, so the card settles on its own when it ends. */
export function useSyncStatus() {
  return useQuery({
    queryKey: directoryKeys.admin.sync(),
    queryFn: getSyncStatus,
    retry: retryTransient,
    refetchInterval: (query) => (query.state.data?.running ? 5_000 : false),
  });
}

export function useSyncRuns(limit = 20) {
  return useQuery({
    queryKey: directoryKeys.admin.runs(),
    queryFn: () => listSyncRuns(limit),
    retry: retryTransient,
  });
}
