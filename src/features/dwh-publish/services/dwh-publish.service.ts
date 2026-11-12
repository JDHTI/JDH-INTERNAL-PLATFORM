import { apiFetch } from "@/shared/lib/api-client";

import type { FailedEvent, PublishStatus, ReconcileResult } from "../types/dwh-publish.types";

export async function getPublishStatus(): Promise<PublishStatus> {
  return apiFetch<PublishStatus>("/dwh-publish");
}

/** Newest first. */
export async function listFailedEvents(limit = 100): Promise<FailedEvent[]> {
  return apiFetch<FailedEvent[]>("/dwh-publish/failed", { query: { limit } });
}

/** Back to the queue from zero attempts; no ids means every failed event. Also lifts the pause. */
export async function retryFailedEvents(ids?: number[]): Promise<{ requeued: number }> {
  return apiFetch<{ requeued: number }>("/dwh-publish/retry", { method: "POST", body: ids ? { ids } : {} });
}

/** Compares the warehouse with the platform and queues what it lacks. */
export async function reconcileNow(): Promise<ReconcileResult[]> {
  return apiFetch<ReconcileResult[]>("/dwh-publish/reconcile", { method: "POST" });
}
