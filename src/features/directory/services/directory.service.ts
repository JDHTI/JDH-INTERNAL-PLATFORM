import { apiFetch } from "@/shared/lib/api-client";

import type {
  AdminEmployee,
  Birthdays,
  EmployeeChanges,
  EmployeeDetail,
  EmployeeSummary,
  Items,
  NewHireSummary,
  Page,
  Site,
  SiteChanges,
  SyncRun,
  SyncStatus,
} from "../types/directory.types";

const id = encodeURIComponent;

// ── Everyone signed in ──

export function listEmployees(filters: {
  q?: string;
  siteId?: string;
  page: number;
  size: number;
}): Promise<Page<EmployeeSummary>> {
  return apiFetch("/directory/employees", {
    query: { q: filters.q, site_id: filters.siteId, page: filters.page, size: filters.size },
  });
}

export function getMyEmployee(): Promise<EmployeeDetail> {
  return apiFetch("/directory/employees/me");
}

export function getEmployee(employeeId: string): Promise<EmployeeDetail> {
  return apiFetch(`/directory/employees/${id(employeeId)}`);
}

export function listTeam(employeeId: string, limit: number): Promise<Items<EmployeeSummary>> {
  return apiFetch(`/directory/employees/${id(employeeId)}/team`, { query: { limit } });
}

export function listBirthdays(month: number): Promise<Birthdays> {
  return apiFetch("/directory/employees/birthdays", { query: { month } });
}

export function listNewHires(limit: number): Promise<Items<NewHireSummary>> {
  return apiFetch("/directory/employees/new-hires", { query: { limit } });
}

export function listSites(): Promise<Items<Site>> {
  return apiFetch("/directory/sites");
}

// ── Platform administrators ──

export function listAdminEmployees(filters: {
  q?: string;
  siteId?: string;
  includeHidden: boolean;
  includeInactive: boolean;
  page: number;
  size: number;
}): Promise<Page<AdminEmployee>> {
  return apiFetch("/directory/admin/employees", {
    query: {
      q: filters.q,
      site_id: filters.siteId,
      // `buildUrl` drops `false`, and the API defaults include_hidden to true.
      include_hidden: String(filters.includeHidden),
      include_inactive: String(filters.includeInactive),
      page: filters.page,
      size: filters.size,
    },
  });
}

export function createEmployee(
  body: EmployeeChanges & { full_name: string }
): Promise<AdminEmployee> {
  return apiFetch("/directory/admin/employees", { method: "POST", body });
}

export function updateEmployee(employeeId: string, body: EmployeeChanges): Promise<AdminEmployee> {
  return apiFetch(`/directory/admin/employees/${id(employeeId)}`, { method: "PATCH", body });
}

export function deleteEmployee(employeeId: string): Promise<void> {
  return apiFetch(`/directory/admin/employees/${id(employeeId)}`, { method: "DELETE" });
}

export function requestSync(): Promise<{ run_id: string }> {
  return apiFetch("/directory/admin/sync", { method: "POST" });
}

export function getSyncStatus(): Promise<SyncStatus> {
  return apiFetch("/directory/admin/sync");
}

export function listSyncRuns(limit: number): Promise<Items<SyncRun>> {
  return apiFetch("/directory/admin/sync/runs", { query: { limit } });
}

export function listAdminSites(): Promise<Items<Site>> {
  return apiFetch("/directory/admin/sites", { query: { include_inactive: "true" } });
}

export function createSite(body: {
  name: string;
  address: string | null;
  is_active: boolean;
}): Promise<Site> {
  return apiFetch("/directory/admin/sites", { method: "POST", body });
}

export function updateSite(siteId: string, body: SiteChanges): Promise<Site> {
  return apiFetch(`/directory/admin/sites/${id(siteId)}`, { method: "PATCH", body });
}

export function deleteSite(siteId: string): Promise<void> {
  return apiFetch(`/directory/admin/sites/${id(siteId)}`, { method: "DELETE" });
}
