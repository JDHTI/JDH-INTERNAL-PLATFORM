import { apiFetch } from "@/shared/lib/api-client";

import type {
  MasterDetailDto,
  MasterRecordPageDto,
  MasterRecordParams,
  MasterSummaryDto,
} from "../types/master.types";

export async function listMasters(): Promise<MasterSummaryDto[]> {
  return apiFetch<MasterSummaryDto[]>("/masters");
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
    query: {
      q,
      is_active: active === "all" ? undefined : String(active === "active"),
      offset,
      limit,
    },
  });
}
