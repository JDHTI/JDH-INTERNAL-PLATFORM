"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { getPublishStatus, listFailedEvents, reconcileNow, retryFailedEvents } from "../services/dwh-publish.service";

export const dwhPublishKeys = {
  all: ["dwh-publish"] as const,
  status: () => [...dwhPublishKeys.all, "status"] as const,
  failed: () => [...dwhPublishKeys.all, "failed"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && count < 1;

/** Refreshes every 30 s while something waits in the queue, so it drains on screen. */
export function usePublishStatus(enabled: boolean) {
  return useQuery({
    queryKey: dwhPublishKeys.status(),
    queryFn: getPublishStatus,
    enabled,
    retry: retryTransient,
    refetchInterval: (query) => (query.state.data?.topics.some((topic) => topic.pending > 0) ? 30_000 : false),
  });
}

export function useFailedEvents(enabled: boolean) {
  return useQuery({
    queryKey: dwhPublishKeys.failed(),
    queryFn: () => listFailedEvents(100),
    enabled,
    retry: retryTransient,
  });
}

export function useRetryFailed() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => retryFailedEvents(ids),
    onSettled: () => client.invalidateQueries({ queryKey: dwhPublishKeys.all }),
  });
}

export function useReconcile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: reconcileNow,
    onSettled: () => client.invalidateQueries({ queryKey: dwhPublishKeys.all }),
  });
}
