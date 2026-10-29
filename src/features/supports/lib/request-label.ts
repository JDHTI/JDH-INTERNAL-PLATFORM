import type { SupportRequest } from "../types/request.types";

export function requestSupplier(request: SupportRequest): string {
  return request.supplier_name || request.supplier_code || request.snapshot.supplier_name || request.snapshot.supplier_code || "Proveedor sin identificar";
}
