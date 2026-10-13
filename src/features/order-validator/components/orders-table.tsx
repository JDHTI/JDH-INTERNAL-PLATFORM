"use client";

import { AlertTriangle, ArrowUp, ChevronDown } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { formatCop } from "@/features/supports/lib/format";

import { formatMarginPct, formatOrderDate } from "../lib/format";
import type { OrderLine, ValidationOrder } from "../types/order-validator.types";
import ApprovalSummary from "./approval-summary";
import OrderLines from "./order-lines";
import OrderLinesTable from "./order-lines-table";
import SelectBox from "./select-box";
import { LiquorTaxBadge, ManualApprovalBadge, MarginReleaseBadge, StatusBadge, ThresholdReleaseBadge } from "./status-badges";

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

const isPending = (order: ValidationOrder) => order.status === "pendiente_validacion";

/**
 * An order's lines in two groups: "N sin apoyo" (no support covers them) and
 * "N cumplen" (they meet their target). They stand in for a column per line,
 * so an order is one row. A group with no lines is not shown.
 */
function LineGroups({ order }: { order: ValidationOrder }) {
  // The API counts the lines with no support; if it does not, they are counted here.
  const withoutSupport =
    order.without_support_line_count ?? order.lines.filter((line: OrderLine) => line.reason === "sin_acuerdo").length;
  // Liquor products whose line came without the tax are held back for it: they are not "cumplen".
  const missingLiquorTax = order.lines.filter((line: OrderLine) => line.liquor_tax).length;
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
      {missingLiquorTax > 0 && (
        <li>
          <Badge
            tone="warning"
            className="px-1.5 py-0 text-xs leading-5"
            title="Falta el impuesto al licor: el producto lo tiene y la línea no lo trae."
          >
            <span className="tabular-nums">{missingLiquorTax}</span> falta impuesto
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
    order.operation_center ? `Centro ${order.operation_center}` : null,
    order.status_text,
  ].filter(Boolean);
  return <p className="px-4 py-1.5 text-xs text-text-secondary">{parts.join(" · ")}</p>;
}

/** Desktop: one dense row per order, its lines in a dense table when opened. */
export function OrdersTable({
  rows,
  expanded,
  canManage,
  selected,
  allSelected,
  someSelected,
  hasPending,
  onToggle,
  onSelect,
  onSelectAll,
  onRevoke,
  onOpenSupport,
}: OrdersViewProps & { allSelected: boolean; someSelected: boolean; hasPending: boolean; onSelectAll: () => void }) {
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
                  disabled={!hasPending}
                  onChange={onSelectAll}
                  label="Seleccionar todos los pedidos pendientes de esta página"
                />
              </th>
            )}
            <th scope="col" className="px-2 py-1.5">Pedido</th>
            <th scope="col" className="px-2 py-1.5">Estado</th>
            <th scope="col" className="px-2 py-1.5">Cliente</th>
            <th scope="col" className="px-2 py-1.5 text-right">Margen pedido</th>
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
                  // An order the threshold releases is tinted as well as flagged, so it is found at a glance.
                  order.released_by_threshold && "bg-info-surface",
                  isSelected && "bg-primary-subtle"
                )}
              >
                {canManage && (
                  <td className="px-2 py-1">
                    {isPending(order) && (
                      <SelectBox checked={isSelected} onChange={() => onSelect(order.document)} label={`Seleccionar el pedido ${order.document}`} />
                    )}
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
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <StatusBadge status={order.status} label={order.status_label} />
                    {order.manual_approval && <ManualApprovalBadge compact />}
                    {order.released_by_threshold ? (
                      <ThresholdReleaseBadge compact />
                    ) : (
                      order.release_basis === "margen" && <MarginReleaseBadge compact />
                    )}
                    {order.has_liquor_tax && <LiquorTaxBadge compact />}
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
                    <ApprovalSummary order={order} canManage={canManage} onRevoke={() => onRevoke(order.document)} />
                    <OrderLinesTable lines={order.lines} onOpenSupport={onOpenSupport} />
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
                  {isPending(order) && (
                    <SelectBox
                      checked={selected.has(order.document)}
                      onChange={() => onSelect(order.document)}
                      label={`Seleccionar el pedido ${order.document}`}
                    />
                  )}
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
                  <StatusBadge status={order.status} label={order.status_label} />
                  {order.manual_approval && <ManualApprovalBadge />}
                  {order.released_by_threshold ? (
                    <ThresholdReleaseBadge />
                  ) : (
                    order.release_basis === "margen" && <MarginReleaseBadge />
                  )}
                  {order.has_liquor_tax && <LiquorTaxBadge />}
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
                <ApprovalSummary order={order} canManage={canManage} onRevoke={() => onRevoke(order.document)} />
                <OrderLines lines={order.lines} onOpenSupport={onOpenSupport} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
