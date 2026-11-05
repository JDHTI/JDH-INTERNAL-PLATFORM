import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type {
  MasterActiveFilter,
  MasterDetailDto,
  MasterRecordPageDto,
  MasterRecordParams,
  MasterSummaryDto,
} from "../types/master.types";

const activeQuery = (active: MasterActiveFilter) => (active === "all" ? undefined : String(active === "active"));

/** The masters the person may read; `area` narrows them to the ones that area has on. */
export async function listMasters(area?: string): Promise<MasterSummaryDto[]> {
  return apiFetch<MasterSummaryDto[]>("/masters", { query: { area } });
}

export async function getMaster(slug: string): Promise<MasterDetailDto> {
  return apiFetch<MasterDetailDto>(`/masters/${encodeURIComponent(slug)}`);
}

export async function listMasterRecords({
  slug,
  q,
  active,
  offset,
  limit,
}: MasterRecordParams): Promise<MasterRecordPageDto> {
  return apiFetch<MasterRecordPageDto>(`/masters/${encodeURIComponent(slug)}/records`, {
    query: { q, is_active: activeQuery(active), offset, limit },
  });
}

/** Excel with the fields the person may see, up to 100.000 rows. */
export async function downloadMaster(slug: string, active: MasterActiveFilter): Promise<void> {
  return apiDownload(`/masters/${encodeURIComponent(slug)}/records.xlsx`, {
    query: { is_active: activeQuery(active) },
    fallbackName: `${slug}.xlsx`,
  });
}
