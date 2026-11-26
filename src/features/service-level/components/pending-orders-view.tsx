"use client";

import { useState } from "react";
import { CloudOff, FileX2, ListChecks, NotebookPen, RefreshCw, Tags } from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import ReasonPicker, { type PickerReason } from "@/shared/components/reason-picker";
import SortHeader, { td, type SortOrder } from "@/shared/components/sort-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { formatIsoRange } from "@/shared/components/ui/date-range-picker";
import { cn } from "@/shared/lib/utils";

import { useLines, useServiceLevelReasons, useSetLineReason } from "../hooks/use-service-level";
import { formatCop, formatDay, formatDayOf, formatNumber, formatWhen } from "../lib/format";
import type { LineSort, ServiceLevelFilters, ServiceLevelLine, ServiceLevelPermissions } from "../types/service-level.types";
import AssignReasonDialog, { type Assignment } from "./assign-reason-dialog";
import KpiCards from "./kpi-cards";
import ReasonsDialog from "./reasons-dialog";
import ServiceLevelFilterPanel, { EMPTY_FILTERS, hasFilters } from "./service-level-filters";

const PAGE_SIZE = 50;
const count = new Intl.NumberFormat("es-CO");

/**
 * The lines of the fulfilled orders that left something undispatched, with
 * the KPIs of the whole filter above. Whoever manages gives each pending line
 * its reason from the row, or one reason to several marked lines at once.
 */
