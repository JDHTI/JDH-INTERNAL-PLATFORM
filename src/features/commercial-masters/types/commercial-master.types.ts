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
  /** Fraction: 0.05 is 5%. */
  list_margin_pct: number | null;
  list_margin_notes: string | null;
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

export interface CommercialProduct {
  sku: string;
  supplier_sku: string | null;
  description: string;
  is_active: boolean;
  commercial_supplier_code: string | null;
  manufacturer: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_line: string | null;
  pack_factor: number | null;
  inventory_unit: string | null;
  main_barcode: string | null;
}

export interface CommercialMasterParams {
  master: CommercialMasterKey;
  q: string;
  page: number;
  size: number;
}
