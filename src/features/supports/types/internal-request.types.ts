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
  /** Null while pending, or when BI left this reference out. */
  approved_margin_pct: Decimal | null;
  /** The support the approval registered. */
  support_id: string | null;
}

export interface InternalSupportRequest {
  id: string;
  number: number;
  status: RequestStatus;
  decision: InternalDecision | null;
  quotation_id: string;
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

/** `POST /quotations/{id}/support-requests`. */
export interface InternalRequestInput {
  version: number;
  supplier_code: string;
  requested_for: string;
  agreed_with: string;
  reason: string;
  items: { sku: string; requested_margin_pct: Decimal }[];
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
