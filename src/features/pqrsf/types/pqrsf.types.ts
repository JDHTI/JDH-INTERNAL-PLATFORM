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
  /** `acknowledge`: a suggestion or compliment, answered with thanks and no case. */
  handling?: "case" | "acknowledge";
  /** One short line shown under the type on the forms (at most 120 characters). */
  description?: string | null;
  /** The public form asks which area the request is for. */
  asks_area?: boolean;
}

export type RequestTypeCode = "peticion" | "queja" | "reclamo" | "sugerencia" | "felicitacion";

/** `supplier`: may be escalated to the manufacturer; `internal`: a JDH process failure. */
export type CauseRoute = "supplier" | "internal" | "none";

/** A cause as the managers keep it, with what decides the treatment of its cases. */
export interface CauseAdmin {
  id: string;
  subject_id: string;
  code: string;
  name: string;
  description: string | null;
  dependency_id: string | null;
  route: CauseRoute;
  requires_product: boolean;
  allows_product: boolean;
  is_other: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface SubjectAdmin {
  id: string;
  code: string;
  name: string;
  description: string | null;
  request_type_codes: RequestTypeCode[];
  dependency_id: string | null;
  is_other: boolean;
  sort_order: number;
  is_active: boolean;
  causes: CauseAdmin[];
}

export type SubjectInput = Pick<
  SubjectAdmin,
  "code" | "name" | "description" | "request_type_codes" | "dependency_id" | "is_other" | "sort_order"
>;
export type SubjectUpdate = Partial<Omit<SubjectInput, "code"> & Pick<SubjectAdmin, "is_active">>;

export type CauseInput = Pick<
  CauseAdmin,
  | "code"
  | "name"
  | "description"
  | "dependency_id"
  | "route"
  | "requires_product"
  | "allows_product"
  | "is_other"
  | "sort_order"
>;
export type CauseUpdate = Partial<Omit<CauseInput, "code"> & Pick<CauseAdmin, "is_active">>;

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

export type CaseOrigin = "public_form" | "internal" | "import" | "email";

// A file that arrived by email, stored under the case.
export interface CaseFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  /** Null for files that came by email; set for files attached to a comment. */
  comment_event_id?: string | null;
}

export interface RejectedFile {
  name: string;
  reason: string;
}

export type ClientReplyStatus = "pending" | "sent" | "failed";

export interface ClientReply {
  id: string;
  event_id: string;
  to: string;
  status: ClientReplyStatus;
  attempts: number;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface CommentInput {
  body: string;
  files: File[];
  replyToClient: boolean;
  /** Colleagues copied on the reply; only sent with `replyToClient`. */
  cc?: string[];
}

/** The comment event plus what the API did with its files and email. */
export interface CommentResult extends CaseEvent {
  files?: CaseFile[];
  rejected_files?: RejectedFile[];
  client_reply?: ClientReply | null;
}

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
  /**
   * When the client or a supplier last answered by email on an open case. A mark
   * apart from the status and the due date; the API clears it when the assignee
   * or a manager opens the case. Absent on an API that does not send it.
   */
  news_at?: string | null;
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
  /** Who sold the invoice, filed the case, or was typed in. */
  sales_executive?: SalesExecutive | null;
  created_at: string;
  updated_at: string;
  /** What the case is about, copied from the request when it opened. */
  classification?: CaseClassification | null;
  /** What the customer sent; never edited. With lines, the supplier comes from them. */
  products?: CaseProduct[];
}

export type PickupOrderAnswer = "yes" | "no" | "unknown";

export interface CaseClassification {
  /** Area the customer picked on the form. */
  requested_area: IntakeClassificationRef | null;
  subject: IntakeClassificationRef | null;
  cause: IntakeClassificationRef | null;
  route: CauseRoute | null;
  pickup_order_requested: PickupOrderAnswer | null;
  pickup_order_number: string | null;
  /** AAAA-MM-DD: when the order with the products was delivered. */
  delivery_date: string | null;
}

export interface CaseProduct extends IntakeProduct {
  id: string;
  /** `request`: public form; `internal`: a collaborator; `email`: the mailbox. */
  source: "request" | "internal" | "email";
}

export interface SalesExecutive {
  name: string | null;
  code: string | null;
  email: string | null;
  /** Platform user matched by email: they can see and comment on the case. */
  user_id: string | null;
  /** `invoice`: the sales data; `internal`: the comercial who filed it; `manual`: typed. */
  source: "invoice" | "internal" | "manual" | null;
}

export type SupplierMessageKind = "request" | "response" | "improvement" | "notice";

/** One email of a message to a supplier, one per recipient. */
export interface SupplierEmail {
  id: string;
  event_id: string | null;
  to: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  error: string | null;
  sent_at: string | null;
  created_at: string | null;
}

export interface SupplierContact {
  id: string;
  supplier_code: string | null;
  supplier_name: string | null;
  email: string;
  contact_name: string | null;
  last_used_at: string | null;
}

