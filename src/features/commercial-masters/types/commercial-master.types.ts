import type { Decimal } from "@/shared/lib/format";

export type CommercialMasterKey =
  | "proveedores-comerciales"
  | "proveedores-legales"
  | "clientes"
  | "productos";

export interface CommercialPage<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface SupplierNit {
  nit: string;
  product_links: number;
  is_primary: boolean;
  confirmed: boolean;
}

export interface CommercialSupplier {
  code: string;
  name: string;
  is_active: boolean;
  product_count: number;
  active_product_count: number;
  nits: SupplierNit[];
}

export interface LegalSupplier {
  nit: string;
  branch_id: string;
  legal_name: string;
  branch_name: string | null;
  supplier_class: string | null;
  supplier_type: string | null;
  city: string | null;
  payment_condition: string | null;
  state: string | null;
  branch_state: string | null;
  is_active: boolean;
}

export interface Customer {
  nit: string;
  branch_id: string;
  legal_name: string;
  branch_name: string | null;
  establishment_name: string | null;
  channel: string | null;
  business_unit: string | null;
  business_group: string | null;
  billing_center: string | null;
  logistics_zone: string | null;
  department: string | null;
  city: string | null;
  salesperson_name: string | null;
  is_active: boolean;
}

/** The five margins a product carries, one per sales channel. Fractions: 0.18 is 18%. */
export const MARGIN_FIELDS = [
  "margin_list",
  "margin_wholesale",
  "margin_salsamentarias",
  "margin_mass_food",
  "margin_market",
] as const;

export type MarginField = (typeof MARGIN_FIELDS)[number];

export type MarginSource = "importacion" | "manual";

export interface CommercialProduct {
  sku: string;
  supplier_sku: string | null;
  description: string;
  state: string | null;
  is_active: boolean;
  commercial_supplier_code: string | null;
  manufacturer: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_line: string | null;
  product_subline: string | null;
  product_group: string | null;
  pack_factor: Decimal | null;
  inventory_unit: string | null;
  main_barcode: string | null;
  /** Decimal strings; null means no margin is defined for that channel. */
  margin_list: Decimal | null;
  margin_wholesale: Decimal | null;
  margin_mass_food: Decimal | null;
  margin_market: Decimal | null;
  margin_salsamentarias: Decimal | null;
  margin_notes: string | null;
  margin_source: MarginSource | null;
  margin_updated_by: string | null;
  margin_updated_at: string | null;
  has_margin: boolean;
  liquor_tax: Decimal | null;
  liquor_tax_coast: Decimal | null;
  liquor_tax_group: string | null;
}

/**
 * Only the fields that change are sent, and null clears one. State, active and
 * the commercial supplier cannot be edited here: they come from the DWH.
 */
export type ProductPatch = Partial<
  Pick<
    CommercialProduct,
    | "description"
    | "supplier_sku"
    | "manufacturer"
    | "brand"
    | "category"
    | "subcategory"
    | "product_line"
    | "product_subline"
    | "product_group"
    | "pack_factor"
    | "inventory_unit"
    | "main_barcode"
    | "margin_list"
    | "margin_wholesale"
    | "margin_mass_food"
    | "margin_market"
    | "margin_salsamentarias"
    | "margin_notes"
    | "liquor_tax"
    | "liquor_tax_coast"
    | "liquor_tax_group"
  >
>;

/**
 * PUT /commercial/products/{sku}/margins: every field is required. Margins are
 * fractions above 0 and below 1; `notes` null or empty clears them; `liquor_tax`
 * null means the product does not pay it, which a product that already pays
 * it cannot send.
 */
export interface ProductMarginsInput {
  margin_list: string;
  margin_wholesale: string;
  margin_mass_food: string;
  margin_market: string;
  margin_salsamentarias: string;
  notes: string | null;
  liquor_tax: { national: string; coast: string; group: string } | null;
}

export interface MarginChange {
  sku: string;
  description: string | null;
  margins: Partial<Record<MarginField, { from: Decimal | null; to: Decimal | null }>>;
  /**
   * Liquor tax loaded from the same workbook, per regional: the national and
   * the Coast amounts in pesos, and the tax group. Older API builds send none.
   */
  taxes?: Partial<Record<LiquorTaxField, { from: Decimal | string | null; to: Decimal | string | null }>>;
  notes: { from: string | null; to: string | null } | null;
}

export type LiquorTaxField = "liquor_tax" | "liquor_tax_coast" | "liquor_tax_group";

export interface MarginIssue {
  row_number: number;
  sku: string | null;
  problem: string;
}

/** What uploading a margin file reports; `applied` is false for a simulation. */
export interface MarginReport {
  applied: boolean;
  rows_read: number;
  updated: number;
  unchanged: number;
  duplicated: number;
  unknown_skus: string[];
  issues: MarginIssue[];
  /** At most 500; `changes_truncated` says when there are more. */
  changes: MarginChange[];
  changes_truncated: boolean;
}

export interface CommercialMasterParams {
  master: CommercialMasterKey;
  q: string;
  /** API query parameter to value; an empty value means no filter. */
  filters: Record<string, string>;
  page: number;
  size: number;
}
