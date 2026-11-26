"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import OptionFilter from "@/shared/components/option-filter";
import Pager from "@/shared/components/pager";
import SortHeader, { td, type SortOrder } from "@/shared/components/sort-header";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatIsoRange } from "@/shared/components/ui/date-range-picker";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { ViewTab } from "@/shared/components/ui/view-tab";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useBreakdown, useClassStatus, useDashboard, usePareto, useRecomputeClasses } from "../hooks/use-service-level";
import { bandLook, bandOf, formatCop, formatDay, formatNumber, formatPct, formatWhen } from "../lib/format";
import type { Bands, Dashboard, Dimension, GroupSort, Kpis, ParetoKind, ServiceLevelFilters, ServiceLevelPermissions } from "../types/service-level.types";
import { CoLevels, DailyLevels, ParetoChart, ResponsibleBars } from "./charts";
import KpiCards from "./kpi-cards";
import ServiceLevelFilterPanel, { EMPTY_FILTERS } from "./service-level-filters";

const count = new Intl.NumberFormat("es-CO");

/**
 * The service-level board: the five levels, by C.O. and day by day, the
 * pending value by responsible, the breakdowns and the ABCD classes with
 * their Pareto curve. Every block reads the same filters.
 */
export default function ServiceLevelDashboard({ permissions }: { permissions: ServiceLevelPermissions }) {
  const [filters, setFilters] = useState<ServiceLevelFilters>(EMPTY_FILTERS);
  const q = useDebouncedValue(filters.q.trim());
  const applied = { ...filters, q };
  const query = useDashboard(applied);
  const board = query.data;

  return (
    <div className="space-y-4">
      <ServiceLevelFilterPanel filters={filters} onChange={setFilters} period={board ? { since: board.since, until: board.until } : null} />

      {!board && !query.isError ? (
        <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el tablero" />
      ) : !board ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo cargar el tablero"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : board.as_of === null && board.kpis.orders === 0 ? (
        <StatePanel icon={FileX2} title="Todavía no hay pedidos copiados">
          La plataforma copia los pedidos cumplidos del DWH de lunes a sábado después de las 11:50. El tablero se llena con la primera
          copia.
        </StatePanel>
      ) : (
        <div className={cn("space-y-4", query.isPlaceholderData && "opacity-60")}>
          <KpiCards kpis={board.kpis} bands={board.bands} />
          <p className="text-xs text-text-secondary">
            {formatIsoRange({ from: board.since, to: board.until })} · por fecha del pedido
            {board.as_of && <> · Copia del DWH del {formatWhen(board.as_of)}</>}
          </p>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="NS Valor por C.O." note="Las líneas punteadas marcan dónde empiezan el ámbar y el verde.">
              <CoLevels byCo={board.by_co} bands={board.bands} />
            </Panel>
            <Panel title="NS Total día a día">
              <DailyLevels daily={board.daily} bands={board.bands} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Panel title="Niveles por C.O.">
              <CoTable byCo={board.by_co} bands={board.bands} />
            </Panel>
            <Panel title="Valor pendiente por responsable">
              <ResponsibleBars groups={board.by_responsible} />
            </Panel>
          </div>

          <Breakdowns filters={applied} bands={board.bands} />
          <Classes board={board} canManage={permissions.can_manage} />
        </div>
      )}
    </div>
  );
}

function Panel({ title, note, end, children }: { title: string; note?: string; end?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4" aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {note && <p className="text-xs text-text-secondary">{note}</p>}
        </div>
        {end}
      </header>
      {children}
    </section>
  );
}

/** A level in its band: the badge carries the color and the figure, so the color never stands alone. */
function LevelBadge({ level, bands }: { level: Kpis["ns_value"]; bands: Bands }) {
  const band = bandOf(level, bands);
  if (!band) return <span className="text-text-secondary">—</span>;
  const look = bandLook(band, bands);
  return (
    <Badge tone={look.tone} title={look.label}>
      <span className="tabular-nums">{formatPct(level)}</span>
    </Badge>
  );
}

