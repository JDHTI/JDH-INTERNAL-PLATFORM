/*
 * Contract of /api/v1/requested-products: the products someone quoted that
 * SIESA does not have yet, kept apart from any quotation. Money travels as
 * decimal strings; VAT in points (19 is 19 %).
 */

/** BI moves a request along: created in SIESA (with its reference) or discarded. */
export type RequestedProductStatus = "solicitado" | "creado" | "descartado";

export interface RequestedProductQuotation {
  id: string;
  customer_name: string;
  customer_nit: string;
  status: string;
  status_label: string;
  created_by: string;
}

export interface RequestedProduct {
  id: string;
  description: string;
  supplier_name: string | null;
  estimated_price: string | null;
  vat_pct: string | null;
  status: RequestedProductStatus;
  status_label: string;
  siesa_sku: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  /** Only the quotations the viewer can open. */
  quotations: RequestedProductQuotation[];
}

export interface RequestedProductPage {
  items: RequestedProduct[];
  total: number;
  page: number;
  size: number;
}

export interface RequestedProductParams {
  status: RequestedProductStatus | "";
  q: string;
  page: number;
  size: number;
}

export interface RequestedProductChange {
  status: RequestedProductStatus;
  siesa_sku?: string;
  note?: string;
}

/** What the module lets the person do: read the list, and resolve requests (BI, admins). */
export interface RequestedProductPermissions {
  can_read: boolean;
  can_resolve: boolean;
}
