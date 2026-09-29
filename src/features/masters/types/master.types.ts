/**
 * Shared master data contract. Every master (clientes, productos, vendedores…)
 * is read through the same shape: a definition that describes where it comes
 * from and which fields it has, and records normalized to
 * code / name / company / active, with everything specific to the master
 * in `attributes`. The warehouse names those columns differently per master
 * (codigo, co_codigo, sku; nombre, descripcion, razon_social); the API maps
 * them, the UI never does.
 */

export type MasterSourceSystem = "siesa" | "excel" | "platform";

export type MasterFieldType =
  | "text"
  | "integer"
  | "numeric"
  | "boolean"
  | "date"
  | "timestamp";

/** What the field does in the shared model; `attribute` is master-specific. */
export type MasterFieldRole =
  | "key"
  | "company"
  | "code"
  | "name"
  | "active"
  | "reference"
  | "attribute";

export interface MasterFieldDto {
  name: string;
  label: string;
  data_type: MasterFieldType;
  role: MasterFieldRole;
  is_nullable: boolean;
  /** Personal data under Ley 1581 (address, phone, email). */
  is_pii: boolean;
  /** Slug of the master a `reference` field points to. */
  references: string | null;
}

export interface MasterSummaryDto {
  slug: string;
  name: string;
  description: string | null;
  source_system: MasterSourceSystem;
  /** Warehouse object it is synced from, e.g. `consumo.clientes`. */
  source_object: string | null;
  /** One record is one of these, e.g. "cliente × sucursal". */
  grain: string | null;
  natural_key: string[];
  record_count: number;
  last_synced_at: string | null;
}

export interface MasterDetailDto extends MasterSummaryDto {
  fields: MasterFieldDto[];
}

export interface MasterRecordDto {
  id: string;
  company_id: number | null;
  code: string | null;
  name: string | null;
  /** Null for masters without an active flag in the source (regionales). */
  is_active: boolean | null;
  source_key: string;
  attributes: Record<string, unknown>;
  synced_at: string | null;
}

export interface MasterRecordPageDto {
  items: MasterRecordDto[];
  total: number;
  offset: number;
  limit: number;
}

export type MasterActiveFilter = "all" | "active" | "inactive";

export interface MasterRecordParams {
  slug: string;
  q: string;
  active: MasterActiveFilter;
  offset: number;
  limit: number;
}
