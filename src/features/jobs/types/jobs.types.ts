/** Background jobs (`/jobs`): the master syncs the DWH's sequences trigger. */

export type JobRunStatus = "queued" | "running" | "success" | "partial" | "failed";
export type JobTrigger = "dwh" | "scheduled" | "manual" | "startup";

export interface JobRunDto {
  id: string;
  job: string;
  trigger: JobTrigger;
  status: JobRunStatus;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** Per master or per step, as the handler reports it. */
  detail: Record<string, unknown>;
  error: string | null;
  dwh_corrida_id: string | null;
  dwh_datos_listos: string | null;
  triggered_by: string | null;
}

export interface JobDto {
  key: string;
  label: string;
  description: string;
  /** DWH sequence that feeds it, e.g. `identidad`. */
  sequence: string | null;
  /** ISO weekdays (1 = Monday) when the daily fallback runs it. */
  fallback_days: number[];
  last_run: JobRunDto | null;
  last_success_at: string | null;
  /** When the DWH should have this job's data ready next. */
  next_expected_at: string | null;
  sequence_state: {
    secuencia: string;
    ultima_estado: string | null;
    ultima_datos_listos: string | null;
    en_curso: boolean | null;
  } | null;
}

export interface JobsOverviewDto {
  /** JOBS_ENABLED on the API: off, nothing runs on its own and a manual run answers 409. */
  enabled: boolean;
  poll_seconds: number;
  /** Local time of the daily fallback, "HH:MM". */
  fallback_at: string;
  timezone: string;
  dwh: { last_poll_at: string | null; error: string | null };
  items: JobDto[];
}

export const RUN_STATUS: Record<JobRunStatus, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  queued: { label: "En cola", tone: "info" },
  running: { label: "Corriendo", tone: "info" },
  success: { label: "Correcta", tone: "success" },
  partial: { label: "Parcial", tone: "warning" },
  failed: { label: "Fallida", tone: "danger" },
};

export const TRIGGER_LABELS: Record<JobTrigger, string> = {
  dwh: "Datos nuevos del DWH",
  scheduled: "Respaldo diario",
  manual: "A mano",
  startup: "Al arrancar la API",
};

export const isOpenRun = (run: JobRunDto | null) => run?.status === "queued" || run?.status === "running";
