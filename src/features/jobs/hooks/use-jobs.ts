"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { masterKeys } from "@/features/masters/hooks/use-masters";
import { ApiError } from "@/shared/lib/api-client";

import { getJobs, listJobRuns, runJob } from "../services/jobs.service";
import { isOpenRun, type JobsOverviewDto } from "../types/jobs.types";

export const jobKeys = {
  all: ["jobs"] as const,
  overview: () => [...jobKeys.all, "overview"] as const,
  runs: (job: string) => [...jobKeys.all, "runs", job] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409].includes(error.status)) && count < 1;

/** Polls while a run is queued or running, so its end shows without a reload. */
export function useJobs() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: jobKeys.overview(),
    queryFn: async () => {
      const before = queryClient.getQueryData<JobsOverviewDto>(jobKeys.overview());
      const overview = await getJobs();
      // A sync that just finished changed the record counts the masters list shows.
      const finished = overview.items.some(
        (item) => !isOpenRun(item.last_run) && isOpenRun(before?.items.find((old) => old.key === item.key)?.last_run ?? null)
      );
      if (finished) void queryClient.invalidateQueries({ queryKey: masterKeys.all });
      return overview;
    },
    retry: retryTransient,
    refetchInterval: (query) => (query.state.data?.items.some((item) => isOpenRun(item.last_run)) ? 5_000 : false),
  });
}

export function useJobRuns(job: string | null) {
  return useQuery({
    queryKey: jobKeys.runs(job ?? ""),
    queryFn: () => listJobRuns(job!),
    enabled: job !== null,
    retry: retryTransient,
  });
}

export function useRunJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runJob,
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
  });
}
