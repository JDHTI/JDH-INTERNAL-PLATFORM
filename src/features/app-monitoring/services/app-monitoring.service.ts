import { apiFetch } from "@/shared/lib/api-client";

import type {
  Aplicativo,
  AplicativoInput,
  AplicativosOverview,
  Board,
  Chequeo,
  ChecksParams,
  Page,
} from "../types/app-monitoring.types";

const BASE = "/app-monitoring";

export async function getBoard(): Promise<Board> {
  return apiFetch<Board>("/monitoring/board");
}

export async function getOverview(): Promise<AplicativosOverview> {
  return apiFetch<AplicativosOverview>(`${BASE}/overview`);
}

export async function getApplication(id: string): Promise<Aplicativo> {
  return apiFetch<Aplicativo>(`${BASE}/applications/${encodeURIComponent(id)}`);
}

/** 409 when the slug is taken; 422 when `url_base` carries a path. */
export async function createApplication(input: AplicativoInput): Promise<Aplicativo> {
  return apiFetch<Aplicativo>(`${BASE}/applications`, { method: "POST", body: input });
}

/** Only the fields sent change. */
export async function updateApplication(id: string, input: Partial<AplicativoInput>): Promise<Aplicativo> {
  return apiFetch<Aplicativo>(`${BASE}/applications/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}

/** Takes the check history with it. */
export async function deleteApplication(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/applications/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Checks it now, even when disabled, and answers with the application updated. */
export async function checkApplication(id: string): Promise<Aplicativo> {
  return apiFetch<Aplicativo>(`${BASE}/applications/${encodeURIComponent(id)}/check`, { method: "POST" });
}

/** Newest first; without dates the API takes today. */
export async function listChecks(id: string, params: ChecksParams): Promise<Page<Chequeo>> {
  return apiFetch<Page<Chequeo>>(`${BASE}/applications/${encodeURIComponent(id)}/checks`, { query: { ...params } });
}

/** 202 once the cycle is queued; 409 with a Spanish `detail` when the background checks are off. */
export async function requestCheckCycle(): Promise<{ encolado: boolean }> {
  return apiFetch<{ encolado: boolean }>(`${BASE}/check`, { method: "POST" });
}
