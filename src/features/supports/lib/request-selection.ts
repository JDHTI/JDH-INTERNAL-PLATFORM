import type { SupplierSupport } from "../types/support.types";

export function requestEligible(support: SupplierSupport): boolean {
  return support.state === "vigente" && !support.needs_review && support.commercial_supplier_id !== null && Boolean(support.commercial_supplier_id ?? support.supplier_code);
}
export function sameRequestScope(a: SupplierSupport, b: SupplierSupport): boolean {
  // Never infer a shared supplier from an empty identity or a display name.
  const supplierA = a.commercial_supplier_id ?? a.supplier_code;
  const supplierB = b.commercial_supplier_id ?? b.supplier_code;
  if (!supplierA || !supplierB || supplierA !== supplierB) return a.id === b.id;
  if (a.customer_nit !== b.customer_nit) return false;
  return a.customer_nit !== null || (a.customer_group === b.customer_group && a.customer_name === b.customer_name && (a.customer_branch_id ?? null) === (b.customer_branch_id ?? null));
}
export function requestSelectionError(items: SupplierSupport[]): string | null {
  if (!items.length) return "Selecciona al menos un apoyo.";
  if (items.length > 100) return "Puedes solicitar hasta 100 apoyos a la vez.";
  if (new Set(items.map(item => item.id)).size !== items.length) return "La selección contiene registros repetidos.";
  if (items.some(item => !requestEligible(item))) return "Selecciona acuerdos vigentes, habilitados y sin revisión pendiente.";
  if (items.some(item => !sameRequestScope(items[0], item))) return "Selecciona apoyos del mismo proveedor y cliente. Sin NIT deben coincidir el grupo y el alcance del cliente.";
  return null;
}
