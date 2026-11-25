/** Decimals travel as strings ("1.004", "0.01"). */
export type DecimalText = string;

/** `GET /cost-settings/permissions`: open, every flag false without access. */
export interface CostSettingsPermissions {
  can_read: boolean;
  can_manage: boolean;
}

/** `factor` multiplies the cost (1.004 is +0.4 %); `margen` is a fraction (0.01 is one point). */
export type ParameterUnit = "factor" | "margen";

export interface CostParameter {
  key: string;
  label: string;
  description: string;
  unit: ParameterUnit;
  minimum: DecimalText;
  maximum: DecimalText;
  family: string | null;
  value: DecimalText;
  default: DecimalText;
  is_default: boolean;
  updated_by: string | null;
  updated_at: string | null;
}

/**
 * Which branch of a supplier its quotation is read from in each operation center. A center not
 * listed takes `general_branch`; Nacional takes the highest.
 */
export interface BranchRule {
  id: string;
  supplier_nit: string;
  supplier_name: string | null;
  general_branch: string;
  /** C.O. code → the supplier's branch. */
  center_branches: Record<string, string>;
  is_active: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export interface CostChange {
  id: string;
  entity: "parametro" | "regla_sucursal";
  /** The parameter's key or the supplier's NIT. */
  ref: string;
  /**
   * A parameter: `{value, default}` before (whether it was the default) and `{value}` after, as
   * strings with 6 decimals. A rule: the whole rule, null before when created, null after when deleted.
   */
  before: unknown;
  after: unknown;
  note: string | null;
  actor: string | null;
  at: string;
}

/** `GET /cost-settings`: everything, with the latest 50 changes. */
export interface CostSettings {
  parameters: CostParameter[];
  branch_rules: BranchRule[];
  changes: CostChange[];
  can_manage: boolean;
}

export interface BranchRuleInput {
  supplier_nit: string;
  supplier_name?: string | null;
  general_branch?: string;
  center_branches: Record<string, string>;
  is_active?: boolean;
  note?: string | null;
}
