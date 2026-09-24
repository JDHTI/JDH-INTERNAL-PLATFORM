"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { getCurrentUser } from "../services/session.service";

export const sessionKeys = {
  current: ["session", "current"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
  count < 1;

export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current,
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: retryTransient,
  });
}