export default function PendingOrdersView({ permissions }: { permissions: ServiceLevelPermissions }) {
  const canManage = permissions.can_manage;
  const [filters, setFilters] = useState<ServiceLevelFilters>(EMPTY_FILTERS);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [sort, setSort] = useState<LineSort>("value_pending");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const q = useDebouncedValue(filters.q.trim());
  const query = useLines({ ...filters, q, pending: pendingOnly, sort, order, page, size: PAGE_SIZE });
  const reasons = useServiceLevelReasons();
  const result = query.data;
  const rows = result?.items ?? [];
  const period = result ? formatIsoRange({ from: result.since, to: result.until }) : "";

  // The selection belongs to the filter it was made under: another filter starts empty.
  const filterKey = JSON.stringify([filters, q, pendingOnly]);
  const [picked, setPicked] = useState<{ key: string; keys: Set<string> }>({ key: "", keys: new Set() });
  const selected = picked.key === filterKey ? picked.keys : new Set<string>();
  const pagePending = rows.filter((row) => row.is_pending).map((row) => row.line_key);
  const toggle = (lineKey: string) => {
    const next = new Set(selected);
    if (next.has(lineKey)) next.delete(lineKey);
    else next.add(lineKey);
    setPicked({ key: filterKey, keys: next });
  };
  const togglePage = (on: boolean) => {
    const next = new Set(selected);
    for (const lineKey of pagePending) {
      if (on) next.add(lineKey);
      else next.delete(lineKey);
    }
    setPicked({ key: filterKey, keys: next });
  };
  const clearSelection = () => setPicked({ key: filterKey, keys: new Set() });

  const change = (next: ServiceLevelFilters) => {
    setFilters(next);
    setPage(1);
  };
  const changeSort = (field: LineSort, direction: SortOrder) => {
    setSort(field);
    setOrder(direction);
    setPage(1);
  };
  const sortProps = { sort, order, onSort: changeSort, onReset: () => changeSort("value_pending", "desc") };
  const filtered = hasFilters(filters);
  const allChecked = pagePending.length > 0 && pagePending.every((lineKey) => selected.has(lineKey));
  const someChecked = pagePending.some((lineKey) => selected.has(lineKey));

  return (
    <div className="space-y-3">
      <ServiceLevelFilterPanel
        filters={filters}
        onChange={change}
        period={result ? { since: result.since, until: result.until } : null}
        chips={
          <ToggleChip
            active={pendingOnly}
            onClick={() => {
              setPendingOnly((current) => !current);
              setPage(1);
            }}
            title="Apagado, la tabla muestra también las líneas que se despacharon completas"
          >
            Solo líneas con pendiente
          </ToggleChip>
        }
        end={
          canManage && (
            <Button variant="outline" size="sm" onClick={() => setCatalogOpen(true)}>
              <Tags aria-hidden="true" /> Motivos
            </Button>
          )
        }
      />

      <KpiCards kpis={result?.kpis} bands={result?.bands} compact />

      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2" role="region" aria-label="Líneas seleccionadas">
          <span className="text-sm tabular-nums">
            {count.format(selected.size)} {selected.size === 1 ? "línea seleccionada" : "líneas seleccionadas"}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Quitar la selección
            </Button>
            <Button size="sm" onClick={() => setAssignment({ lineKeys: [...selected], reasonId: null, note: "" })}>
              <ListChecks aria-hidden="true" /> Asignar motivo
            </Button>
          </div>
        </div>
      )}

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando las líneas" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las líneas"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        result?.as_of === null ? (
          <StatePanel icon={FileX2} title="Todavía no hay pedidos copiados">
            La plataforma copia los pedidos cumplidos del DWH de lunes a sábado después de las 11:50. Esta vista se llena con la
            primera copia.
          </StatePanel>
        ) : filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ninguna línea coincide con los filtros"
            action={
              <Button variant="outline" onClick={() => change({ ...EMPTY_FILTERS, since: filters.since, until: filters.until })}>
                Limpiar filtros
              </Button>
            }
          >
            {period}. Prueba con otro periodo o quita algún filtro.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title={pendingOnly ? "Ningún pedido cumplido dejó pendientes en el periodo" : "No hay pedidos cumplidos en el periodo"}>
            {period}.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <ul className="space-y-2 md:hidden" aria-label="Líneas de pedidos">
            {rows.map((row) => (
              <LineCard
                key={row.line_key}
                row={row}
                reasons={reasons.data}
                canManage={canManage}
                checked={selected.has(row.line_key)}
                onToggle={() => toggle(row.line_key)}
                onNote={() => setAssignment({ lineKeys: [row.line_key], reasonId: row.reason?.id ?? null, note: row.note ?? "" })}
              />
            ))}
          </ul>

          <div className="relative hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[56rem] table-fixed text-left text-sm">
              <caption className="sr-only">Líneas de pedidos cumplidos, {period}</caption>
              <colgroup>
                {canManage && <col style={{ width: "2.5rem" }} />}
                <col style={{ width: "13%" }} />
                <col />
                <col style={{ width: "16%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {canManage && (
                    <th scope="col" className="py-1.5 pl-3 pr-0 align-middle">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(element) => {
                          if (element) element.indeterminate = someChecked && !allChecked;
                        }}
                        onChange={(event) => togglePage(event.target.checked)}
                        disabled={pagePending.length === 0}
                        aria-label="Seleccionar las líneas con pendiente de esta página"
                        className="size-4 accent-[var(--primary)]"
                      />
                    </th>
                  )}
                  <SortHeader
                    label="Pedido"
                    fields={[
                      ["date", "Fecha"],
                      ["document", "Documento"],
                      ["co", "C.O."],
                    ]}
                    {...sortProps}
                  />
                  <SortHeader
                    label="Producto"
                    fields={[
                      ["sku", "Referencia"],
                      ["supplier", "Proveedor"],
                    ]}
                    {...sortProps}
                  />
                  <SortHeader
                    label="Cliente"
                    fields={[
                      ["customer", "Cliente"],
                      ["seller", "Vendedor"],
                    ]}
                    {...sortProps}
                  />
                  <SortHeader label="Cantidad" fields={[["qty_pending", "Pendiente"]]} className="text-right" {...sortProps} />
                  <SortHeader
                    label="Valor"
                    fields={[
                      ["value", "Subtotal"],
                      ["value_pending", "Pendiente"],
                    ]}
                    className="text-right"
                    {...sortProps}
                  />
                  <SortHeader label="Motivo" {...sortProps} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.line_key} className="hover:bg-primary-subtle">
                    {canManage && (
                      <td className="py-2 pl-3 pr-0 align-top">
                        {row.is_pending && (
                          <input
                            type="checkbox"
                            checked={selected.has(row.line_key)}
                            onChange={() => toggle(row.line_key)}
                            aria-label={`Seleccionar ${row.document ?? "la línea"}, referencia ${row.sku}`}
                            className="mt-0.5 size-4 accent-[var(--primary)]"
                          />
                        )}
                      </td>
                    )}
                    <td className={td}>
                      <OrderCell row={row} />
                    </td>
                    <td className={td}>
                      <ProductCell row={row} />
                    </td>
                    <td className={td}>
                      <CustomerCell row={row} />
                    </td>
                    <td className={cn(td, "text-right")}>
                      <QuantityCell row={row} />
                    </td>
                    <td className={cn(td, "text-right")}>
                      <ValueCell row={row} />
                    </td>
                    <td className={td}>
                      <ReasonCell
                        row={row}
                        reasons={reasons.data}
                        canManage={canManage}
                        onNote={() => setAssignment({ lineKeys: [row.line_key], reasonId: row.reason?.id ?? null, note: row.note ?? "" })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs tabular-nums text-text-secondary">
                {count.format(result.total)} {result.total === 1 ? "línea" : "líneas"} · {period}
                {result.as_of && <> · Copia del DWH del {formatWhen(result.as_of)}</>}
              </p>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
          {query.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(query.error)}
            </p>
          )}
        </div>
      )}

      <AssignReasonDialog assignment={assignment} reasons={reasons.data} onClose={() => setAssignment(null)} onDone={clearSelection} />
      <ReasonsDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}

