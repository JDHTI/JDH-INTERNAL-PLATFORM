import { API_URL } from "@/shared/lib/api-client";

/*
 * Wire types of the API's `directory` module, field for field
 * (internal-platform-api app/modules/directory/presentation/schemas.py).
 */

export type Visibility = "auto" | "shown" | "hidden";

export interface SiteRef {
  id: string;
  name: string;
}

export interface EmployeeRef {
  id: string;
  full_name: string;
  position: string;
}

export interface EmployeeSummary {
  id: string;
  full_name: string;
  email: string | null;
  /** Official SIESA title; empty until the import or the DWH fills it. */
  position: string;
  /** Title as Entra has it. */
  job_title: string | null;
  department: string | null;
  site: SiteRef | null;
  is_manager: boolean;
  has_photo: boolean;
  /** Goes in the photo URL as `v`; null means there is no photo. */
  photo_version: string | null;
}

export interface BirthdaySummary extends EmployeeSummary {
  birth_day: number;
}

export interface NewHireSummary extends EmployeeSummary {
  hire_date: string;
}

export interface EmployeeDetail extends EmployeeSummary {
  user_id: string | null;
  hire_date: string | null;
  birth_month: number | null;
  birth_day: number | null;
  manager: EmployeeRef | null;
}

export interface AdminEmployee extends EmployeeDetail {
  entra_object_id: string | null;
  is_synced: boolean;
  is_active: boolean;
  visibility: Visibility;
  auto_visible: boolean;
  is_public: boolean;
  account_enabled: boolean | null;
  user_type: string | null;
  office_location: string | null;
  birth_date: string | null;
  dwh_synced_at: string | null;
  synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Site {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  employee_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SyncRun {
  id: string;
  trigger: "manual" | "scheduled";
  status: "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
  counts: Record<string, number>;
  error_code: string | null;
  error_message: string | null;
  triggered_by: string | null;
}

export interface SyncStatus {
  enabled: boolean;
  /** "HH:MM" in `timezone`. */
  scheduled_at: string;
  timezone: string;
  next_run_at: string | null;
  running: boolean;
  latest: SyncRun | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface Items<T> {
  items: T[];
}

export interface Birthdays {
  month: number;
  items: BirthdaySummary[];
}

/** Only the fields sent are changed. Entra owns some of them on synced people. */
export interface EmployeeChanges {
  full_name?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  site_id?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
  manager_id?: string | null;
  visibility?: Visibility | null;
  is_manager?: boolean | null;
  is_active?: boolean | null;
}

export interface SiteChanges {
  name?: string;
  address?: string | null;
  is_active?: boolean;
}

export interface EmployeeFilters {
  q: string;
  siteId: string;
  page: number;
}

export const DIRECTORY_PAGE_SIZE = 24;

export const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * Always with `v`: a versioned photo is cached for a year, which keeps it out of
 * the 600-per-minute budget the whole office shares.
 */
export function employeePhotoUrl(
  employee: Pick<EmployeeSummary, "id" | "photo_version">,
  size: 96 | 432 = 96
): string | null {
  if (!employee.photo_version) return null;
  const v = encodeURIComponent(employee.photo_version);
  return `${API_URL}/directory/employees/${encodeURIComponent(employee.id)}/photo?size=${size}&v=${v}`;
}

export function hasPosition(employee: Pick<EmployeeSummary, "position" | "job_title">): boolean {
  return Boolean(employee.position.trim() || employee.job_title?.trim());
}

/** The SIESA title, or Entra's while the import has not run. */
export function employeePosition(employee: Pick<EmployeeSummary, "position" | "job_title">): string {
  return employee.position.trim() || employee.job_title?.trim() || "Sin cargo registrado";
}

/** "14 de marzo", never the year. */
export function formatDayMonth(day: number, month: number): string {
  return `${day} de ${MONTH_NAMES[month - 1]}`;
}
