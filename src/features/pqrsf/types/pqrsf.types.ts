/*
 * Mirrors the follow-up contract of internal-platform-api
 * (docs/pqrsf-seguimiento.md). Dates without time (`received_on`, `due_on`,
 * `responded_on`) arrive as "YYYY-MM-DD" in Bogotá's calendar; timestamps are
 * ISO strings with offset.
 */

export interface RequestType {
  id: string;
  code: string;
  name: string;
  prefix: string;
  requires_follow_up: boolean;
  sla_days: number | null;
  allows_document_request: boolean;
  allows_attachments: boolean;
  is_active: boolean;
}

export interface CaseStatus {
  id: string;
  code: string;
  name: string;
  /** Kept for reports; the UI maps `code` to badge tokens instead. */
  color: string | null;
  sort_order: number;
  is_initial: boolean;
  is_terminal: boolean;
  is_active: boolean;
}

export interface Dependency {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  sla_days: number;
  is_active: boolean;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  /** Site part of the consecutive (the AC of P26AC0001). */
  abbreviation: string;
  is_active: boolean;
}

export interface TrackingCatalog {
  request_types: RequestType[];
  statuses: CaseStatus[];
  dependencies: Dependency[];
  document_types: DocumentType[];
  sites: Site[];
  is_manager: boolean;
}

export interface Person {
  id: string;
  display_name: string | null;
  email: string | null;
}

export interface CaseItem {
  id: string;
  document_type: DocumentType | null;
  description: string | null;
  quantity: number | null;
  sla_days: number | null;
  due_on: string | null;
  responded_on: string | null;
  response_days: number | null;
  difference_days: number | null;
  is_late: boolean;
  /** Unanswered, in an open case, past its due date. */
  is_overdue: boolean;
  delay_cause: string | null;
  delay_detail: string | null;
}

export type CaseOrigin = "public_form" | "internal" | "import";

export interface PqrsfCase {
  id: string;
  code: string;
  request_type: Pick<RequestType, "id" | "code" | "name" | "prefix">;
  status: CaseStatus;
  origin: CaseOrigin | string;
  subject: string | null;
  description: string | null;
  received_on: string;
  due_on: string | null;
  is_overdue: boolean;
  site: Site | null;
  dependency: Dependency | null;
  assignee: Person | null;
  created_by: Person | null;
  customer_name: string | null;
  customer_nit: string | null;
  supplier_name: string | null;
  sales_executive_name: string | null;
  requester_name: string | null;
  requester_email: string | null;
  request_id: string | null;
  first_read_at: string | null;
  closed_at: string | null;
  legacy: {
    responsable?: string;
    original_consecutive?: string | number;
    /** Code before the per-site numbering (P-2026-00012). */
    previous_code?: string;
  } & Record<
    string,
    unknown
  > | null;
  items: CaseItem[];
  item_count: number;
  responded_count: number;
  permissions: { can_work: boolean; can_assign: boolean; can_delete: boolean };
  created_at: string;
  updated_at: string;
}

export interface CaseEvent {
  id: string;
  event_type:
    | "created"
    | "updated"
    | "assigned"
    | "status_changed"
    | "read"
    | "comment"
    | "item_added"
    | "item_updated"
    | "item_removed"
    | "deleted"
    | "viewed"
    | "inbox_opened"
    | string;
  actor: Person | null;
  from_status_id: string | null;
  to_status_id: string | null;
  note: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

/** Entry of the module history; `case_id` is null once the case is deleted. */
export interface ActivityEvent extends CaseEvent {
  case_id: string | null;
  case_code: string | null;
}

export interface ActivityPage {
  items: ActivityEvent[];
  /** Pass as `before` to get the next, older page; null at the end. */
  next_before: string | null;
}

export interface ActivityFilters {
  event_type?: string[];
  actor_user_id?: string;
  case_code?: string;
  include_access?: boolean;
}

export interface LastSeen {
  user: Person;
  last_seen_at: string;
}

export interface IntakeAttachment {
  id: string;
  original_filename: string;
  extension: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

/** What the customer filed through the public form. Immutable evidence. */
export interface IntakeRequest {
  id: string;
  reference: string;
  request_type: { id: string; code: string; name: string };
  site: { id: string; code: string; name: string };
  full_name: string;
  business_name: string;
  nit: string;
  address: string;
  department: string;
  city: string;
  email: string;
  subject: string | null;
  description: string;
  /** The customer asked for documents; the case already lists them as items. */
  document_request: boolean;
  attachments: IntakeAttachment[];
  created_at: string;
}

export interface CaseDetail {
  case: PqrsfCase;
  events: CaseEvent[];
  request: IntakeRequest | null;
}

export interface CasePage {
  items: PqrsfCase[];
  total: number;
  page: number;
  size: number;
}

export interface CountBucket {
  id: string;
  code: string;
  name: string;
  count: number;
  color: string | null;
}

export interface CaseSummary {
  total: number;
  open: number;
  overdue: number;
  due_today: number;
  unassigned: number;
  by_status: CountBucket[];
  by_type: CountBucket[];
}

export type CaseSort =
  | "received_on"
  | "-received_on"
  | "due_on"
  | "-due_on"
  | "code"
  | "-code"
  | "updated_at"
  | "-updated_at";

/** Inbox filters, exactly as the URL carries them and the API reads them. */
export interface CaseFilters {
  status_id: string[];
  request_type_id?: string;
  assignee_user_id?: string;
  unassigned?: boolean;
  dependency_id?: string;
  site_id?: string;
  open_only?: boolean;
  overdue?: boolean;
  due_today?: boolean;
  received_from?: string;
  received_to?: string;
  q?: string;
  mine?: boolean;
  sort?: CaseSort;
}

export interface CaseListParams extends CaseFilters {
  page: number;
  size: number;
}

export type SuggestionField = "customer" | "supplier" | "sales_executive" | "requester";

export interface ItemInput {
  document_type_id?: string | null;
  description?: string | null;
  quantity?: number | null;
}

export interface CreateCaseInput {
  request_type_id: string;
  received_on?: string;
  subject?: string | null;
  description?: string | null;
  site_id?: string | null;
  dependency_id?: string | null;
  customer_name?: string | null;
  customer_nit?: string | null;
  supplier_name?: string | null;
  sales_executive_name?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  assignee_user_id?: string | null;
  items: ItemInput[];
}

/** Only the fields sent are changed; `null` clears one. */
export type UpdateCaseInput = Partial<
  Pick<
    CreateCaseInput,
    | "subject"
    | "description"
    | "site_id"
    | "dependency_id"
    | "customer_name"
    | "customer_nit"
    | "supplier_name"
    | "sales_executive_name"
    | "requester_name"
    | "requester_email"
  > & { received_on: string }
>;

export interface UpdateItemInput extends ItemInput {
  responded_on?: string | null;
  delay_cause?: string | null;
  delay_detail?: string | null;
}
