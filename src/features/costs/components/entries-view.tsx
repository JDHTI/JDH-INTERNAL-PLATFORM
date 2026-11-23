"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import FilterPanel from "@/shared/components/filter-panel";
import Pager from "@/shared/components/pager";
import BasePicker from "@/shared/components/pickers/base-picker";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, formatIsoRange, type IsoDateRange } from "@/shared/components/ui/date-range-picker";
import { Input } from "@/shared/components/ui/input";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { formatCop, formatDay, formatNumber, formatPct } from "@/features/supports/lib/format";

import { useCostReasons, useEntries, useSetEntryReason } from "../hooks/use-costs";
import {
  ENTRY_STATUS,
  MAX_RANGE_DAYS,
  NOVELTY_STATUS,
  SUPPLIER_FILTER,
  addDays,
  formatCo,
  formatSignedCop,
  formatSignedPct,
  rangeDays,
  today,
} from "../lib/format";
import type { CostPermissions, CostReason, Entry, EntrySort, EntryStatus, SortOrder } from "../types/costs.types";
import ReasonFilter from "./reason-filter";
import ReasonPicker from "./reason-picker";
import SortHeader from "./sort-header";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");
const timeFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/** The API's default period: the last 30 days up to today. */
function defaultRange(): Required<IsoDateRange> {
  const until = today();
  return { from: addDays(until, -29), to: until };
}

/**
 * Each purchase entry against the supplier's quotation in force on its day.
 * Opens on the novelties alone: that is the work; the other lines are a chip
 * away. Whoever manages the entries or the novelties gives each line its one
 * reason from the row itself.
 */
