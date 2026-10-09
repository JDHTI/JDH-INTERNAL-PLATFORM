import { apiFetch } from "@/shared/lib/api-client";

import type {
  FilterField,
  SpecialCase,
  SpecialCaseInput,
  SpecialCasePage,
  SpecialCaseParams,
  SpecialCasePatch,
  SupplierSupport,
  SupportCatalogs,
  SupportConflict,
  SupportPage,
  SupportPatch,
  SupportSearchBody,
} from "../types/support.types";

export async function searchSupports(body: SupportSearchBody): Promise<SupportPage> {
  return apiFetch<SupportPage>("/supplier-supports/search", { method: "POST", body });
}

export async function listFilterFields(): Promise<FilterField[]> {
  return apiFetch<FilterField[]>("/supplier-supports/search/fields");
}

export async function getSupportPermissions(): Promise<{ can_manage: boolean }> {
  return apiFetch<{ can_manage: boolean }>("/supplier-supports/permissions");
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

/** 409 means the row changed since it was read; 403, that the user cannot write. */
export async function updateSupport(id: string, patch: SupportPatch): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function voidSupport(
  id: string,
  body: { version: number; reason: string }
): Promise<SupplierSupport> {
  return apiFetch<SupplierSupport>(`/supplier-supports/${encodeURIComponent(id)}/void`, {
    method: "POST",
    body,
  });
}

export async function listSpecialCases({ q, status, page, size }: SpecialCaseParams): Promise<SpecialCasePage> {
  return apiFetch<SpecialCasePage>("/supplier-special-cases", { query: { q, status, page, size } });
}

export async function createSpecialCase(input: SpecialCaseInput): Promise<SpecialCase> {
  return apiFetch<SpecialCase>("/supplier-special-cases", { method: "POST", body: input });
}

export async function updateSpecialCase(id: string, patch: SpecialCasePatch): Promise<SpecialCase> {
  return apiFetch<SpecialCase>(`/supplier-special-cases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}
