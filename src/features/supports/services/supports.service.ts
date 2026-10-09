import { apiFetch } from "@/shared/lib/api-client";

import type {
  FilterField,
  SupplierSupport,
  SupportCatalogs,
  SupportConflict,
  SupportPage,
  SupportSearchBody,
} from "../types/support.types";

export async function searchSupports(body: SupportSearchBody): Promise<SupportPage> {
  return apiFetch<SupportPage>("/supplier-supports/search", { method: "POST", body });
}

export async function listFilterFields(): Promise<FilterField[]> {
  return apiFetch<FilterField[]>("/supplier-supports/search/fields");
}

export async function getSupportCatalogs(): Promise<SupportCatalogs> {
  return apiFetch<SupportCatalogs>("/supplier-supports/catalogs");
}

export async function getSupport(id: string): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}`);
}

export async function listSupportConflicts(id: string): Promise<SupportConflict[]> {
  return apiFetch<SupportConflict[]>(`/supplier-supports/${encodeURIComponent(id)}/conflicts`);
}
