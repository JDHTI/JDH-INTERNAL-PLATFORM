/** Planes de acción (P.04.F.02), as the API sends them (API #82, docs/action-plans.md). */

export type Origin = "AI" | "AE" | "AT" | "IN" | "OM" | "PI" | "SNC";
export type ActionType = "correctiva" | "preventiva" | "mejora";
export type Rating = "real" | "potencial" | "oportunidad_mejora";
export type Method = "5m" | "espina_pescado" | "lluvia_ideas" | "sin_fallo";
export type CauseCategory =
  | "mano_obra"
  | "metodos"
  | "maquinaria"
  | "materiales"
  | "medio_ambiente"
  | "medicion"
  | "otra";
export type Effective = "si" | "no" | "pendiente";
export type PlanStatus = "abierta" | "en_proceso" | "cerrada";

export interface Option {
  value: string;
  label: string;
}

/** The «procedencia»: the SIG process the action comes from. */
export interface Process {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface PlanCatalog {
  origins: Option[];
  action_types: Option[];
  ratings: Option[];
  methods: Option[];
  cause_categories: Option[];
  effectiveness: Option[];
  statuses: Option[];
  processes: Process[];
}

export interface PlanPermissions {
  can_read: boolean;
  can_manage: boolean;
}

/** A row of the matrix. */
export interface PlanSummary {
  id: string;
  code: string;
  number: number;
  attempt: number;
  origin: Origin | string;
  process: Process;
  action_type: ActionType | string;
  rating: Rating | string;
  /** AAAA-MM-DD. */
  reported_on: string;
  reporter_name: string | null;
  reporter_company_role: string | null;
  city: string | null;
  finding: string | null;
  status: PlanStatus | string;
  effectiveness: Effective | string;
  case_id: string | null;
  case_code: string | null;
  activities: number;
  activities_done: number;
  /** Activities past their due date and not done. */
  overdue: number;
}

/** A responsible with their name; `display_name` is null when the user no longer exists. */
export interface ResponsibleUser {
  id: string;
  display_name: string | null;
}

export interface Correction {
  id: string;
  description: string;
  responsible_text: string | null;
  responsible_user_ids: string[];
  /** The same people as `responsible_user_ids`, named. Absent on an API that does not send it (before API #88). */
  responsible_users?: ResponsibleUser[];
  due_on: string | null;
  evidence_note: string | null;
  done: boolean;
  done_at: string | null;
}

export interface Cause {
  id: string;
  description: string;
  category: CauseCategory | string;
}

export interface Activity {
  id: string;
  description: string;
  responsible_text: string | null;
  responsible_user_ids: string[];
  responsible_users?: ResponsibleUser[];
  due_on: string | null;
  evidence_note: string | null;
  follow_up_text: string | null;
  follow_up_due_on: string | null;
  done: boolean;
  done_at: string | null;
  effective: Effective | string;
  effectiveness_note: string | null;
  overdue: boolean;
}

export interface Plan extends PlanSummary {
  reporter_nit: string | null;
  registered_by_user_id: string | null;
  registered_by_name: string | null;
  registered_by_position: string | null;
  registered_on: string | null;
  unmet_requirement: string | null;
  has_photos: boolean;
  has_history: boolean;
  analysis_method: Method | string | null;
  effectiveness_note: string | null;
  cause_label: string | null;
  previous_attempt_id: string | null;
  /** The action comes from the 2026 Excel. */
  imported: boolean;
  import_issues: string[];
  corrections: Correction[];
  causes: Cause[];
  activities_detail: Activity[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PlanFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  activity_id: string | null;
  correction_id: string | null;
  uploaded_by: string | null;
  created_at: string | null;
}

export interface PlanEvent {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  note: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface PlanDetail {
  plan: Plan;
  access: { can_manage: boolean; is_responsible: boolean };
  files: PlanFile[];
  events: PlanEvent[];
  /** Earlier actions of the same customer and cause. */
  similar: number;
}

export interface PlanPage {
  items: PlanSummary[];
  total: number;
  page: number;
  size: number;
}

export interface PlanFilters {
  origin?: string;
  process_id?: string;
  action_type?: string;
  status?: string;
  effectiveness?: string;
  city?: string;
  year?: number;
  month?: number;
  case_id?: string;
  q?: string;
  /** Only the actions where the caller is named. */
  mine?: boolean;
  overdue?: boolean;
}

export interface PlanIndicators {
  actions: number;
  activities: number;
  activities_done: number;
  overdue_activities: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_effectiveness: Record<string, number>;
  activities_effective: Record<string, number>;
  by_origin: Record<string, number>;
  by_process: Record<string, number>;
  /** `YYYY-MM`. */
  by_month: Record<string, number>;
  by_city: Record<string, number>;
}

/** The header of an action; on create the first four are required, on update only what is sent. */
export interface PlanHeaderInput {
  origin?: Origin;
  process_id?: string;
  action_type?: ActionType;
  reported_on?: string;
  rating?: Rating | null;
  reporter_nit?: string | null;
  reporter_name?: string | null;
  reporter_company_role?: string | null;
  city?: string | null;
  registered_on?: string | null;
  unmet_requirement?: string | null;
  finding?: string | null;
  has_photos?: boolean;
  has_history?: boolean;
  analysis_method?: Method | null;
  effectiveness_note?: string | null;
}

export interface CorrectionInput {
  /** An existing row keeps its progress. */
  id?: string;
  description: string;
  responsible_text?: string | null;
  responsible_user_ids: string[];
  due_on?: string | null;
  evidence_note?: string | null;
}

export interface CauseInput {
  id?: string;
  description: string;
  category: CauseCategory;
}

export interface ActivityInput extends CorrectionInput {
  follow_up_text?: string | null;
  follow_up_due_on?: string | null;
}

export interface UploadResult {
  files: PlanFile[];
  rejected: { name?: string; filename?: string; reason?: string }[];
}
