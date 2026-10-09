import { Boxes, Building, Factory, Users, type LucideIcon } from "lucide-react";

import type { CommercialMasterKey } from "../types/commercial-master.types";

export type ColumnKind = "text" | "mono" | "active" | "count" | "pct" | "nits";

export interface MasterColumn {
  key: string;
  label: string;
  kind?: ColumnKind;
}

export interface CommercialMasterDef {
  key: CommercialMasterKey;
  name: string;
  icon: LucideIcon;
  endpoint: string;
  description: string;
  searchPlaceholder: string;
  /** Fields that together identify a row; NIT alone repeats per branch. */
  rowKey: string[];
  columns: MasterColumn[];
}

/**
 * The four general masters, in the order the sidebar lists them. The route
 * segment, the endpoint and the columns of each live here so the table and
 * the navigation cannot drift apart.
 */
export const COMMERCIAL_MASTERS: CommercialMasterDef[] = [
  {
    key: "proveedores-comerciales",
    name: "Proveedores comerciales",
    icon: Factory,
    endpoint: "/commercial/suppliers",
    description: "Proveedores con los que se negocia, con sus productos y los NIT que los respaldan.",
    searchPlaceholder: "Buscar por código o nombre",
    rowKey: ["code"],
    columns: [
      { key: "code", label: "Código", kind: "mono" },
      { key: "name", label: "Nombre" },
      { key: "is_active", label: "Estado", kind: "active" },
      { key: "product_count", label: "Productos", kind: "count" },
      { key: "active_product_count", label: "Activos", kind: "count" },
      { key: "list_margin_pct", label: "Margen de lista", kind: "pct" },
      { key: "list_margin_notes", label: "Notas del margen" },
      { key: "nits", label: "NIT", kind: "nits" },
    ],
  },
  {
    key: "proveedores-legales",
    name: "Proveedores legales",
    icon: Building,
    endpoint: "/commercial/legal-suppliers",
    description: "Terceros proveedores a quienes se les factura y paga, una fila por sucursal.",
    searchPlaceholder: "Buscar por NIT o razón social",
    rowKey: ["nit", "branch_id"],
    columns: [
      { key: "nit", label: "NIT", kind: "mono" },
      { key: "branch_id", label: "Sucursal", kind: "mono" },
      { key: "legal_name", label: "Razón social" },
      { key: "branch_name", label: "Nombre de sucursal" },
      { key: "supplier_class", label: "Clase" },
      { key: "supplier_type", label: "Tipo" },
      { key: "city", label: "Ciudad" },
      { key: "payment_condition", label: "Condición de pago" },
      { key: "state", label: "Estado del tercero" },
      { key: "branch_state", label: "Estado de sucursal" },
      { key: "is_active", label: "Activo", kind: "active" },
    ],
  },
  {
    key: "clientes",
    name: "Clientes",
    icon: Users,
    endpoint: "/commercial/customers",
    description: "Clientes con su canal, unidad de negocio y vendedor, una fila por sucursal.",
    searchPlaceholder: "Buscar por NIT, razón social o establecimiento",
    rowKey: ["nit", "branch_id"],
    columns: [
      { key: "nit", label: "NIT", kind: "mono" },
      { key: "branch_id", label: "Sucursal", kind: "mono" },
      { key: "legal_name", label: "Razón social" },
      { key: "branch_name", label: "Nombre de sucursal" },
      { key: "establishment_name", label: "Establecimiento" },
      { key: "channel", label: "Canal" },
      { key: "business_unit", label: "Unidad de negocio" },
      { key: "business_group", label: "Grupo" },
      { key: "billing_center", label: "Centro de facturación" },
      { key: "logistics_zone", label: "Zona logística" },
      { key: "department", label: "Departamento" },
      { key: "city", label: "Ciudad" },
      { key: "salesperson_name", label: "Vendedor" },
      { key: "is_active", label: "Activo", kind: "active" },
    ],
  },
  {
    key: "productos",
    name: "Productos",
    icon: Boxes,
    endpoint: "/commercial/products",
    description: "Catálogo de productos con su proveedor comercial, marca y clasificación.",
    searchPlaceholder: "Buscar por SKU, descripción o código de barras",
    rowKey: ["sku"],
    columns: [
      { key: "sku", label: "SKU", kind: "mono" },
      { key: "supplier_sku", label: "SKU del proveedor", kind: "mono" },
      { key: "description", label: "Descripción" },
      { key: "is_active", label: "Activo", kind: "active" },
      { key: "commercial_supplier_code", label: "Proveedor comercial", kind: "mono" },
      { key: "manufacturer", label: "Fabricante" },
      { key: "brand", label: "Marca" },
      { key: "category", label: "Categoría" },
      { key: "subcategory", label: "Subcategoría" },
      { key: "product_line", label: "Línea" },
      { key: "pack_factor", label: "Factor de empaque", kind: "count" },
      { key: "inventory_unit", label: "Unidad" },
      { key: "main_barcode", label: "Código de barras", kind: "mono" },
    ],
  },
];

export function findCommercialMaster(key: string): CommercialMasterDef | undefined {
  return COMMERCIAL_MASTERS.find((master) => master.key === key);
}

export const MASTERS_SEGMENT = "maestros";
