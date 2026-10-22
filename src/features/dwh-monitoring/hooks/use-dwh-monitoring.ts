"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  getFreshness,
  getOverview,
  getSchedule,
  getSequence,
  getSyncStatus,
  listExtractions,
  listFreshnessTables,
  listSequences,
  requestSync,
} from "../services/dwh-monitoring.service";
import type { ExtractionParams, FreshnessTableParams } from "../types/dwh-monitoring.types";

export const dwhKeys = {
  all: ["dwh-monitoring"] as const,
  overview: () => [...dwhKeys.all, "overview"] as const,
  sync: () => [...dwhKeys.all, "sync"] as const,
  sequences: () => [...dwhKeys.all, "sequences"] as const,
  sequence: (secuencia: string) => [...dwhKeys.all, "sequence", secuencia] as const,
  freshness: () => [...dwhKeys.all, "freshness"] as const,
  freshnessTables: (params: FreshnessTableParams) => [...dwhKeys.all, "freshness-tables", params] as const,
  schedule: (fecha: string) => [...dwhKeys.all, "schedule", fecha] as const,
  extractions: (params: ExtractionParams) => [...dwhKeys.all, "extractions", params] as const,
};

/*
 * The API copies the warehouse every 10 minutes and sequences move in minutes,
 * so the screens that answer "where are we now" poll once a minute while they
 * are open. React Query pauses it while the tab is in the background.
 */
const LIVE = 60_000;

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

export function useOverview() {
  return useQuery({ queryKey: dwhKeys.overview(), queryFn: getOverview, retry: retryTransient, refetchInterval: LIVE });
}

export function useSyncStatus() {
  return useQuery({ queryKey: dwhKeys.sync(), queryFn: getSyncStatus, retry: retryTransient, refetchInterval: LIVE });
}

export function useSequences() {
  return useQuery({ queryKey: dwhKeys.sequences(), queryFn: listSequences, retry: retryTransient, refetchInterval: LIVE });
}

export function useSequence(secuencia: string) {
  return useQuery({
    queryKey: dwhKeys.sequence(secuencia),
    queryFn: () => getSequence(secuencia),
    retry: retryTransient,
    refetchInterval: LIVE,
  });
}

export function useFreshness() {
  return useQuery({ queryKey: dwhKeys.freshness(), queryFn: getFreshness, retry: retryTransient });
}

export function useFreshnessTables(params: FreshnessTableParams) {
  return useQuery({
    queryKey: dwhKeys.freshnessTables(params),
    queryFn: () => listFreshnessTables(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/** Only today's chart moves; a past day is settled. */
export function useSchedule(fecha: string, isToday: boolean) {
  return useQuery({
    queryKey: dwhKeys.schedule(fecha),
    queryFn: () => getSchedule(fecha),
    retry: retryTransient,
    refetchInterval: isToday ? LIVE : false,
    placeholderData: keepPreviousData,
  });
}

export function useExtractions(params: ExtractionParams) {
  return useQuery({
    queryKey: dwhKeys.extractions(params),
    queryFn: () => listExtractions(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

/**
 * The cycle runs in the background after the 202, so nothing is fresh yet when
 * this resolves; the load status is refetched to show it started, and the
 * screens pick up the new data on their next poll.
 */
export function useRequestSync() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestSync,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: dwhKeys.sync() });
    },
  });
}
