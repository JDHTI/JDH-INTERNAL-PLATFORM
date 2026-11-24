import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  BreakdownBy,
  BreakdownRow,
  LineParams,
  Period,
  Settlement,
  SettlementLinePage,
  SettlementPeriod,
  SettlementPermissions,
  SettlementReferences,
  SettlementSummary,
} from "../types/support-settlements.types";

const BASE = "/support-settlements";
const month = (period: Period) => `${BASE}/${encodeURIComponent(period)}`;

/** Open: without access every flag is false, not a 403. */
export function getSettlementPermissions(): Promise<SettlementPermissions> {
  return apiFetch<SettlementPermissions>(`${BASE}/permissions`);
}

export function listSettlementPeriods(): Promise<SettlementPeriod[]> {
  return apiFetch<SettlementPeriod[]>(`${BASE}/periods`);
}

/** 404 while the month has not been calculated. */
export function getSettlementSummary(period: Period): Promise<SettlementSummary> {
  return apiFetch<SettlementSummary>(month(period));
}

export function getSettlementReferences(period: Period, supplierCode: string | null): Promise<SettlementReferences> {
  return apiFetch<SettlementReferences>(`${month(period)}/references`, { query: { supplier_code: supplierCode } });
}

export function listSettlementLines(period: Period, params: LineParams): Promise<SettlementLinePage> {
  return apiFetch<SettlementLinePage>(`${month(period)}/lines`, {
    query: {
      supplier_code: params.supplierCode,
      sku: params.sku,
      status: params.status,
      page: params.page,
      size: params.size,
    },
  });
}

export function getSettlementBreakdown(period: Period, by: BreakdownBy, supplierCode: string | null): Promise<BreakdownRow[]> {
  return apiFetch<BreakdownRow[]>(`${month(period)}/breakdown`, { query: { by, supplier_code: supplierCode } });
}

/** The month's workbook: Resumen, Detalle ventas and No liquidados; one supplier or all. */
export function downloadSettlement(period: Period, supplierCode: string | null): Promise<void> {
  return apiDownload(`${month(period)}/export`, {
    query: { supplier_code: supplierCode },
    fallbackName: `liquidacion-apoyos-${period}${supplierCode ? `-${supplierCode}` : ""}.xlsx`,
  });
}

/** Reads the month from the DWH again: 1 to 3 minutes. 409 when the month is closed. */
export function recalculateSettlement(period: Period): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/recalculate`, { method: "POST" });
}

/** A finished month only (422 otherwise): calculated one last time and frozen. */
export function closeSettlement(period: Period): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/close`, { method: "POST" });
}

/** BI's leader or an administrator; 403 for anyone else. */
export function reopenSettlement(period: Period): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/reopen`, { method: "POST" });
}
