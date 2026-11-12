/**
 * Publication to the DWH (`/dwh-publish`, administrators only). Each change of
 * a support or a bulk load waits in a local outbox and a background worker
 * sends it to the warehouse's `plataforma` schema.
 */

/** `supplier_support` (supports) or `supplier_support_load` (bulk loads); others may follow. */
export type PublishTopic = string;

export interface TopicStatus {
  topic: PublishTopic;
  pending: number;
  /** Out of attempts: waits for an administrator to retry it. */
  failed: number;
  published: number;
  oldest_pending_at: string | null;
  last_published_at: string | null;
  last_error: string | null;
}

/** One topic compared between the platform and the warehouse. */
export interface ReconcileResult {
  topic: PublishTopic;
  local: number;
  remote: number;
  /** Missing or stale in the warehouse, queued again. */
  queued: number;
}

export interface PublishStatus {
  /** `DWH_PUBLISH_ENABLED`: off, the queue fills and is sent once switched on. */
  enabled: boolean;
  /** The writer connection (`DWH_WRITER_*`) is set. */
  configured: boolean;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  /** After repeated failures the worker rests until then instead of insisting. */
  paused_until: string | null;
  last_reconcile_at: string | null;
  last_reconcile: ReconcileResult[];
  topics: TopicStatus[];
}

export interface FailedEvent {
  id: number;
  topic: PublishTopic;
  entity_id: string;
  version: number;
  attempts: number;
  last_error: string | null;
  created_at: string;
}
