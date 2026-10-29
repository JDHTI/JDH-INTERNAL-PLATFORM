import type { Decimal } from "@/shared/lib/format";
import type { SupplierSupport } from "./support.types";

export interface SupportPermissions { can_manage: boolean; can_request: boolean; can_review: boolean }
export type RequestStatus = "pendiente" | "aprobada" | "rechazada";
export interface SupportRequest {
  id: string; support_id: string; mode: "porcentaje" | "costo_neto";
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