const secondary = "block truncate text-xs text-text-secondary";

/** A neutral chip for the place and the class, as in Costos. */
function Tag({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex max-w-full items-center truncate rounded-sm bg-canvas-subtle px-1.5 py-0.5 text-[11px] font-medium text-text-primary">
      {children}
    </span>
  );
}

function OrderCell({ row }: { row: ServiceLevelLine }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block truncate font-medium" title={row.document ?? undefined}>
        {row.document ?? "—"}
      </span>
      <span className={cn(secondary, "tabular-nums")}>{formatDay(row.order_date)}</span>
      {row.co_name && <Tag title={`C.O. ${row.co ?? ""}`}>{row.co_name}</Tag>}
      {row.updated_at && (
        <span className={cn(secondary, "tabular-nums")} title={`Última modificación del pedido en SIESA: ${formatWhen(row.updated_at)}`}>
          Act. {formatDayOf(row.updated_at)}
        </span>
      )}
    </div>
  );
}

function ProductCell({ row }: { row: ServiceLevelLine }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block truncate" title={row.description ?? undefined}>
        <span className="font-mono text-xs">{row.sku}</span> {row.description}
      </span>
      <span className={secondary} title={row.supplier_name ?? undefined}>
        {row.supplier_name ?? "Sin proveedor"}
      </span>
      <span className="flex flex-wrap gap-1">
        {row.warehouse_name && <Tag title={`Bodega ${row.warehouse_code ?? ""}`}>{row.warehouse_name}</Tag>}
        <Tag title="Clase ABCD de la referencia en su C.O.">{row.product_class ? `Clase ${row.product_class}` : "Sin clase"}</Tag>
      </span>
    </div>
  );
}

function CustomerCell({ row }: { row: ServiceLevelLine }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block truncate" title={row.customer_name ?? undefined}>
        {row.customer_name ?? "—"}
      </span>
      <span className={cn(secondary, "tabular-nums")}>NIT {row.customer_nit ?? "—"}</span>
      <span className={secondary} title={row.seller_name ?? undefined}>
        {row.seller_name ?? "Sin vendedor"}
      </span>
      <Tag title="Clase ABCD del cliente por NIT">{row.customer_class ? `Clase ${row.customer_class}` : "Sin clase"}</Tag>
    </div>
  );
}

