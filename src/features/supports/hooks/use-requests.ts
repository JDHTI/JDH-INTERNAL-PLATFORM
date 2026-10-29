"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, cancelJdh, createRequest, createRequestBatch, getJdhHistory, getRequest, listRequests, rejectRequest } from "../services/requests.service";
import type { BatchRequestItem, RequestParams } from "../types/request.types";
import { supportKeys } from "./use-supports";

export const requestKeys = { all: ["support-requests"] as const, detail: (id: string) => ["support-requests", "detail", id] as const };
export function useRequests(params: RequestParams, enabled: boolean, scope: string) {
  return useQuery({ queryKey: [...requestKeys.all, scope, params], queryFn: () => listRequests(params), enabled, retry: false });
}
export function useRequest(id: string | null, mine = false) {
  return useQuery({ queryKey: [...requestKeys.detail(id ?? ""), { mine }], queryFn: () => getRequest(id!, mine), enabled: !!id, retry: false });
}
export function useJdhHistory(id: string, enabled: boolean) {
  return useQuery({ queryKey: [...supportKeys.all, "history", id], queryFn: () => getJdhHistory(id), enabled, retry: false });
}
type Action = { kind: "create"; id: string; version: number; value: number; reason: string } | { kind: "approve"; id: string; version: number; support_version: number } | { kind: "reject" | "cancel"; id: string; version: number; reason: string };
export function useRequestAction() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (action: Action): Promise<unknown> => {
      const { id, version } = action;
      switch (action.kind) {
        case "create": return createRequest(id, { version, value: action.value, reason: action.reason });
        case "approve": return approveRequest(id, { version, support_version: action.support_version });
        case "reject": return rejectRequest(id, { version, reason: action.reason });
        case "cancel": return cancelJdh(id, { version, reason: action.reason });
      }
    },
    onSettled: async () => { await Promise.all([client.invalidateQueries({ queryKey: supportKeys.all }), client.invalidateQueries({ queryKey: requestKeys.all })]); },
  });
}

export function useBatchRequests() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (items: BatchRequestItem[]) => createRequestBatch(items), retry: false,
    onSettled: async () => { await Promise.all([client.invalidateQueries({ queryKey: supportKeys.all }), client.invalidateQueries({ queryKey: requestKeys.all })]); },
  });
}
