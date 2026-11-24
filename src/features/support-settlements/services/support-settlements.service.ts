import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  BreakdownBy,
  BreakdownRow,
  CostBasis,
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

/** Open: without access every flag is false, not a 403. The only endpoint without a cost basis. */
export function getSettlementPermissions(): Promise<SettlementPermissions> {
  return apiFetch<SettlementPermissions>(`${BASE}/permissions`);
}

export function listSettlementPeriods(basis: CostBasis): Promise<SettlementPeriod[]> {
  return apiFetch<SettlementPeriod[]>(`${BASE}/periods`, { query: { cost_basis: basis } });
}

/** 404 while the month has not been calculated on that basis. */
export function getSettlementSummary(period: Period, basis: CostBasis): Promise<SettlementSummary> {
  return apiFetch<SettlementSummary>(month(period), { query: { cost_basis: basis } });
}

export function getSettlementReferences(period: Period, basis: CostBasis, supplierCode: string | null): Promise<SettlementReferences> {
  return apiFetch<SettlementReferences>(`${month(period)}/references`, {
    query: { cost_basis: basis, supplier_code: supplierCode },
  });
}

export function listSettlementLines(period: Period, basis: CostBasis, params: LineParams): Promise<SettlementLinePage> {
  return apiFetch<SettlementLinePage>(`${month(period)}/lines`, {
    query: {
      cost_basis: basis,
      supplier_code: params.supplierCode,
      sku: params.sku,
      status: params.status,
      page: params.page,
      size: params.size,
    },
  });
}

export function getSettlementBreakdown(
  period: Period,
  basis: CostBasis,
  by: BreakdownBy,
  supplierCode: string | null
): Promise<BreakdownRow[]> {
  return apiFetch<BreakdownRow[]>(`${month(period)}/breakdown`, {
    query: { cost_basis: basis, by, supplier_code: supplierCode },
  });
}

/** The month's workbook on one basis: Resumen (with the basis), Detalle ventas and No liquidados. */
export function downloadSettlement(period: Period, basis: CostBasis, supplierCode: string | null): Promise<void> {
  return apiDownload(`${month(period)}/export`, {
    query: { cost_basis: basis, supplier_code: supplierCode },
    fallbackName: `liquidacion-apoyos-${period}-${basis}${supplierCode ? `-${supplierCode}` : ""}.xlsx`,
  });
}

/**
 * Reads the month from the DWH once and recalculates BOTH bases that are not closed: 1 to 3
 * minutes. Returns the basis asked for; 409 only when that one is closed.
 */
export function recalculateSettlement(period: Period, basis: CostBasis): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/recalculate`, { method: "POST", query: { cost_basis: basis } });
}

/** Only that basis, of a finished month (422 otherwise): calculated one last time and frozen. */
export function closeSettlement(period: Period, basis: CostBasis): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/close`, { method: "POST", query: { cost_basis: basis } });
}

/** Only that basis. BI's leader or an administrator; 403 for anyone else. */
export function reopenSettlement(period: Period, basis: CostBasis): Promise<Settlement> {
  return apiFetch<Settlement>(`${month(period)}/reopen`, { method: "POST", query: { cost_basis: basis } });
}
