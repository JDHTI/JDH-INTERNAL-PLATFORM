import { ApiError } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";

import type { CalcMethodRule, FormFieldSpec, ProfileDefaults, SupportFormSchema } from "../types/support.types";

/** Fractions are typed as percentages: 5 means 0.05. */
export function toInput(value: Decimal | null | undefined, percent: boolean): string {
  const parsed = toNumber(value);
  if (parsed === null) return "";
  return String(percent ? Number((parsed * 100).toFixed(6)) : parsed);
}

/**
 * Reads a typed number. With a comma it is read the es-CO way ("1.234,5");
 * without one, a dot is the decimal point ("4.8").
 */
export function toDecimal(text: string, percent: boolean): number | null {
  const trimmed = text.trim().replace(/\s/g, "");
  if (trimmed === "") return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return percent ? Number((parsed / 100).toFixed(8)) : parsed;
}

/**
 * Fields a profile may pre-fill. Mirrors DEFAULT_FIELDS in the API's
 * domain/profiles.py, which rejects any other key with a 422.
 */
export const PROFILE_DEFAULT_FIELDS = [
  "kind",
  "funding",
  "calc_method",
  "value_unit",
  "settlement_method",
  "settlement_frequency",
  "program",
  "regionals",
  "business_units",
  "channels",
  "warehouse",
  "brand",
  "jdh_pct",
  "target_margin_pct",
  "min_margin_pct",
  "list_margin_pct",
  "authorized_by",
  "supplier_contact",
  "sales_rep",
  "conditions",
  "end_condition",
];

export type Draft = Record<string, string | string[]>;

/** Whether the field is typed as a percentage under the chosen method. */
export function isPercentField(spec: FormFieldSpec, rule: CalcMethodRule | undefined): boolean {
  if (spec.name === "supplier_value") return rule?.value_kind === "percent";
  return spec.type === "fraction";
}

/** Fields some method lists in `shows`: they appear only when the chosen method does. */
export function methodGatedFields(schema: SupportFormSchema): Set<string> {
  return new Set(Object.values(schema.methods).flatMap((rule) => rule.shows));
}

export function isFieldVisible(name: string, rule: CalcMethodRule | undefined, gated: Set<string>): boolean {
  if (name === "supplier_value") return rule !== undefined && rule.value_kind !== "none";
  if (gated.has(name)) return rule?.shows.includes(name) ?? false;
  return true;
}

/** A stored profile as form text: its fractions become percentages to type. */
export function draftFromDefaults(defaults: ProfileDefaults, specs: FormFieldSpec[]): Draft {
  const draft: Draft = {};
  for (const [name, value] of Object.entries(defaults)) {
    const spec = specs.find((candidate) => candidate.name === name);
    if (!spec) continue;
    if (Array.isArray(value)) draft[name] = value;
    else draft[name] = spec.type === "fraction" ? toInput(value, true) : String(value);
  }
  return draft;
}

export function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export function isEmptyValue(value: string | string[] | undefined): boolean {
  return value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === "");
}

/**
 * A 422 names its fields as ["body", "<field>", ...]; those land beside the field. A rule the
 * API checks itself (not the request's shape) answers `{field, detail}`: that one too.
 */
export function fieldErrorsFrom(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!(error instanceof ApiError)) return errors;
  for (const issue of error.issues) {
    const [where, field] = issue.loc ?? [];
    if (where === "body" && typeof field === "string" && issue.msg && !errors[field]) errors[field] = issue.msg;
  }
  const named = (error.body as { field?: unknown } | null)?.field;
  if (typeof named === "string" && named && !errors[named]) errors[named] = error.detail;
  return errors;
}

export const NUMBER_ERROR = "Escribe solo el número, por ejemplo 4,8 o 12500.";

/**
 * Turns the typed draft into API values, field by field. Numbers that do not
 * parse come back as errors keyed by field, so the form can say where.
 * `fractionsAsText` is for profiles, which store fractions as "0.05".
 */
export function readDraft(
  specs: FormFieldSpec[],
  draft: Draft,
  rule: CalcMethodRule | undefined,
  { fractionsAsText = false }: { fractionsAsText?: boolean } = {}
): { values: Record<string, string | number | string[]>; errors: Record<string, string> } {
  const values: Record<string, string | number | string[]> = {};
  const errors: Record<string, string> = {};
  for (const spec of specs) {
    const raw = draft[spec.name];
    if (isEmptyValue(raw)) continue;
    if (Array.isArray(raw)) {
      values[spec.name] = raw;
    } else if (spec.type === "list") {
      // Typed by hand when the catalog has no values for it.
      values[spec.name] = raw.split(/[,;/]/).map((item) => item.trim()).filter(Boolean);
    } else if (spec.type === "number" || spec.type === "fraction") {
      const parsed = toDecimal(raw, isPercentField(spec, rule));
      if (parsed === null) errors[spec.name] = NUMBER_ERROR;
      else values[spec.name] = fractionsAsText && spec.type === "fraction" ? String(parsed) : parsed;
    } else {
      values[spec.name] = raw.trim();
    }
  }
  return { values, errors };
}
