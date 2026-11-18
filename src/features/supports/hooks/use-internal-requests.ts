"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveInternalRequest,
  createDirectRequest,
  createInternalRequest,
  getInternalRequest,
  getTargetMargins,
  listInternalRequests,
  rejectInternalRequest,
} from "../services/internal-requests.service";
import type {
  DirectRequestInput,
  InternalApproval,
  InternalRequestInput,
  InternalRequestParams,
} from "../types/internal-request.types";
import { supportKeys } from "./use-supports";

export const internalRequestKeys = {
  all: ["internal-support-requests"] as const,
  list: (scope: string, params: InternalRequestParams) => [...internalRequestKeys.all, "list", scope, params] as const,
  detail: (id: string, mine: boolean) => [...internalRequestKeys.all, "detail", id, { mine }] as const,
};

export function useInternalRequests(params: InternalRequestParams, enabled: boolean, scope: string) {
  return useQuery({
    queryKey: internalRequestKeys.list(scope, params),
    queryFn: () => listInternalRequests(params),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useInternalRequest(id: string, mine: boolean) {
  return useQuery({ queryKey: internalRequestKeys.detail(id, mine), queryFn: () => getInternalRequest(id, mine), retry: false });
}

/** Asked from a quotation: the quotation is refetched so its lines show the request. */
export function useCreateInternalRequest(quotationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: InternalRequestInput) => createInternalRequest(quotationId, input),
    retry: false,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: internalRequestKeys.all }),
        client.invalidateQueries({ queryKey: ["quotations", "detail", quotationId] }),
      ]);
    },
  });
}

/** Asked from the requests panel, with no quotation behind it. */
export function useCreateDirectRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: DirectRequestInput) => createDirectRequest(input),
    retry: false,
    onSettled: () => client.invalidateQueries({ queryKey: internalRequestKeys.all }),
  });
}

/** The current margin of each SKU for the customer; waits for a NIT and at least one SKU. */
export function useTargetMargins(customerNit: string | null, skus: string[]) {
  const sorted = [...new Set(skus)].sort();
  return useQuery({
    queryKey: [...internalRequestKeys.all, "target-margins", customerNit, sorted],
    queryFn: () => getTargetMargins(customerNit!, sorted),
    enabled: Boolean(customerNit) && sorted.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

type Decision ={ kind: "approve"; id: string; body: InternalApproval } | { kind: "reject"; id: string; body: { version: number; reason: string } };

/** An approval writes supports to the master, so the master's queries refresh too. */
export function useDecideInternalRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (decision: Decision) =>
      decision.kind === "approve" ? approveInternalRequest(decision.id, decision.body) : rejectInternalRequest(decision.id, decision.body),
    retry: false,
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: internalRequestKeys.all }),
        client.invalidateQueries({ queryKey: supportKeys.all }),
      ]);
    },
  });
}