export default function EntriesView({ permissions }: { permissions: CostPermissions }) {
  const [range, setRange] = useState<Required<IsoDateRange>>(defaultRange);
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const [co, setCo] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [status, setStatus] = useState<EntryStatus | "">("");
  const [noveltyOnly, setNoveltyOnly] = useState(true);
  const [sort, setSort] = useState<EntrySort>("date");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  const q = useDebouncedValue(text.trim());
  const coQuery = useDebouncedValue(co.trim());
  const warehouseQuery = useDebouncedValue(warehouse.trim());
  const canSetReasons = permissions.can_set_reasons;
  const reasons = useCostReasons();
  const tooLong = rangeDays(range.from, range.to) > MAX_RANGE_DAYS;

  const query = useEntries({
    since: range.from,
    until: range.to,
    q,
    status,
    novelty: noveltyOnly,
    supplier: supplier?.value ?? "",
    co: coQuery,
    warehouse: warehouseQuery,
    reasonId,
    sort,
    order,
    page,
    size: PAGE_SIZE,
  });
  const result = tooLong ? undefined : query.data;
  const rows = result?.items ?? [];
  const counts = result?.counts;
  const filtered = q !== "" || supplier !== null || coQuery !== "" || warehouseQuery !== "" || reasonId !== "" || status !== "";

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const chooseStatus = (next: EntryStatus) =>
    reset(() => {
      setStatus((current) => (current === next ? "" : next));
      setNoveltyOnly(false);
    });
  const clear = () =>
    reset(() => {
      setText("");
      setSupplier(null);
      setCo("");
      setWarehouse("");
      setReasonId("");
      setStatus("");
    });
  const changeSort = (column: EntrySort) =>
    reset(() => {
      if (column === sort) setOrder((current) => (current === "desc" ? "asc" : "desc"));
      else {
        setSort(column);
        // Differences read largest first; text columns from A.
        setOrder(column === "sku" || column === "supplier" ? "asc" : "desc");
      }
    });

  return (
    <div className="space-y-3">
      <FilterPanel
        label="Filtros del análisis de entradas"
        columns="md:grid-cols-3 2xl:grid-cols-6"
        fields={
          <>
            <DateRangePicker
              value={range}
              max={today()}
              label="Periodo de las entradas"
              onChange={(next) =>
                reset(() => setRange(next.from && next.to ? { from: next.from, to: next.to } : defaultRange()))
              }
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={text}
                onChange={(event) => reset(() => setText(event.target.value))}
                placeholder="Referencia, documento, OC o factura"
                aria-label="Buscar por referencia, descripción, documento, orden de compra o factura"
                className="pl-9"
              />
            </div>
            <BasePicker
              config={SUPPLIER_FILTER}
              hideLabel
              selected={supplier}
              onSelect={(option) => reset(() => setSupplier(option))}
              onClear={() => reset(() => setSupplier(null))}
            />
            <Input
              value={co}
              onChange={(event) => reset(() => setCo(event.target.value))}
              placeholder="C.O."
              aria-label="Centro de operación"
              inputMode="numeric"
            />
            <Input
              value={warehouse}
              onChange={(event) => reset(() => setWarehouse(event.target.value))}
              placeholder="Bodega"
              aria-label="Bodega"
            />
            <ReasonFilter reasons={reasons.data} value={reasonId} onChange={(next) => reset(() => setReasonId(next))} />
          </>
        }
        chips={
          <div role="group" aria-label="Filtrar por estado de la línea" className="flex flex-wrap gap-2">
            <ToggleChip
              active={noveltyOnly && status === ""}
              onClick={() =>
                reset(() => {
                  setNoveltyOnly((current) => !(current && status === ""));
                  setStatus("");
                })
              }
              count={counts ? counts.novedad + counts.sin_cotizacion : undefined}
              title="Las líneas con novedad y las que no tienen cotización"
            >
              Solo novedades
            </ToggleChip>
            {(Object.keys(ENTRY_STATUS) as EntryStatus[]).map((key) => (
              <ToggleChip key={key} active={status === key} onClick={() => chooseStatus(key)} count={counts?.[key]}>
                {ENTRY_STATUS[key].label}
              </ToggleChip>
            ))}
          </div>
        }
        end={
          filtered && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Limpiar filtros
            </Button>
          )
        }
      />

      {tooLong ? (
        <StatePanel icon={FileX2} title={`El periodo pasa de ${MAX_RANGE_DAYS} días`}>
          {formatIsoRange(range)} son {numberFormat.format(rangeDays(range.from, range.to))} días. Elige un periodo más corto: el análisis lee
          hasta {MAX_RANGE_DAYS} días a la vez.
        </StatePanel>
      ) : query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando las entradas del periodo" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las entradas"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        filtered || noveltyOnly ? (
          <StatePanel
            icon={FileX2}
            title={noveltyOnly && !filtered ? "Ninguna línea con novedad en el periodo" : "Ninguna entrada coincide con los filtros"}
            action={
              filtered ? (
                <Button variant="outline" onClick={clear}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button variant="outline" onClick={() => reset(() => setNoveltyOnly(false))}>
                  Ver todas las líneas
                </Button>
              )
            }
          >
            {formatIsoRange(range)}. Prueba con otro periodo o quita algún filtro.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="No hay entradas de compra en el periodo">
            {formatIsoRange(range)}. El DWH publica las entradas de lunes a sábado hacia las 6:00 con lo movido hasta la noche anterior.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Entradas de compra contra la cotización vigente, {formatIsoRange(range)}</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <SortHeader label="Fecha" column="date" sort={sort} order={order} onSort={changeSort} numeric />
                  <th scope="col" className="px-3 py-2">C.O.</th>
                  <th scope="col" className="px-3 py-2">Bodega</th>
                  <th scope="col" className="px-3 py-2">Documento</th>
                  <SortHeader label="Referencia" column="sku" sort={sort} order={order} onSort={changeSort} />
                  <th scope="col" className="px-3 py-2">Descripción</th>
                  <SortHeader label="Proveedor" column="supplier" sort={sort} order={order} onSort={changeSort} />
                  <th scope="col" className="px-3 py-2 text-right">Cantidad</th>
                  <th scope="col" className="px-3 py-2 text-right">Cotización</th>
                  <th scope="col" className="px-3 py-2 text-right">Precio unitario</th>
                  <th scope="col" className="px-3 py-2 text-right" title="Tasa 1: descuento por escala de la cotización. Se muestra, no se resta.">
                    Tasa
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">Precio anterior</th>
                  <th scope="col" className="px-3 py-2 text-right">Hace 2</th>
                  <SortHeader label="Diferencia" column="difference" sort={sort} order={order} onSort={changeSort} numeric />
                  <SortHeader label="Dif. %" column="difference_pct" sort={sort} order={order} onSort={changeSort} numeric />
                  <th scope="col" className="px-3 py-2">Estado</th>
                  {/* Pinned: giving the reason is the row's action, it never scrolls out of view. */}
                  <th scope="col" className="w-60 border-l border-border bg-canvas-subtle px-3 py-2 md:sticky md:right-0">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <EntryRow key={row.line_key} row={row} reasons={reasons.data} canSetReasons={canSetReasons} />
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5 text-xs text-text-secondary">
                <p className="tabular-nums">
                  {numberFormat.format(result.total)} {result.total === 1 ? "línea" : "líneas"} · {numberFormat.format(result.counts.with_reason)} con
                  motivo
                  {result.fetched_at && <> · DWH leído el {timeFormat.format(new Date(result.fetched_at))}</>}
                </p>
                {!result.previous_from_warehouse && (
                  <p>
                    Precio anterior y hace 2 salen de las compras de este periodo: las primeras compras de cada referencia pueden quedar sin
                    precio anterior.
                  </p>
                )}
              </div>
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
    </div>
  );
}

function EntryRow({ row, reasons, canSetReasons }: { row: Entry; reasons: CostReason[] | undefined; canSetReasons: boolean }) {
  const look = ENTRY_STATUS[row.status];
  const novelty = row.novelty;
  const save = useSetEntryReason();
  const setReason = (reasonId: string | null) =>
    save.mutate(
      { lineKey: row.line_key, reasonId },
      { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
    );
  const where = [row.purchase_order && `OC ${row.purchase_order}`, row.invoice_ref && `Factura ${row.invoice_ref}`].filter(Boolean).join(" · ");

  return (
    <tr className="group h-10 align-top hover:bg-primary-subtle">
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatDay(row.entry_date)}</td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums" title={row.regional_name ?? undefined}>
        {formatCo(row.co)}
      </td>
      <td className="whitespace-nowrap px-3 py-2">{row.warehouse ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2" title={where || undefined}>
        <span className="font-mono text-[13px]">{row.document ?? "—"}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px]">{row.sku}</td>
      <td className="max-w-64 px-3 py-2">
        <span className="block truncate" title={row.description ?? undefined}>
          {row.description ?? "—"}
        </span>
      </td>
      <td className="max-w-56 px-3 py-2">
        <span className="block truncate" title={row.supplier_nit ? `NIT ${row.supplier_nit}` : undefined}>
          {row.supplier_name ?? row.supplier_code ?? "—"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
        {formatNumber(row.quantity)}
        {row.unit && <span className="text-xs text-text-secondary"> {row.unit}</span>}
      </td>
      <td
        className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
        title={row.quotation_since ? `Cotización vigente desde el ${formatDay(row.quotation_since)}` : undefined}
      >
        {formatCop(row.quotation)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{formatCop(row.unit_price)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatPct(row.discount_pct)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCop(row.previous_price)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCop(row.previous_price_2)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatSignedCop(row.difference)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatSignedPct(row.difference_pct)}</td>
      <td className="px-3 py-2">
        <span className="flex flex-col items-start gap-1">
          <Badge tone={look.tone}>{look.label}</Badge>
          {novelty && (
            <span className="text-xs text-text-secondary" title={NOVELTY_STATUS[novelty.status].help}>
              Novedad: {novelty.status_label.toLowerCase()}
            </span>
          )}
        </span>
      </td>
      <td className="w-60 border-l border-border bg-surface px-3 py-1.5 md:sticky md:right-0 group-hover:shadow-[inset_0_0_0_100vmax_var(--primary-subtle)]">
        {canSetReasons ? (
          <ReasonPicker
            reasons={reasons}
            value={novelty?.reason_id ?? null}
            valueName={novelty?.reason_name}
            onChange={setReason}
            saving={save.isPending}
            label={`Motivo de ${row.document ?? "la entrada"}, referencia ${row.sku}`}
          />
        ) : (
          <span className={cn("block truncate py-0.5", !novelty?.reason_name && "text-text-secondary")} title={novelty?.reason_name ?? undefined}>
            {novelty?.reason_name ?? "Sin motivo"}
          </span>
        )}
      </td>
    </tr>
  );
}
