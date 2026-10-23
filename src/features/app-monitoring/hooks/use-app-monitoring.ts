"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  checkApplication,
  createApplication,
  deleteApplication,
  getApplication,
  getBoard,
  getOverview,
  listChecks,
  requestCheckCycle,
  updateApplication,
} from "../services/app-monitoring.service";
import type { Aplicativo, AplicativoInput, ChecksParams } from "../types/app-monitoring.types";

export const appMonKeys = {
  all: ["app-monitoring"] as const,
  board: () => [...appMonKeys.all, "board"] as const,
  overview: () => [...appMonKeys.all, "overview"] as const,
  application: (id: string) => [...appMonKeys.all, "application", id] as const,
  checks: (id: string, params: ChecksParams) => [...appMonKeys.all, "checks", id, params] as const,
};

/*
 * The API checks every application once a minute, so the screens that answer
 * "is it up now" poll at the same pace while they are open. React Query
 * pauses it while the tab is in the background.
 */
const LIVE = 60_000;

/** A cycle runs every check in parallel, each capped by its timeout (10 s by default). */
const CYCLE_SETTLES_MS = 12_000;

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

export function useBoard() {
  return useQuery({ queryKey: appMonKeys.board(), queryFn: getBoard, retry: retryTransient, refetchInterval: LIVE });
}

export function useAppOverview() {
  return useQuery({ queryKey: appMonKeys.overview(), queryFn: getOverview, retry: retryTransient, refetchInterval: LIVE });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: appMonKeys.application(id),
    queryFn: () => getApplication(id),
    retry: retryTransient,
    refetchInterval: LIVE,
  });
}

/** Only a range that reaches today keeps moving. */
export function useChecks(id: string, params: ChecksParams, { live, enabled = true }: { live: boolean; enabled?: boolean }) {
  return useQuery({
    queryKey: appMonKeys.checks(id, params),
    queryFn: () => listChecks(id, params),
    enabled,
    retry: retryTransient,
    refetchInterval: live ? LIVE : false,
    placeholderData: keepPreviousData,
  });
}

/** Everything that shows an application's state: the board, the list, its page and its history. */
function useRefreshAll() {
  const client = useQueryClient();
  return (updated?: Aplicativo) => {
    if (updated) client.setQueryData(appMonKeys.application(updated.id), updated);
    void client.invalidateQueries({ queryKey: appMonKeys.all });
  };
}

export function useCreateApplication() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (input: AplicativoInput) => createApplication(input), onSuccess: refresh });
}

export function useUpdateApplication() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AplicativoInput> }) => updateApplication(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: appMonKeys.application(id) });
      void client.invalidateQueries({ queryKey: appMonKeys.overview() });
      void client.invalidateQueries({ queryKey: appMonKeys.board() });
    },
  });
}

export function useCheckApplication() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => checkApplication(id), onSuccess: refresh });
}

/**
 * The cycle runs in the background after the 202, so nothing has changed when
 * this resolves. The screens are refetched once the checks have had time to
 * finish, instead of waiting for the next poll.
 */
export function useRequestCheckCycle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestCheckCycle,
    onSuccess: () => {
      setTimeout(() => void client.invalidateQueries({ queryKey: appMonKeys.all }), CYCLE_SETTLES_MS);
    },
  });
}
