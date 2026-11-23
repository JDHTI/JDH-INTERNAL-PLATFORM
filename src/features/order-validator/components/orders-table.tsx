"use client";

import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Menu, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { formatCop } from "@/features/supports/lib/format";

import { alertedRows, formatMarginPct, formatOrderDate } from "../lib/format";
import type { OrderLine, OrderSort, OrderSortColumn, ValidationOrder } from "../types/order-validator.types";
import ApprovalSummary from "./approval-summary";
import OrderLines from "./order-lines";
import OrderLinesTable from "./order-lines-table";
import SelectBox from "./select-box";
import {
  AlertBadge,
  MarginReleaseBadge,
  StatusBadge,
  ThresholdReleaseIcon,
  ToleranceReleaseBadge,
} from "./status-badges";

interface OrdersViewProps {
  rows: ValidationOrder[];
  expanded: Set<string>;
  canManage: boolean;
  selected: Set<string>;
  onToggle: (document: string) => void;
  onSelect: (document: string) => void;
  onRevoke: (document: string) => void;
  onOpenSupport: (supportId: string) => void;
}

/** Pending and ready orders can be marked as released; a released one only from its detail. */
const isSelectable = (order: ValidationOrder) => order.status !== "liberado";

/**
 * The status of an order and how it was released, the same in the table and on
 * the card. Alerts (100 % margin, below target, liquor tax) are not shown here:
 * they belong to the breakdown of each line in the order's detail.
 */
function OrderBadges({ order, compact = false }: { order: ValidationOrder; compact?: boolean }) {
  return (
    <>
      <StatusBadge status={order.status} label={order.status_label} />
      {/* "Por margen" stays; an order the threshold tipped over gets a small icon after it. */}
      {order.release_basis === "margen" && <MarginReleaseBadge compact={compact} />}
      {order.release_basis === "tolerancia" && <ToleranceReleaseBadge compact={compact} />}
      {order.released_by_threshold && <ThresholdReleaseIcon />}
    </>
  );
}

function SelectSlot({
  order,
  checked,
  onSelect,
}: {
  order: ValidationOrder;
  checked: boolean;
  onSelect: () => void;
}) {
  if (!isSelectable(order)) return null;
  return <SelectBox checked={checked} onChange={onSelect} label={`Seleccionar el pedido ${order.document}`} />;
}

/**
 * The order's alerts written out above its lines in the detail, with the file
 * rows they point at (those lines are marked in the list below).
 */