export interface SupplierMessageInput {
  kind: SupplierMessageKind;
  to: string[];
  body: string;
  supplierCode: string | null;
  supplierName: string | null;
  includeCaseData: boolean;
  includeEvidence: boolean;
  files: File[];
  /** Colleagues copied on every email of the message. */
  cc?: string[];
}

export interface SupplierMessageResult extends CaseEvent {
  files: CaseFile[];
  rejected_files: RejectedFile[];
  emails: SupplierEmail[];
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
    /** Text the client or a supplier wrote by email: read like a message. */
    | "email_received"
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
  // The API words each event; the UI shows it as given instead of
  // translating `event_type` (docs/pqrsf-panel-interno-plan.md, «Línea de tiempo legible»).
  /** `external` is a sender the case does not know. */
  actor_kind: "system" | "user" | "client" | "supplier" | "external" | string;
  /** «Sistema», the person, the client or the supplier. */
  actor_name: string;
  /** One sentence in Spanish, ready to show after the actor: «Asignó el caso a Juan». */
  title: string;
  category:
    | "lifecycle"
    | "access"
    | "assignment"
    | "status"
    | "communication"
    | "documents"
    | "classification"
    | string;
  /** Status names before and after, when the event moved the case. */
  status_change: { from: string | null; to: string | null } | null;
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
  /** Optional since the subject and cause are picked from the catalog. */
  description: string | null;
  /** The customer asked for documents; the case already lists them as items. */
  document_request: boolean;
  /** Area the customer picked. The case's dependency may differ: the cause decides. */
  selected_area?: IntakeClassificationRef | null;
  selected_subject?: IntakeClassificationRef | null;
  selected_cause?: IntakeClassificationRef | null;
  products?: IntakeProduct[];
  pickup_order_requested?: PickupOrderAnswer | null;
  pickup_order_number?: string | null;
  /** AAAA-MM-DD: when the order with the products was delivered. */
  delivery_date?: string | null;
  attachments: IntakeAttachment[];
  created_at: string;
}

export interface IntakeClassificationRef {
  id: string;
  code: string;
  name: string;
}

/** A product line as the customer sent it, with the master data seen at that moment. */
export interface IntakeProduct {
  invoice_number: string;
  sku: string;
  description: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  lot: string;
  /** AAAA-MM-DD */
  expiry_date: string;
  affected_quantity: number;
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
  /** Open cases with an unseen email answer. Absent on an API that does not send it. */
  with_news?: number;
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
  with_news?: boolean;
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
  > & {
    received_on: string;
    pickup_order_requested: PickupOrderAnswer | null;
    /** Only with `yes`; answering `no` or `unknown` clears it. */
    pickup_order_number: string | null;
    /** AAAA-MM-DD, not after today. */
    delivery_date: string | null;
  }
>;

export interface UpdateItemInput extends ItemInput {
  responded_on?: string | null;
  delay_cause?: string | null;
  delay_detail?: string | null;
}

// ── Suggestions and compliments: kept apart from cases ──

export interface FeedbackKind {
  id: string;
  code: "sugerencia" | "felicitacion" | string;
  name: string;
}

export type FeedbackReplyStatus = "pending" | "sent" | "failed" | "skipped";

export interface FeedbackReply {
  status: FeedbackReplyStatus;
  sent_at: string | null;
  /** Set when no automatic reply went out (the address hit the daily limit). */
  skipped_reason: string | null;
}

export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  origin: "public_form" | "email" | string;
  full_name: string;
  business_name: string | null;
  email: string;
  subject: string | null;
  /** First 200 characters of the body. */
  body_excerpt: string;
  site: Pick<Site, "id" | "code" | "name"> | null;
  /** Area the customer said it is for, on the public form. */
  area?: IntakeClassificationRef | null;
  files_count: number;
  reply: FeedbackReply;
  read_at: string | null;
  created_at: string;
}

export interface FeedbackDetail extends FeedbackItem {
  body: string;
  files: CaseFile[];
  read_by: Person | null;
}

export interface FeedbackSummary {
  total: number;
  unread: number;
  by_kind: { code: string; name: string; count: number; unread: number }[];
}

export interface FeedbackFilters {
  kind?: string;
  q?: string;
  unread?: boolean;
  from?: string;
  to?: string;
}

export interface FeedbackListParams extends FeedbackFilters {
  page: number;
  size: number;
}

export interface FeedbackPage {
  items: FeedbackItem[];
  total: number;
  page: number;
  size: number;
}

/** One organization-wide timer: runs on business days at `time` (local, HH:MM). */
export interface NotificationJob {
  enabled: boolean;
  time: string;
}

export interface NotificationSettingsInput {
  daily_summary: NotificationJob;
  overdue_reminder: NotificationJob;
}

export interface NotificationSettings extends NotificationSettingsInput {
  timezone: string;
  business_days_only: boolean;
}