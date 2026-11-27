import type { Decimal } from "@/shared/lib/format";

/** A month, "YYYY-MM". */
export type Period = string;

/** GET /commercial-budget/permissions: open, `false` without access instead of a 403. */
export interface BudgetPermissions {
  can_read: boolean;
  /** Fill the budget (by hand or with the workbook) and sync the sales. */
  can_manage: boolean;
  /** Close and reopen a month: the leaders of BI and Comercial, and administrators. */
  can_close: boolean;
  /** Which reps the person sees: everyone, their team, themselves. */
  scope: "all" | "team" | "mine" | "none";
}

export interface BudgetPeriod {
  period: Period;
  status: "abierto" | "cerrado";
  status_label: string;
  is_current: boolean;
  is_finished: boolean;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
}

/** A cut: net sale before VAT, margin not recomposed (a fraction) and customers. */
export interface Figures {
  net: Decimal;
  margin: Decimal | null;
  /** Whole in a month; may be fractional in the average. */
  customers: Decimal;
  /** Months with sales behind the average (the average only). */
  months: number | null;
}

export interface RepBudget {
  budget_sales: Decimal | null;
  /** A fraction: 0.18 is 18 %. */
  budget_margin: Decimal | null;
  budget_customers: number | null;
  budget_collection: Decimal | null;
  /** The version read, sent back so a concurrent change answers 409. */
  version: number;
  updated_at: string | null;
  updated_by: string | null;
}

/**
 * Budget against the real: `variation` = budget / last year − 1, `compliance` = sale / budget,
 * `margin_gap` = margin − budget margin (0.01 is a point), `customers_gap` = customers − budget.
 */
export interface Derived {
  variation: Decimal | null;
  compliance: Decimal | null;
  margin_gap: Decimal | null;
  customers_gap: Decimal | null;
}

/** The sales of customers with no rep: shown apart, never editable. */
export const NO_REP = "sin-vendedor";

export interface RepRow {
  salesperson_code: string;
  name: string | null;
  regional: string | null;
  business_unit: string | null;
  team: string | null;
  team_class: string | null;
  is_active: boolean;
  current: Figures;
  average: Figures;
  last_year: Figures;
  /** Null until a field is filled. */
  budget: RepBudget | null;
  derived: Derived;
}

/** Sums; the real margin weighted by sale and the budget margin by budget, as BI's workbook. */
export interface Totals {
  rows: number;
  current: Figures;
  average: Figures;
  last_year: Figures;
  budget_sales: Decimal | null;
  budget_margin: Decimal | null;
  budget_customers: number | null;
  budget_collection: Decimal | null;
  derived: Derived;
}

export interface GroupTotals extends Totals {
  key: string | null;
}

export type Grouping = "regional" | "business_unit" | "team";

/** A team's subtotal inside one regional (`groups.team` adds a team name up across regionals). */
export interface TeamGroupTotals extends Totals {
  regional: string | null;
  team: string | null;
}

export interface SalespersonOption {
  code: string;
  name: string | null;
  team: string | null;
}

export interface BudgetBoard {
  period: BudgetPeriod;
  /** The months behind each cut: the month, the three before it and the same one last year. */
  window: { current: Period; previous: Period[]; last_year: Period };
  totals: Totals;
  rows: RepRow[];
  groups: Partial<Record<Grouping, GroupTotals[]>>;
  /** One subtotal per (regional, team), by regional then team, blanks last: the table's team rows. */
  team_groups: TeamGroupTotals[];
  options: { regionals: string[]; business_units: string[]; teams: string[]; salespeople: SalespersonOption[] };
  /** Months of the window whose sales are not copied from the DWH yet. */
  missing_months: Period[];
  sales_loaded_at: string | null;
}

/** Every filter takes several values; none is "all". */
export interface BudgetFilters {
  regional: string[];
  business_unit: string[];
  team: string[];
  salesperson: string[];
  q: string;
}

export type BudgetField = "budget_sales" | "budget_margin" | "budget_customers" | "budget_collection";

