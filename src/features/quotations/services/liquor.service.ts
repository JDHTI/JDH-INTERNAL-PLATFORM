import { apiDownload, apiFetch } from "@/shared/lib/api-client";

import type { LiquorChangeInput, LiquorOverview, LiquorUpdate } from "../types/liquor.types";

const BASE = "/price-list-updates/liquor-taxes";
const one = (id: string) => `${BASE}/updates/${encodeURIComponent(id)}`;

/** Every active liquor with its value per regional and per list, and the liquors without a key. */
export function getLiquorOverview(): Promise<LiquorOverview> {
  return apiFetch<LiquorOverview>(BASE);
}

export function listLiquorUpdates(): Promise<LiquorUpdate[]> {
  return apiFetch<LiquorUpdate[]>(`${BASE}/updates`);
}

/** New national and Coast values; the change waits for validation. */
export function createLiquorUpdate(changes: LiquorChangeInput[], note: string): Promise<LiquorUpdate> {
  return apiFetch<LiquorUpdate>(`${BASE}/updates`, { method: "POST", body: { changes, note: note.trim() || null } });
}

/** Reads the prices it writes from every active list and fixes them. Only who validates. */
export function validateLiquorUpdate(id: string, version: number, activationDate: string): Promise<LiquorUpdate> {
  return apiFetch<LiquorUpdate>(`${one(id)}/validate`, { method: "POST", body: { version, activation_date: activationDate } });
}

/** Turned down by who validates (with a reason), or withdrawn by its author. */
export function returnLiquorUpdate(id: string, version: number, note: string): Promise<LiquorUpdate> {
  return apiFetch<LiquorUpdate>(`${one(id)}/return`, { method: "POST", body: { version, note: note.trim() || null } });
}

/** Loaded in SIESA: the margin master takes the new values. */
export function markLiquorUploaded(id: string, version: number): Promise<LiquorUpdate> {
  return apiFetch<LiquorUpdate>(`${one(id)}/uploaded`, { method: "POST", body: { version } });
}

/** SIESA's two pages: each list's price (unchanged) and its new value tax. */
export function downloadLiquorFile(id: string, format: "xlsx" | "txt"): Promise<void> {
  return apiDownload(`${one(id)}/file.${format}`, {
    fallbackName: format === "xlsx" ? "IMPUESTO LICOR LISTAS.xlsx" : "impuesto-licor-listas.txt",
  });
}
