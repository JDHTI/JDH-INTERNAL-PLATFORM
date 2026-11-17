import type { Decimal } from "@/shared/lib/format";
import type { SupplierSupport } from "./support.types";

export interface SupportPermissions {
  can_manage: boolean; can_request: boolean; can_review: boolean;
  /** BI or a designated user: decides the internal supports asked from the quoter. */
  can_review_internal?: boolean;
  /** Asked internal supports from the quoter: sees their own. */
  can_request_internal?: boolean;
}
export type RequestStatus = "pendiente" | "aprobada" | "rechazada";
export type RequestMode = "margen_minimo" | "porcentaje" | "costo_neto";
export interface SupportRequest {
  /** margen_minimo since rules v2; porcentaje and costo_neto are the earlier requests, still decided. */
  id: string; support_id: string; mode: RequestMode;
  supplier_name?: string | null; supplier_code?: string | null;
  value: Decimal; reason: string; status: RequestStatus; requested_by: string;
  created_at: string; version: number; support_version: number;
  snapshot: Partial<SupplierSupport>; decided_by: string | null;
  decided_at: string | null; decision_reason: string | null;
}
export interface SupportEvent {
  id: string; event_type: string; actor: string; created_at: string;
  reason: string | null; request_id: string | null; support_id: string;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
}
export interface RequestDetail extends SupportRequest { support: SupplierSupport; events: SupportEvent[] }
export interface RequestPage { items: SupportRequest[]; total: number; page: number; size: number }
export interface RequestParams { page: number; size: number; status?: RequestStatus; q?: string; mine?: boolean }
export interface BatchRequestItem { support_id: string; version: number; value: number; reason: string }
