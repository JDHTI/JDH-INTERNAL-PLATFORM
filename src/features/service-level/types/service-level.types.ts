import type { SortOrder } from "@/shared/components/sort-header";
import type { Decimal } from "@/shared/lib/format";

export type { SortOrder };

/** The two views, by their API permission key. */
export type ServiceLevelModuleKey = "pendientes-pedidos" | "nivel-servicio";

export interface ServiceLevelPermissions {
  modules: Record<ServiceLevelModuleKey, { can_read: boolean; can_manage: boolean }>;
  /** Gives reasons to lines, keeps the reasons' catalog and recalculates the ABCD. */
  can_manage: boolean;
}

export interface ServiceLevelReason {
  id: string;
  code: string;
  name: string;
  responsible: string;
  is_active: boolean;
  sort_order: number;
}

/** Green above `green_above`, amber from `amber_from`, red below. Fractions. */
export interface Bands {
  green_above: Decimal;
  amber_from: Decimal;
}

/** Sums and service levels; the levels are fractions (0.995 is 99,5 %), null when nothing was asked. */
export interface Kpis {
  orders: number;
  orders_pending: number;
  lines: number;
  lines_pending: number;
  qty: Decimal;
  qty_pending: Decimal;
  value: Decimal;
  value_served: Decimal;
  value_pending: Decimal;
  ns_orders: Decimal | null;
  ns_lines: Decimal | null;
  ns_qty: Decimal | null;
  ns_value: Decimal | null;
  ns_total: Decimal | null;
}

export type AbcdClass = "A" | "B" | "C" | "D";

export interface ServiceLevelLine {
  line_key: string;
  order_key: string;
  document: string | null;
  co: string | null;
  co_name: string | null;
  order_date: string;
  /** The order's last change in SIESA. */
  updated_at: string | null;
  warehouse_code: string | null;
  warehouse_name: string | null;
  sku: string;
  description: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  customer_key: string | null;
  customer_nit: string | null;
  customer_name: string | null;
  customer_branch: string | null;
  seller_key: string | null;
  seller_name: string | null;
  qty_ordered: Decimal;
  qty_dispatched: Decimal;
  qty_pending: Decimal;
  value_ordered: Decimal;
  value_pending: Decimal;
  is_pending: boolean;
  reason: { id: string; name: string; responsible: string } | null;
  note: string | null;
  reason_by: string | null;
  reason_at: string | null;
  product_class: string | null;
  customer_class: string | null;
}

export interface LinesPage {
  items: ServiceLevelLine[];
  total: number;
  page: number;
  size: number;
  since: string;
  until: string;
  /** The KPIs of every line of the filter, not only the page. */
  kpis: Kpis;
  bands: Bands;
  /** When the job last copied the lines from the DWH; null before the first copy. */
  as_of: string | null;
}

export type LineSort = "date" | "document" | "co" | "sku" | "supplier" | "customer" | "seller" | "qty_pending" | "value_pending" | "value";

/** The filters every read takes. Empty strings are «every value»; empty dates are the current month. */
export interface ServiceLevelFilters {
  since: string;
  until: string;
  co: string;
  warehouse: string;
  supplier: string;
  seller: string;
  customer: string;
  q: string;
  /** A reason id, or «none» for the lines without one. */
  reason: string;
  responsible: string;
  product_class: AbcdClass | "none" | "";
  customer_class: AbcdClass | "none" | "";
}

export interface LineParams extends ServiceLevelFilters {
  pending: boolean;
  sort: LineSort;
  order: SortOrder;
  page: number;
  size: number;
}

/** The lines that share a key. `ns_value` = served / asked; `pending_pct` = 1 − it. */
export interface Group {
  key: string | null;
  name: string | null;
  /** The product of a reason × product row. */
  detail_key: string | null;
  detail_name: string | null;
  orders: number;
  orders_pending: number;
  lines: number;
  lines_pending: number;
  qty: Decimal;
  qty_pending: Decimal;
  value: Decimal;
  value_served: Decimal;
  value_pending: Decimal;
  ns_value: Decimal | null;
  pending_pct: Decimal | null;
}

export interface ClassRun {
  id: string;
  period_from: string;
  period_to: string;
  computed_at: string;
  /** Null: the daily job. */
  computed_by: string | null;
  /** «producto» or «cliente» → class → items. */
  counts: Record<string, Record<string, number>>;
}

export interface Dashboard {
  since: string;
  until: string;
  kpis: Kpis;
  bands: Bands;
  by_co: { co: string | null; name: string | null; kpis: Kpis }[];
  daily: { day: string; kpis: Kpis }[];
  /** The pending value by responsible; lines with nothing pending are out. */
  by_responsible: Group[];
  as_of: string | null;
  classes: ClassRun | null;
}

export type Dimension =
  | "co"
  | "warehouse"
  | "supplier"
  | "seller"
  | "customer"
  | "responsible"
  | "reason"
  | "product"
  | "reason_item"
  | "product_class"
  | "customer_class";

export type GroupSort = "value" | "value_pending" | "qty_pending" | "ns_value" | "name" | "key";

export interface BreakdownParams extends ServiceLevelFilters {
  dimension: Dimension;
  sort: GroupSort;
  order: SortOrder;
  page: number;
  size: number;
}

export interface BreakdownPage {
  dimension: Dimension;
  items: Group[];
  total: number;
  page: number;
  size: number;
}

export type ParetoKind = "producto" | "cliente";

export interface Pareto {
  kind: ParetoKind;
  co: string | null;
  items: number;
  /** From (0, 0) to (1, 1): `items` of the items ask for `value` of the value. */
  points: { items: Decimal; value: Decimal }[];
  run: ClassRun | null;
}

export interface ClassStatus {
  /** The closed months the next calculation reads. */
  window_from: string;
  window_to: string;
  cuts: { a: Decimal; b: Decimal; c: Decimal };
  run: ClassRun | null;
}

export interface Choice {
  code: string;
  name: string;
}

export interface ServiceLevelOptions {
  cos: Choice[];
  warehouses: Choice[];
  suppliers: Choice[];
  sellers: Choice[];
  responsibles: string[];
}
