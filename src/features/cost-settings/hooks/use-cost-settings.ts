"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  createBranchRule,
  deleteBranchRule,
  getCostSettings,
  getCostSettingsPermissions,
  updateBranchRule,
  updateParameters,
} from "../services/cost-settings.service";
import type { BranchRuleInput } from "../types/cost-settings.types";

export const costSettingsKeys = {
  all: ["cost-settings"] as const,
  permissions: () => [...costSettingsKeys.all, "permissions"] as const,
  settings: () => [...costSettingsKeys.all, "settings"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useCostSettingsPermissions() {
  return useQuery({
    queryKey: costSettingsKeys.permissions(),
    queryFn: getCostSettingsPermissions,
    retry: retryTransient,
    staleTime: 5 * 60_000,
  });
}

export function useCostSettings(enabled = true) {
  return useQuery({ queryKey: costSettingsKeys.settings(), queryFn: getCostSettings, retry: retryTransient, enabled });
}

/** Every write changes the history too, so the whole screen is read again. */
function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: costSettingsKeys.settings() });
}

export function useUpdateParameters() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ values, note }: { values: Record<string, number>; note: string | null }) => updateParameters(values, note),
    onSettled: invalidate,
  });
}

export function useSaveBranchRule() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: Partial<BranchRuleInput> }) =>
      id ? updateBranchRule(id, input) : createBranchRule(input as BranchRuleInput),
    onSettled: invalidate,
  });
}

export function useDeleteBranchRule() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteBranchRule, onSettled: invalidate });
}