/** Only the fields sent change; `null` clears one. */
export type BudgetItem = { salesperson_code: string; version?: number } & Partial<Record<BudgetField, string | number | null>>;

export interface BudgetChange {
  salesperson_code: string;
  /** Raw field names (`budget_sales`…) to their values. */
  before: Record<string, Decimal | number | null>;
  after: Record<string, Decimal | number | null>;
  /** The changed fields' labels. */
  fields: string[];
  source: "manual" | "archivo";
  note: string | null;
  actor: string;
  at: string;
}

export interface UploadProblem {
  row: number;
  value: string | null;
  reason: string;
}

export interface BudgetUploadReport {
  applied: boolean;
  rows: number;
  matched: number;
  changed: number;
  unchanged: number;
  problems: UploadProblem[];
  warnings: UploadProblem[];
}

/**
 * A copy of the rep master and the sales from the DWH, run in the background (API #139):
 * POST /sync queues one (202), GET /sync reads the latest.
 */
export interface SyncRun {
  id: string;
  status: "queued" | "running" | "success" | "partial" | "failed";
  /** `manual` from the button; `dwh`, `scheduled` or `startup` when it ran by itself. */
  trigger: string;
  triggered_by: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  /** The months copied. */
  months: Period[];
  /** History months still missing, copied in the next runs. */
  pending: Period[];
}

/** GET /vendor-master/status: open. `configured` says whether the upload to dwh-platform works. */
export interface VendorMasterStatus {
  configured: boolean;
  can_read: boolean;
  can_manage: boolean;
}

export interface RejectedRow {
  hoja: string;
  fila: number;
  identificador: string;
  motivos: string[];
}

/** dwh-platform's answer, passed through as is. */
export interface VendorMasterResult {
  regionales_asignadas: number;
  unidades_negocio_procesadas?: number;
  equipos_procesados: number;
  supervisores_procesados: number;
  vendedores_procesados: number;
  filas_rechazadas: RejectedRow[];
  advertencias: string[];
  /** Whether dbt was scheduled to publish it in `consumo.vendedores`. */
  transformacion?: { estado: string; selector?: string; motivo?: string };
}

/**
 * A team of the master the template offers (API #145): `dwh` is published by the warehouse,
 * `plataforma` was created here and is not loaded yet. An inactive one leaves the template.
 */
export interface VendorTeam {
  name: string;
  team_class: string | null;
  source: "dwh" | "plataforma";
  is_active: boolean;
  /** Active reps in the team in the warehouse today. */
  reps: number;
  note: string | null;
}

export type VendorField = "team" | "team_class" | "regional" | "business_unit";

export interface VendorChange {
  salesperson_code: string;
  name: string | null;
  field: VendorField;
  field_label: string;
  current: string | null;
  new: string | null;
}

export interface VendorProblem {
  sheet: string;
  row: number;
  value: string | null;
  reason: string;
}

/** POST /vendor-master/preview: what the upload would change; nothing is written. */
export interface VendorPreview {
  reps_read: number;
  reps_resolved: number;
  changed_reps: number;
  unchanged: number;
  changes: VendorChange[];
  rejected: VendorProblem[];
  warnings: VendorProblem[];
  new_teams: string[];
  emptied_teams: string[];
  /** Active reps per team today and after the upload. */
  teams: { team: string; current: number; new: number }[];
  /** Active reps with sales this month or last that the file leaves out: they keep their team. */
  missing: { salesperson_code: string; name: string | null; team: string | null; lines: number }[];
  /** Coordinators whose team is no rep's team in the file: the link to their reps breaks. */
  coordinators: { document: string | null; name: string | null; team: string | null; reason: string }[];
}

export interface VendorMasterUpload {
  id: string;
  filename: string;
  size: number;
  status: "cargado" | "rechazado" | "error";
  http_status: number | null;
  rejected_rows: number;
  warnings: number;
  summary: Record<string, unknown>;
  actor: string;
  at: string;
}
