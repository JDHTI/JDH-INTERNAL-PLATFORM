"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { listCommercialMaster } from "../services/commercial-masters.service";
import type { CommercialMasterParams } from "../types/commercial-master.types";

export const commercialMasterKeys = {
  all: ["commercial-masters"] as const,
  list: (params: CommercialMasterParams) => [...commercialMasterKeys.all, params.master, params] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

export function useCommercialMaster(params: CommercialMasterParams) {
  return useQuery({
    queryKey: commercialMasterKeys.list(params),
    queryFn: () => listCommercialMaster(params),
    retry: retryTransient,
    // Keeps the previous page on screen while the next loads, but never one
    // master's rows under another master's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === params.master ? keepPreviousData(previous) : undefined,
  });
}
