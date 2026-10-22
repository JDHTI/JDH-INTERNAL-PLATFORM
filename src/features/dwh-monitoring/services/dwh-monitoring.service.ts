import { apiFetch } from "@/shared/lib/api-client";

import type {
  EstadoCargaDwh,
  ExtractionParams,
  Extraccion,
  Frescura,
  FrescuraTabla,
  FreshnessTableParams,
  Horario,
  Items,
  Overview,
  Page,
  Secuencia,
  SecuenciaDetalle,
} from "../types/dwh-monitoring.types";

const BASE = "/dwh-monitoring";

/*
 * The API reads a local copy of the warehouse's `monitoreo` schema, never the
 * warehouse itself, so every one of these is cheap. Until the first load runs
 * they answer with empty lists and nulls, not with an error.
 */

export async function getOverview(): Promise<Overview> {
  return apiFetch<Overview>(`${BASE}/overview`);
}

export async function listSequences(): Promise<Items<Secuencia>> {
  return apiFetch<Items<Secuencia>>(`${BASE}/sequences`);
}

/** 404 when the warehouse has no sequence by that name. */
export async function getSequence(secuencia: string): Promise<SecuenciaDetalle> {
  return apiFetch<SecuenciaDetalle>(`${BASE}/sequences/${encodeURIComponent(secuencia)}`);
}

export async function getFreshness(): Promise<Frescura> {
  return apiFetch<Frescura>(`${BASE}/freshness`);
}

export async function listFreshnessTables({ estado, dominio, programacion, q }: FreshnessTableParams): Promise<Items<FrescuraTabla>> {
  return apiFetch<Items<FrescuraTabla>>(`${BASE}/freshness/tables`, { query: { estado, dominio, programacion, q } });
}

/** `fecha` is a Bogotá day, "YYYY-MM-DD"; left out, the API takes today. */
export async function getSchedule(fecha?: string): Promise<Horario> {
  return apiFetch<Horario>(`${BASE}/schedule`, { query: { fecha } });
}

/** Without dates the API takes the last 7 days. */
export async function listExtractions(params: ExtractionParams): Promise<Page<Extraccion>> {
  return apiFetch<Page<Extraccion>>(`${BASE}/extractions`, { query: { ...params } });
}

export async function getSyncStatus(): Promise<EstadoCargaDwh> {
  return apiFetch<EstadoCargaDwh>(`${BASE}/sync`);
}

/** 202 once the cycle is queued; 409 with a Spanish `detail` when the background load is off. */
export async function requestSync(): Promise<{ encolada: boolean }> {
  return apiFetch<{ encolada: boolean }>(`${BASE}/sync`, { method: "POST" });
}
