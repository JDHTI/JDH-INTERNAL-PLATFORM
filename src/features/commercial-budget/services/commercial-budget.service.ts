import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  BudgetBoard,
  BudgetChange,
  BudgetFilters,
  BudgetItem,
  BudgetPeriod,
  BudgetPermissions,
  BudgetUploadReport,
  Period,
  RepBudget,
  SyncResult,
  VendorMasterResult,
  VendorMasterStatus,
  VendorMasterUpload,
} from "../types/commercial-budget.types";

const BASE = "/commercial-budget";
const month = (period: Period) => `${BASE}/${encodeURIComponent(period)}`;

function filterQuery(filters: BudgetFilters) {
  return {
    regional: filters.regional,
    business_unit: filters.business_unit,
    team: filters.team,
    salesperson: filters.salesperson,
    q: filters.q.trim() || undefined,
  };
}

/** Open: without access every flag is false, not a 403. */
export function getBudgetPermissions(): Promise<BudgetPermissions> {
  return apiFetch<BudgetPermissions>(`${BASE}/permissions`);
}

/** From the start of the budget up to next month, the newest first. */
export function listBudgetPeriods(): Promise<BudgetPeriod[]> {
  return apiFetch<BudgetPeriod[]>(`${BASE}/periods`);
}

export function getBudgetBoard(period: Period, filters: BudgetFilters): Promise<BudgetBoard> {
  return apiFetch<BudgetBoard>(month(period), { query: filterQuery(filters) });
}

/** 409 when the month is closed or a budget changed since read; 403 for a rep out of scope. */
export function updateBudgets(period: Period, items: BudgetItem[], note?: string): Promise<(RepBudget & { salesperson_code: string })[]> {
  return apiFetch(`${month(period)}/budgets`, { method: "PUT", body: { items, note: note || undefined } });
}

export function listBudgetChanges(period: Period, salespersonCode: string | null): Promise<BudgetChange[]> {
  return apiFetch<BudgetChange[]>(`${month(period)}/changes`, { query: { salesperson_code: salespersonCode, limit: 200 } });
}

/** The month's workbook with the reps of the person's scope. */
export function downloadBudgetTemplate(period: Period): Promise<void> {
  return apiDownload(`${month(period)}/budget-template`, { fallbackName: `presupuesto-comercial-${period}-plantilla.xlsx` });
}

/** A simulation unless `apply`: the same file is sent twice. */
export function uploadBudget(period: Period, file: File, apply: boolean, note: string): Promise<BudgetUploadReport> {
  const form = new FormData();
  form.append("file", file);
  if (note.trim()) form.append("note", note.trim());
  return apiFetch<BudgetUploadReport>(`${month(period)}/budget-upload`, { method: "POST", query: { apply }, body: form });
}

/** A finished month with its sales copied: 400 otherwise, 409 when already closed. */
export function closeBudgetPeriod(period: Period): Promise<BudgetPeriod> {
  return apiFetch<BudgetPeriod>(`${month(period)}/close`, { method: "POST" });
}

export function reopenBudgetPeriod(period: Period): Promise<BudgetPeriod> {
  return apiFetch<BudgetPeriod>(`${month(period)}/reopen`, { method: "POST" });
}

/** BI's template shape: groups by regional and team with their totals, with the same filters. */
export function downloadBudgetExport(period: Period, filters: BudgetFilters): Promise<void> {
  return apiDownload(`${month(period)}/export`, { query: filterQuery(filters), fallbackName: `presupuesto-comercial-${period}.xlsx` });
}

/** Copies the rep master and the sales from the DWH now: it can take tens of seconds. */
export function syncBudgetSales(): Promise<SyncResult> {
  return apiFetch<SyncResult>(`${BASE}/sync`, { method: "POST" });
}

const VENDOR_MASTER = "/vendor-master";

export function getVendorMasterStatus(): Promise<VendorMasterStatus> {
  return apiFetch<VendorMasterStatus>(`${VENDOR_MASTER}/status`);
}

export function downloadVendorMasterTemplate(): Promise<void> {
  return apiDownload(`${VENDOR_MASTER}/template`, { fallbackName: "Plantilla Maestro Vendedores JDH.xlsx" });
}

/** Forwarded to dwh-platform: 400 with its reason when it rejects the file, 503 when unreachable. */
export function uploadVendorMaster(file: File): Promise<VendorMasterResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<VendorMasterResult>(`${VENDOR_MASTER}/upload`, { method: "POST", body: form });
}

export function listVendorMasterUploads(limit = 20): Promise<VendorMasterUpload[]> {
  return apiFetch<VendorMasterUpload[]>(`${VENDOR_MASTER}/uploads`, { query: { limit } });
}
