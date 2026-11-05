import { apiFetch } from "@/shared/lib/api-client";

import type { JobRunDto, JobsOverviewDto } from "../types/jobs.types";

export async function getJobs(): Promise<JobsOverviewDto> {
  return apiFetch<JobsOverviewDto>("/jobs");
}

export async function listJobRuns(job: string, limit = 50): Promise<JobRunDto[]> {
  return apiFetch<JobRunDto[]>("/jobs/runs", { query: { job, limit } });
}

/** 202 with the run; 409 when jobs are off or one is already open. */
export async function runJob(key: string): Promise<{ run_id: string }> {
  return apiFetch<{ run_id: string }>(`/jobs/${encodeURIComponent(key)}/run`, { method: "POST" });
}
