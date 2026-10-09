import { apiFetch } from "@/shared/lib/api-client";

import { findCommercialMaster } from "../config/masters.config";
import type { CommercialMasterParams, CommercialPage } from "../types/commercial-master.types";

/** Rows stay untyped here: the table is driven by each master's column list. */
export type MasterRow = Record<string, unknown>;

export async function listCommercialMaster({
  master,
  q,
  page,
  size,
}: CommercialMasterParams): Promise<CommercialPage<MasterRow>> {
  const def = findCommercialMaster(master);
  if (!def) throw new Error(`Maestro desconocido: ${master}`);
  return apiFetch<CommercialPage<MasterRow>>(def.endpoint, { query: { q, page, size } });
}