function QuantityCell({ row }: { row: ServiceLevelLine }) {
  return (
    <dl className="space-y-0.5 tabular-nums">
      <div title="Pedida">
        <dt className="sr-only">Pedida</dt>
        <dd>{formatNumber(row.qty_ordered)}</dd>
      </div>
      <div className="text-xs text-text-secondary" title="Despachada">
        <dt className="sr-only">Despachada</dt>
        <dd>Desp. {formatNumber(row.qty_dispatched)}</dd>
      </div>
      <div className={cn("text-xs", row.is_pending ? "font-semibold" : "text-text-secondary")} title="Pendiente">
        <dt className="sr-only">Pendiente</dt>
        <dd>Pend. {formatNumber(row.qty_pending)}</dd>
      </div>
    </dl>
  );
}

function ValueCell({ row }: { row: ServiceLevelLine }) {
  return (
    <dl className="space-y-0.5 tabular-nums">
      <div title="Subtotal: bruto menos descuentos, sin impuestos">
        <dt className="sr-only">Subtotal</dt>
        <dd>{formatCop(row.value_ordered)}</dd>
      </div>
      <div className={cn("text-xs", row.is_pending ? "font-semibold" : "text-text-secondary")} title="Valor pendiente">
        <dt className="sr-only">Pendiente</dt>
        <dd>Pend. {formatCop(row.value_pending)}</dd>
      </div>
    </dl>
  );
}

/** The line's one reason, who answers for it and the note. Only a pending line takes a reason. */
function ReasonCell({
  row,
  reasons,
  canManage,
  onNote,
}: {
  row: ServiceLevelLine;
  reasons: PickerReason[] | undefined;
  canManage: boolean;
  onNote: () => void;
}) {
  const save = useSetLineReason();
  if (!row.is_pending) {
    return <span className="text-xs text-text-secondary">Despachada completa</span>;
  }
  return (
    <div className="min-w-0 space-y-1">
      {canManage ? (
        <div className="flex items-center gap-1">
          <ReasonPicker
            reasons={reasons}
            value={row.reason?.id ?? null}
            valueName={row.reason?.name}
            saving={save.isPending}
            label={`Motivo de ${row.document ?? "la línea"}, referencia ${row.sku}`}
            onChange={(reasonId) =>
              save.mutate(
                { lineKey: row.line_key, reasonId, note: reasonId === null ? null : row.note },
                { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
              )
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 max-md:size-11"
            onClick={onNote}
            aria-label={`Nota de ${row.document ?? "la línea"}, referencia ${row.sku}`}
            title={row.note ? "Editar la nota" : "Agregar una nota"}
          >
            <NotebookPen className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <span className={cn("block truncate text-xs", !row.reason && "text-text-secondary")} title={row.reason?.name}>
          {row.reason?.name ?? "Sin motivo"}
        </span>
      )}
      {row.reason && <span className={secondary}>{row.reason.responsible}</span>}
      {row.note && (
        <span className="line-clamp-2 text-xs text-text-secondary" title={row.note}>
          {row.note}
        </span>
      )}
    </div>
  );
}

function LineCard({
  row,
  reasons,
  canManage,
  checked,
  onToggle,
  onNote,
}: {
  row: ServiceLevelLine;
  reasons: PickerReason[] | undefined;
  canManage: boolean;
  checked: boolean;
  onToggle: () => void;
  onNote: () => void;
}) {
  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <OrderCell row={row} />
        {canManage && row.is_pending && (
          <label className="flex size-11 items-center justify-center">
            <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Seleccionar ${row.document ?? "la línea"}, referencia ${row.sku}`} className="size-4 accent-[var(--primary)]" />
          </label>
        )}
      </div>
      <ProductCell row={row} />
      <CustomerCell row={row} />
      <div className="grid grid-cols-2 gap-3">
        <QuantityCell row={row} />
        <ValueCell row={row} />
      </div>
      <ReasonCell row={row} reasons={reasons} canManage={canManage} onNote={onNote} />
    </li>
  );
}
