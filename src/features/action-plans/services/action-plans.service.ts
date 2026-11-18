import { apiDownload, apiFetch, type Query } from "@/shared/lib/api-client";

import type {
  ActivityInput,
  CauseInput,
  CorrectionInput,
  Effective,
  PlanCatalog,
  PlanDetail,
  PlanFilters,
  PlanHeaderInput,
  PlanIndicators,
  PlanPage,
  PlanPermissions,
  UploadResult,
} from "../types/action-plans.types";

const BASE = "/action-plans";
const planPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

function filterQuery(filters: PlanFilters): Query {
  return {
    origin: filters.origin,
    process_id: filters.process_id,
    action_type: filters.action_type,
    status: filters.status,
    effectiveness: filters.effectiveness,
    city: filters.city,
    year: filters.year,
    month: filters.month,
    case_id: filters.case_id,
    q: filters.q,
    mine: filters.mine,
    overdue: filters.overdue,
  };
}

/** Never a 403: without the module both are false. */
export function getPermissions(): Promise<PlanPermissions> {
  return apiFetch<PlanPermissions>(`${BASE}/permissions`);
}

export function getCatalog(): Promise<PlanCatalog> {
  return apiFetch<PlanCatalog>(`${BASE}/catalog`, { query: { include_inactive: true } });
}

export function listPlans(filters: PlanFilters, page: number, size: number): Promise<PlanPage> {
  return apiFetch<PlanPage>(BASE, { query: { ...filterQuery(filters), page, size } });
}

export function getIndicators(filters: PlanFilters): Promise<PlanIndicators> {
  return apiFetch<PlanIndicators>(`${BASE}/indicators`, { query: filterQuery(filters) });
}

/** The matrix in the layout of the P.04.F.02 Excel. */
export function exportPlans(filters: PlanFilters): Promise<void> {
  return apiDownload(`${BASE}/export`, {
    query: filterQuery(filters),
    fallbackName: "P.04.F.02 Seguimiento plan de acción.xlsx",
  });
}

export function getPlan(id: string): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(planPath(id));
}

export function createPlan(input: PlanHeaderInput): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(BASE, { method: "POST", body: input });
}

/** A corrective action already filled from a PQRSF case. */
export function createPlanFromCase(caseId: string): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${BASE}/from-case/${encodeURIComponent(caseId)}`, { method: "POST" });
}

export function updatePlan(id: string, input: PlanHeaderInput): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(planPath(id), { method: "PATCH", body: input });
}

export function deletePlan(id: string): Promise<void> {
  return apiFetch<void>(planPath(id), { method: "DELETE" });
}

// A section is replaced whole: a row with its `id` keeps its progress and rating.

export function replaceCorrections(id: string, rows: CorrectionInput[]): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/corrections`, { method: "PUT", body: rows });
}

export function replaceCauses(id: string, rows: CauseInput[]): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/causes`, { method: "PUT", body: rows });
}

export function replaceActivities(id: string, rows: ActivityInput[]): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/activities`, { method: "PUT", body: rows });
}

export function markDone(
  id: string,
  rowId: string,
  input: { done: boolean; evidence_note?: string | null }
): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/rows/${encodeURIComponent(rowId)}/done`, {
    method: "POST",
    body: input,
  });
}

export function rateActivity(
  id: string,
  activityId: string,
  input: { effective: Effective; note?: string | null }
): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/activities/${encodeURIComponent(activityId)}/rating`, {
    method: "POST",
    body: input,
  });
}

/** Only for an action whose effectiveness is «no»: same number, next attempt. */
export function openNextAttempt(id: string): Promise<PlanDetail> {
  return apiFetch<PlanDetail>(`${planPath(id)}/next-attempt`, { method: "POST" });
}

export function uploadEvidence(id: string, files: File[], rowId?: string): Promise<UploadResult> {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  if (rowId) body.append("row_id", rowId);
  return apiFetch<UploadResult>(`${planPath(id)}/files`, { method: "POST", body });
}

export function downloadEvidence(id: string, fileId: string, filename: string): Promise<void> {
  return apiDownload(`${planPath(id)}/files/${encodeURIComponent(fileId)}/download`, {
    fallbackName: filename,
  });
}

export function deleteEvidence(id: string, fileId: string): Promise<void> {
  return apiFetch<void>(`${planPath(id)}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}