function OrderAlerts({ order }: { order: ValidationOrder; canManage: boolean }) {
  const alerts = order.alerts ?? [];
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-1.5 border-b border-border px-4 py-2.5 text-sm">
      {alerts.length > 0 && (
        <ul className="space-y-1.5" aria-label="Alertas del pedido">
          {alerts.map((alert) => (
            <li key={alert.code} className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <AlertBadge alert={alert} withMessage={false} />
              <span className="min-w-0 flex-1 basis-60">
                {alert.message}
                {alert.row_numbers.length > 0 && (
                  <span className="tabular-nums text-text-secondary">
                    {" "}
                    ({alert.row_numbers.length === 1 ? "fila" : "filas"} {alert.row_numbers.join(", ")})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * An order's lines in two groups: "N sin apoyo" (no support covers them) and
 * "N cumplen" (they meet their target). They stand in for a column per line,
 * so an order is one row. A group with no lines is not shown.
 */
function LineGroups({ order }: { order: ValidationOrder }) {
  // The API counts the lines with no support; if it does not, they are counted here.
  const withoutSupport =
    order.without_support_line_count ?? order.lines.filter((line: OrderLine) => line.reason === "sin_acuerdo").length;
  const meet = order.ready_line_count;

  return (
    <ul className="flex flex-wrap gap-1" aria-label="Líneas del pedido">
      {withoutSupport > 0 && (
        <li>
          <Badge tone="warning" className="px-1.5 py-0 text-xs leading-5">
            <span className="tabular-nums">{withoutSupport}</span> sin apoyo
          </Badge>
        </li>
      )}
      {meet > 0 && (
        <li>
          <Badge tone="success" className="px-1.5 py-0 text-xs leading-5">
            <span className="tabular-nums">{meet}</span> cumplen
          </Badge>
        </li>
      )}
    </ul>
  );
}

/**
 * The order's weighted margin against its target. With a threshold above zero
 * the margin the order is judged on is the one with the threshold added: that
 * single value is shown, in bold with an up arrow, and the margin without it
 * is in the tooltip. It is flagged when even that falls short of the target.
 */
function OrderMargin({ order, compact = false }: { order: ValidationOrder; compact?: boolean }) {
  const margin = toNumber(order.margin_pct);
  const withThreshold = toNumber(order.margin_with_threshold_pct);
  const target = toNumber(order.required_margin_pct);
  const judged = withThreshold ?? margin;
  const below = judged !== null && target !== null && judged < target;
  const raised = withThreshold !== null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums", (below || raised) && "font-semibold", below && "text-warning")}
      title={raised && margin !== null ? `Margen del pedido ${formatMarginPct(margin)} más el umbral` : undefined}
    >
      {below ? (
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        raised && <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {judged === null ? "—" : formatMarginPct(judged)}
      {raised && <span className="sr-only">, con el umbral sumado</span>}
      {below && <span className="sr-only">, por debajo del objetivo</span>}
      {compact && target !== null && <span className="font-normal text-text-secondary"> de {formatMarginPct(target)}</span>}
    </span>
  );
}

function OrderMeta({ order }: { order: ValidationOrder }) {
  const parts = [
    formatOrderDate(order.order_date),
    order.salesperson,
    order.channel,
    order.operation_center ? `C.O. ${order.operation_center}` : null,
    order.status_text,
  ].filter(Boolean);
  return <p className="px-4 py-1.5 text-xs text-text-secondary">{parts.join(" · ")}</p>;
}

/**
 * A header that sorts its column on the server, like the quoter's: the menu says it in words
 * («Mayor a menor», «Menor a mayor») and «Quitar el orden» goes back to the API's default, the
 * orders that need attention first. One column at a time; `aria-sort` says which.
 */
function SortHeader({
  label,
  column,
  sort,
  onSort,
  numeric = false,
}: {
  label: string;
  column: OrderSortColumn;
  sort: OrderSort;
  onSort: (sort: OrderSort) => void;
  /** A column of figures: the header and its menu line up on the right. */
  numeric?: boolean;
}) {
  const direction = sort === `${column}_asc` ? "asc" : sort === `${column}_desc` ? "desc" : null;
  const Icon = direction === null ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp;
  const words = direction === null ? null : direction === "desc" ? "mayor a menor" : "menor a mayor";
  return (
    <th
      scope="col"
      aria-sort={direction === null ? undefined : direction === "asc" ? "ascending" : "descending"}
      className={cn("px-2 py-1", numeric && "text-right")}
    >
      <Menu
        align={numeric ? "end" : "start"}
        trigger={
          <>
            <span>{label}</span>
            <Icon className={cn("size-3 shrink-0", direction ? "text-text-primary" : "text-text-secondary")} aria-hidden="true" />
          </>
        }
        triggerLabel={`Ordenar por ${label.toLowerCase()}${words ? `. Ahora: ${words}` : ""}`}
        triggerTitle={words ? `${label}, ordenado: ${words}` : `Ordenar por ${label.toLowerCase()}`}
        triggerClassName={cn(
          "inline-flex min-h-7 items-center gap-1 rounded-sm font-semibold uppercase tracking-[0.06em] hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          numeric && "ml-auto",
          direction && "text-text-primary"
        )}
      >
        <MenuRadioGroup
          value={direction ? `${column}_${direction}` : ""}
          label={`Orden por ${label.toLowerCase()}`}
          onValueChange={(next) => onSort(next as OrderSort)}
        >
          <MenuRadioItem value={`${column}_desc`}>Mayor a menor</MenuRadioItem>
          <MenuRadioItem value={`${column}_asc`}>Menor a mayor</MenuRadioItem>
        </MenuRadioGroup>
        {direction && (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => onSort("attention")}>Quitar el orden</MenuItem>
          </>
        )}
      </Menu>
    </th>
  );
}

/** Desktop: one dense row per order, its lines in a dense table when opened. */
export function OrdersTable({
  rows,
  expanded,
  canManage,
  selected,
  allSelected,
  someSelected,
  hasSelectable,
  onToggle,
  onSelect,
  onSelectAll,
  onRevoke,
  onOpenSupport,
  sort,
  onSort,
}: OrdersViewProps & {
  allSelected: boolean;
  someSelected: boolean;
  hasSelectable: boolean;
  onSelectAll: () => void;
  /** The server's order; the order number and the margin sort from their headers. */
  sort: OrderSort;
  onSort: (sort: OrderSort) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
      <table className="w-full min-w-[56rem] text-left text-[13px]">
        <caption className="sr-only">Pedidos del archivo con su estado de validación</caption>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            {canManage && (
              <th scope="col" className="w-9 px-2 py-1.5">
                <SelectBox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={!hasSelectable}
                  onChange={onSelectAll}
                  label="Seleccionar todos los pedidos sin liberar de esta página"
                />
              </th>
            )}
            <SortHeader label="Pedido" column="document" sort={sort} onSort={onSort} />
            <th scope="col" className="px-2 py-1.5">Estado</th>
            <th scope="col" className="px-2 py-1.5">Cliente</th>
            <SortHeader label="Margen pedido" column="margin" sort={sort} onSort={onSort} numeric />
            <th scope="col" className="px-2 py-1.5 text-right">Objetivo</th>
            <th scope="col" className="px-2 py-1.5">Líneas</th>
            <th scope="col" className="px-2 py-1.5 text-right">Valor</th>
          </tr>
        </thead>
        {rows.map((order) => {
          const open = expanded.has(order.document);
          const panelId = `order-${order.document}`;
          const isSelected = selected.has(order.document);
          const target = toNumber(order.required_margin_pct);
          return (
            <tbody key={order.document} className="border-t border-border">
              <tr
                className={cn(
                  "h-9 hover:bg-primary-subtle",
                  isSelected && "bg-primary-subtle"
                )}
              >
                {canManage && (
                  <td className="px-2 py-1">
                    <SelectSlot order={order} checked={isSelected} onSelect={() => onSelect(order.document)} />
                  </td>
                )}
                <td className="whitespace-nowrap px-2 py-1">
                  <button
                    type="button"
                    onClick={() => onToggle(order.document)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={`${open ? "Ocultar" : "Ver"} las líneas del pedido ${order.document}`}
                    className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ChevronDown className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-150", !open && "-rotate-90")} aria-hidden="true" />
                    <span className="font-mono">{order.document}</span>
                  </button>
                </td>
                <td className="px-2 py-1">
                  <span className="flex max-w-80 flex-wrap items-center gap-1 whitespace-nowrap">
                    <OrderBadges order={order} compact />
                  </span>
                </td>
                <td className="max-w-40 px-2 py-1">
                  <span className="block truncate font-medium" title={order.customer_name ?? undefined}>{order.customer_name ?? "Sin cliente"}</span>
                  <span className="block truncate text-xs text-text-secondary">
                    <span className="font-mono">{order.customer_nit ?? ""}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right">
                  <OrderMargin order={order} />
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{target === null ? "—" : formatMarginPct(target)}</td>
                <td className="max-w-52 px-2 py-1">
                  <LineGroups order={order} />
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{formatCop(order.total_amount)}</td>
              </tr>
              {open && (
                <tr id={panelId}>
                  <td colSpan={canManage ? 8 : 7} className="bg-canvas-subtle p-0">
                    <OrderMeta order={order} />
                    <OrderAlerts order={order} canManage={canManage} />
                    <ApprovalSummary order={order} canManage={canManage} onRevoke={() => onRevoke(order.document)} />
                    <OrderLinesTable lines={order.lines} alertedRows={alertedRows(order)} onOpenSupport={onOpenSupport} />
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/** Phone: one card per order with the same summary, its lines as blocks when opened. */
export function OrdersList({ rows, expanded, canManage, selected, onToggle, onSelect, onRevoke, onOpenSupport }: OrdersViewProps) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
      {rows.map((order) => {
        const open = expanded.has(order.document);
        const panelId = `order-${order.document}`;
        const target = toNumber(order.required_margin_pct);
        return (
          <li key={order.document}>
            <div className="flex items-start">
              {canManage && (
                <span className="flex min-h-14 w-11 shrink-0 items-center justify-center">
                  <SelectSlot order={order} checked={selected.has(order.document)} onSelect={() => onSelect(order.document)} />
                </span>
              )}
              <button
                type="button"
                onClick={() => onToggle(order.document)}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn(
                  "flex min-h-14 min-w-0 flex-1 flex-col gap-1.5 py-2.5 pr-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  canManage ? "pl-0" : "pl-3"
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px]">{order.document}</span>
                    <span className="block truncate text-sm font-medium">{order.customer_name ?? "Sin cliente"}</span>
                  </span>
                  <ChevronDown className={cn("mt-1 size-4 shrink-0 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <OrderBadges order={order} />
                </span>
                <span className="text-xs text-text-secondary">
                  Margen <OrderMargin order={order} /> {target !== null && <>· Objetivo {formatMarginPct(target)}</>} · {formatCop(order.total_amount)}
                </span>
                <LineGroups order={order} />
              </button>
            </div>
            {open && (
              <div id={panelId} className="border-t border-border bg-canvas-subtle">
                <OrderMeta order={order} />
                <OrderAlerts order={order} canManage={canManage} />
                <ApprovalSummary order={order} canManage={canManage} onRevoke={() => onRevoke(order.document)} />
                <OrderLines lines={order.lines} alertedRows={alertedRows(order)} onOpenSupport={onOpenSupport} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