function CoTable({ byCo, bands }: { byCo: Dashboard["by_co"]; bands: Bands }) {
  if (byCo.length === 0) return <p className="text-sm text-text-secondary">Sin pedidos en el periodo.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Niveles de servicio por centro de operación</caption>
        <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr className="border-b border-border">
            <th scope="col" className="py-1.5 pr-2">C.O.</th>
            <th scope="col" className="px-2 py-1.5 text-right">Pedidos</th>
            <th scope="col" className="px-2 py-1.5 text-right">Líneas</th>
            <th scope="col" className="px-2 py-1.5 text-right">Cantidad</th>
            <th scope="col" className="px-2 py-1.5 text-right">Valor</th>
            <th scope="col" className="py-1.5 pl-2 text-right">NS Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {byCo.map((item) => (
            <tr key={item.co ?? "none"}>
              <th scope="row" className="py-1.5 pr-2 font-normal">
                {item.name ?? item.co ?? "Sin C.O."}
              </th>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatPct(item.kpis.ns_orders)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatPct(item.kpis.ns_lines)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatPct(item.kpis.ns_qty)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatPct(item.kpis.ns_value)}</td>
              <td className="py-1.5 pl-2 text-right">
                <LevelBadge level={item.kpis.ns_total} bands={bands} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DIMENSIONS: { key: Dimension; label: string; column: string; pendingOnly?: boolean }[] = [
  { key: "supplier", label: "Proveedor", column: "Proveedor" },
  { key: "seller", label: "Vendedor", column: "Vendedor" },
  { key: "customer", label: "Cliente", column: "Cliente" },
  { key: "warehouse", label: "Bodega", column: "Bodega" },
  { key: "responsible", label: "Responsable", column: "Responsable", pendingOnly: true },
  { key: "reason", label: "Motivo", column: "Motivo", pendingOnly: true },
  { key: "product", label: "Productos con pendiente", column: "Producto", pendingOnly: true },
  { key: "reason_item", label: "Motivo por ítem", column: "Motivo e ítem", pendingOnly: true },
  { key: "product_class", label: "Clase de producto", column: "Clase" },
  { key: "customer_class", label: "Clase de cliente", column: "Clase" },
];
const PAGE_SIZE = 20;

/** The lines grouped by one dimension at a time, with the value asked, invoiced and pending. */
function Breakdowns({ filters, bands }: { filters: ServiceLevelFilters; bands: Bands }) {
  const [dimension, setDimension] = useState<Dimension>("supplier");
  const [sort, setSort] = useState<GroupSort>("value");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const look = DIMENSIONS.find((item) => item.key === dimension)!;
  const pendingOnly = look.pendingOnly === true;
  // Grouped by what is pending, the sum asked is not the point: those tables open on the pending value.
  const query = useBreakdown({ ...filters, dimension, sort, order, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];
  const panelId = "service-level-breakdown";

  const choose = (next: Dimension) => {
    setDimension(next);
    setSort(DIMENSIONS.find((item) => item.key === next)?.pendingOnly ? "value_pending" : "value");
    setOrder("desc");
    setPage(1);
  };
  const changeSort = (field: GroupSort, direction: SortOrder) => {
    setSort(field);
    setOrder(direction);
    setPage(1);
  };
  const sortProps = { sort, order, onSort: changeSort, onReset: () => changeSort(pendingOnly ? "value_pending" : "value", "desc") };

  return (
    <Panel title="Desgloses" note={pendingOnly ? "Solo las líneas con pendiente." : undefined}>
      <div role="tablist" aria-label="Agrupar por" className="flex flex-wrap border-b border-border">
        {DIMENSIONS.map((item) => (
          <ViewTab key={item.key} selected={item.key === dimension} onSelect={() => choose(item.key)} controls={panelId}>
            <span className="whitespace-nowrap">{item.label}</span>
          </ViewTab>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-label={look.label}>
        {query.isPending ? (
          <div className="h-60 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el desglose" />
        ) : query.isError && !result ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(query.error)}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">Nada que agrupar con estos filtros.</p>
        ) : (
          <div className={cn("space-y-2", query.isPlaceholderData && "opacity-60")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] table-fixed text-left text-sm">
                <caption className="sr-only">Desglose por {look.label.toLowerCase()}</caption>
                <colgroup>
                  <col />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                  <tr>
                    <SortHeader
                      label={look.column}
                      fields={[
                        ["name", "Nombre"],
                        ["key", "Código"],
                      ]}
                      {...sortProps}
                    />
                    <SortHeader label="Valor solicitado" fields={[["value", "Valor solicitado"]]} className="text-right" {...sortProps} />
                    {pendingOnly ? (
                      <SortHeader label="Cantidad pendiente" fields={[["qty_pending", "Cantidad pendiente"]]} className="text-right" {...sortProps} />
                    ) : (
                      <SortHeader label="Valor facturado" title="Lo solicitado menos lo pendiente" className="text-right" {...sortProps} />
                    )}
                    {pendingOnly ? (
                      <SortHeader label="Valor pendiente" fields={[["value_pending", "Valor pendiente"]]} className="text-right" {...sortProps} />
                    ) : (
                      <SortHeader label="NS Valor" fields={[["ns_value", "NS Valor"]]} className="text-right" {...sortProps} />
                    )}
                    <SortHeader label="% pendiente" className="text-right" {...sortProps} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => (
                    <tr key={`${row.key ?? "none"}-${row.detail_key ?? ""}-${index}`} className="hover:bg-primary-subtle">
                      <td className={td}>
                        <span className="block truncate" title={row.name ?? undefined}>
                          {row.name || row.key || (dimension === "responsible" || dimension === "reason" || dimension === "reason_item" ? "Sin motivo" : "Sin dato")}
                        </span>
                        {row.detail_key && (
                          <span className="block truncate text-xs text-text-secondary" title={row.detail_name ?? undefined}>
                            <span className="font-mono">{row.detail_key}</span> {row.detail_name}
                          </span>
                        )}
                        {!row.detail_key && row.key && row.name && row.key !== row.name && <span className="block truncate text-xs text-text-secondary">{row.key}</span>}
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatCop(row.value)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{pendingOnly ? formatNumber(row.qty_pending) : formatCop(row.value_served)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{pendingOnly ? formatCop(row.value_pending) : <LevelBadge level={row.ns_value} bands={bands} />}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatPct(row.pending_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-text-secondary">
                  {count.format(result.total)} {result.total === 1 ? "grupo" : "grupos"}
                </span>
                <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

/** The last ABCD classification, its cuts, the months the next one reads and the Pareto curve. */
function Classes({ board, canManage }: { board: Dashboard; canManage: boolean }) {
  const [kind, setKind] = useState<ParetoKind>("producto");
  const [co, setCo] = useState("");
  const status = useClassStatus();
  const pareto = usePareto(kind, kind === "producto" ? co : "");
  const recompute = useRecomputeClasses();
  const run = status.data?.run ?? board.classes;
  const cuts = status.data ? [status.data.cuts.a, status.data.cuts.b, status.data.cuts.c].map((cut) => toNumber(cut) ?? 0) : [];
  const coOptions = board.by_co.filter((item) => item.co).map((item) => ({ value: item.co!, label: item.name ?? item.co! }));

  return (
    <Panel
      title="Clasificación ABCD"
      note="Ordena el valor solicitado de los meses cerrados: los productos dentro de cada C.O. y los clientes por NIT. No cambia con el periodo de arriba."
      end={
        canManage && (
          <Button
            variant="outline"
            size="sm"
            disabled={recompute.isPending}
            onClick={() =>
              recompute.mutate(undefined, {
                onSuccess: () => toast.success("Clasificación recalculada."),
                onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
              })
            }
          >
            <RefreshCw className={cn(recompute.isPending && "animate-spin")} aria-hidden="true" /> {recompute.isPending ? "Recalculando…" : "Recalcular"}
          </Button>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Curva de" className="flex gap-2">
              <ToggleChip active={kind === "producto"} onClick={() => setKind("producto")}>
                Productos
              </ToggleChip>
              <ToggleChip active={kind === "cliente"} onClick={() => setKind("cliente")}>
                Clientes
              </ToggleChip>
            </div>
            {kind === "producto" && (
              <div className="w-56">
                <OptionFilter label="C.O. de la curva" allLabel="Todos los C.O." value={co} options={coOptions} loading={false} onChange={setCo} />
              </div>
            )}
          </div>
          {pareto.isPending ? (
            <div className="h-60 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la curva" />
          ) : pareto.isError ? (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(pareto.error)}
            </p>
          ) : (
            <div className={cn(pareto.isPlaceholderData && "opacity-60")}>
              <ParetoChart pareto={pareto.data} cuts={cuts} noun={kind === "producto" ? "productos" : "clientes"} />
              <p className="text-xs tabular-nums text-text-secondary">
                {count.format(pareto.data.items)} {kind === "producto" ? "productos" : "clientes"} clasificados. Las líneas punteadas son los
                cortes de A, B y C.
              </p>
            </div>
          )}
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-text-secondary">Último cálculo</dt>
            <dd>
              {run ? (
                <>
                  {formatWhen(run.computed_at)} · {run.computed_by ?? "proceso diario"}
                  <span className="block text-xs text-text-secondary">
                    Leyó del {formatDay(run.period_from)} al {formatDay(run.period_to)}
                  </span>
                </>
              ) : (
                "Sin calcular todavía"
              )}
            </dd>
          </div>
          {status.data && (
            <div>
              <dt className="text-xs text-text-secondary">Próximo cálculo</dt>
              <dd>
                Lee del {formatDay(status.data.window_from)} al {formatDay(status.data.window_to)}
                <span className="block text-xs text-text-secondary">
                  A hasta {formatPct(status.data.cuts.a)} del valor acumulado, B hasta {formatPct(status.data.cuts.b)}, C hasta{" "}
                  {formatPct(status.data.cuts.c)}; el resto D.
                </span>
              </dd>
            </div>
          )}
          {run && (
            <div>
              <dt className="text-xs text-text-secondary">Ítems por clase</dt>
              <dd>
                <table className="mt-1 w-full text-left text-sm">
                  <caption className="sr-only">Ítems por clase del último cálculo</caption>
                  <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                    <tr>
                      <th scope="col" className="py-1">Clase</th>
                      <th scope="col" className="py-1 text-right">Productos</th>
                      <th scope="col" className="py-1 text-right">Clientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {["A", "B", "C", "D"].map((letter) => (
                      <tr key={letter}>
                        <th scope="row" className="py-1 font-normal">
                          {letter}
                        </th>
                        <td className="py-1 text-right tabular-nums">{count.format(run.counts.producto?.[letter] ?? 0)}</td>
                        <td className="py-1 text-right tabular-nums">{count.format(run.counts.cliente?.[letter] ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Panel>
  );
}
