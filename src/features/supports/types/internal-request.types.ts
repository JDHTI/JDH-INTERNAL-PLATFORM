import type { Decimal } from "@/shared/lib/format";
import type { RequestStatus } from "./request.types";

/*
 * Contract of /api/v1/internal-support-requests: an internal JDH support asked
 * from a customer quotation, for one customer and one or more references of a
 * single supplier. Margins are fractions in decimal text ("0.16" is 16 %).
 *
 * Approving registers, per reference, a margin exception the order validator
 * already applies: `persistente` with the validity BI sets, `unica_vez` valid
 * only on `requested_for`, the day of the order.
 */

export type InternalDecision = "persistente" | "unica_vez";

export interface InternalRequestItem {
  sku: string;
  description: string | null;
  unit: string | null;
  /** Cost and quoted price as they were when the request was made. */
  cost: Decimal | null;
  quoted_price: Decimal | null;
  /** Margin (with the supplier's support) the quoted price leaves. */
  margin_pct: Decimal | null;
  /** The minimum the rule asks for the product. */
  min_margin_pct: Decimal | null;
  requested_margin_pct: Decimal;
  /**
   * The current margin it had to be under: the product's on the customer's margin list, or on a
   * supplier request the supplier's minimum in force when it was asked.
   */
  target_margin_pct?: Decimal | null;
  /** On a supplier request, the «% Margen Garantizado» being lowered. */
  base_support_id?: string | null;
  /** Null while pending, or when BI left this reference out. */
  approved_margin_pct: Decimal | null;
  /** The support the approval registered. */
  support_id: string | null;
}

export interface InternalSupportRequest {
  id: string;
  number: number;
  /** Missing on older API builds: those are all `jdh`. */
  kind?: InternalRequestKind;
  /** «Solicitud de margen proveedor {proveedor}» or «Excepción margen mínimo autorizado JDH». */
  kind_label?: string | null;
  status: RequestStatus;
  decision: InternalDecision | null;
  /** Null when it was asked from the requests panel, by customer and SKU. */
  quotation_id: string | null;
  quotation_label: string | null;
  customer_nit: string;
  customer_name: string | null;
  supplier_code: string;
  supplier_name: string | null;
  /** "YYYY-MM-DD": the day of the order, the only day a one-time approval holds. */
  requested_for: string;
  agreed_with: string;
  reason: string;
  requested_by: string;
  /** Who asked, when the API sends it: nobody decides their own request. */
  requested_by_id?: string | null;
  created_at: string;
  version: number;
  valid_from: string | null;
  valid_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  items: InternalRequestItem[];
}

export interface InternalRequestPage {
  items: InternalSupportRequest[];
  total: number;
  page: number;
  size: number;
}

export interface InternalRequestParams {
  page: number;
  size: number;
  status?: RequestStatus;
  q?: string;
  mine?: boolean;
}

/**
 * What a request lowers: `jdh`, the authorized minimum margin (0 ≤ v < the current margin), or
 * `proveedor`, the supplier's minimum margin of a «% Margen Garantizado» (-100 % < v < the one in
 * force), which on approval becomes a copy of that support for this customer and reference.
 */
export type InternalRequestKind = "jdh" | "proveedor";

/** `POST /quotations/{id}/support-requests`. One request is all JDH or all supplier. */
export interface InternalRequestInput {
  version: number;
  /** Left out it is `jdh`. */
  kind?: InternalRequestKind;
  supplier_code: string;
  requested_for: string;
  agreed_with: string;
  reason: string;
  items: { sku: string; requested_margin_pct: Decimal }[];
}

/** `POST /internal-support-requests`: by customer and SKU, from the requests panel. */
export interface DirectRequestInput {
  customer_nit: string;
  requested_for?: string;
  agreed_with: string;
  reason: string;
  items: { sku: string; requested_margin_pct: Decimal }[];
}

/**
 * `GET /internal-support-requests/target-margins`: the current margin of each SKU for a
 * customer (the product's optimal margin on the customer's list). A request asks less.
 */
export interface TargetMargin {
  sku: string;
  description: string | null;
  supplier_code: string | null;
  margin_field: string;
  margin_label: string;
  margin_pct: Decimal | null;
}

export interface TargetMargins {
  customer_nit: string;
  customer_name: string | null;
  /** Unknown SKUs are left out. */
  items: TargetMargin[];
}

/** `POST /internal-support-requests/{id}/approve`. References left out are not approved. */
export interface InternalApproval {
  version: number;
  decision: InternalDecision;
  /** Only `persistente`; `unica_vez` holds on `requested_for`. */
  valid_from?: string;
  valid_to?: string | null;
  note: string;
  items: { sku: string; approved_margin_pct: Decimal }[];
}
