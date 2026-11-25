import { apiFetch } from "@/shared/lib/api-client";

import type {
  BranchRule,
  BranchRuleInput,
  CostChange,
  CostParameter,
  CostSettings,
  CostSettingsPermissions,
} from "../types/cost-settings.types";

const BASE = "/cost-settings";

export function getCostSettingsPermissions(): Promise<CostSettingsPermissions> {
  return apiFetch<CostSettingsPermissions>(`${BASE}/permissions`);
}

export function getCostSettings(): Promise<CostSettings> {
  return apiFetch<CostSettings>(BASE);
}

/** Only the values that change. 422 with the reason when one is out of range or nothing changes. */
export function updateParameters(values: Record<string, number>, note: string | null): Promise<CostParameter[]> {
  return apiFetch<CostParameter[]>(`${BASE}/parameters`, { method: "PUT", body: { values, ...(note ? { note } : {}) } });
}

/** 409 when the supplier already has a rule. */
export function createBranchRule(input: BranchRuleInput): Promise<BranchRule> {
  return apiFetch<BranchRule>(`${BASE}/branch-rules`, { method: "POST", body: input });
}

/** Sends only what changes; `{ is_active: false }` turns the rule off. */
export function updateBranchRule(id: string, changes: Partial<BranchRuleInput>): Promise<BranchRule> {
  return apiFetch<BranchRule>(`${BASE}/branch-rules/${encodeURIComponent(id)}`, { method: "PATCH", body: changes });
}

export function deleteBranchRule(id: string): Promise<void> {
  return apiFetch<void>(`${BASE}/branch-rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listCostChanges(limit = 200): Promise<CostChange[]> {
  return apiFetch<CostChange[]>(`${BASE}/changes`, { query: { limit } });
}
