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

import { useCostReasons, useEntries, useEntryOptions, useSetEntryReason } from "../hooks/use-costs";
import { ENTRY_STATUS, MAX_RANGE_DAYS, NOVELTY_STATUS, SUPPLIER_FILTER, addDays, rangeDays, today } from "../lib/format";
import type { CostPermissions, CostReason, Entry, EntrySort, EntryStatus, SortOrder } from "../types/costs.types";
import {
  DifferenceCell,
  EntryCell,
  ProductCell,
  PurchaseCell,
  QuotationCell,
} from "./line-cells";
import { CoFilter, WarehouseFilter } from "./place-filters";
import ReasonFilter from "./reason-filter";
import ReasonPicker from "./reason-picker";
import SortHeader, { td } from "./sort-header";

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
  const coQuery = co;
  const warehouseQuery = warehouse;
  const canSetReasons = permissions.can_set_reasons;
  const reasons = useCostReasons();
  const tooLong = rangeDays(range.from, range.to) > MAX_RANGE_DAYS;
  const options = useEntryOptions(range.from, range.to, !tooLong);

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
  const changeSort = (field: EntrySort, direction: SortOrder) =>
    reset(() => {
      setSort(field);
      setOrder(direction);
    });
  const sortProps = { sort, order, onSort: changeSort, onReset: () => changeSort("date", "desc") };

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
                reset(() => {
                  setRange(next.from && next.to ? { from: next.from, to: next.to } : defaultRange());
                  // The dropdowns list the period's own C.O. and warehouses.
                  setCo("");
                  setWarehouse("");
                })
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
            <CoFilter
              options={options.data}
              loading={options.isPending && !tooLong}
              value={co}
              onChange={(next) =>
                reset(() => {
                  setCo(next);
                  // A warehouse belongs to one C.O.: changing it starts the warehouse over.
                  setWarehouse("");
                })
              }
            />
            <WarehouseFilter
              options={options.data}
              loading={options.isPending && !tooLong}
              co={co}
              value={warehouse}
              onChange={(next) => reset(() => setWarehouse(next))}
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
          {/* Phones: one card per line, the reason at hand. */}
          <ul className="space-y-2 md:hidden" aria-label="Entradas de compra">
            {rows.map((row) => (
              <EntryCard key={row.line_key} row={row} reasons={reasons.data} canSetReasons={canSetReasons} />
            ))}
          </ul>

          {/* From md up, a fixed-layout table: each cell groups its data, so the row fits without scrolling sideways. */}
          <div className="relative hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[50rem] table-fixed text-left text-sm">
              <caption className="sr-only">Entradas de compra contra la cotización vigente, {formatIsoRange(range)}</caption>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col />
                <col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <SortHeader label="Entrada" fields={[["date", "Fecha"]]} {...sortProps} />
                  <SortHeader
                    label="Producto"
                    fields={[
                      ["sku", "Referencia"],
                      ["supplier", "Proveedor"],
                    ]}
                    {...sortProps}
                  />
                  <SortHeader label="Precio de compra" {...sortProps} />
                  <SortHeader
                    label="Cotización"
                    title="Neta: lo que debió costar la entrada, la cotización vigente menos su Tasa 1"
                    {...sortProps}
                  />
                  <SortHeader
                    label="Diferencia"
                    fields={[
                      ["difference", "En pesos"],
                      ["difference_pct", "En %"],
                      ["amount", "Total por la cantidad"],
                    ]}
                    {...sortProps}
                  />
                  <SortHeader label="Estado y motivo" {...sortProps} />
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
                    Las compras anteriores salen de este periodo: las primeras compras de cada referencia pueden quedar sin precio anterior.
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

/** The line's status, what the platform keeps of it, and its one reason. */
function StatusReason({ row, reasons, canSetReasons }: { row: Entry; reasons: CostReason[] | undefined; canSetReasons: boolean }) {
  const look = ENTRY_STATUS[row.status];
  const novelty = row.novelty;
  const save = useSetEntryReason();
  return (
    <div className="min-w-0 space-y-1">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Badge tone={look.tone}>{look.label}</Badge>
        {novelty && (
          <span className="text-xs text-text-secondary" title={NOVELTY_STATUS[novelty.status].help}>
            {novelty.status_label}
          </span>
        )}
      </span>
      {canSetReasons ? (
        <ReasonPicker
          reasons={reasons}
          value={novelty?.reason_id ?? null}
          valueName={novelty?.reason_name}
          saving={save.isPending}
          label={`Motivo de ${row.document ?? "la entrada"}, referencia ${row.sku}`}
          onChange={(reasonId) =>
            save.mutate(
              { lineKey: row.line_key, reasonId },
              { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
            )
          }
        />
      ) : (
        <span className={cn("block truncate text-xs", !novelty?.reason_name && "text-text-secondary")} title={novelty?.reason_name ?? undefined}>
          {novelty?.reason_name ?? "Sin motivo"}
        </span>
      )}
    </div>
  );
}

function EntryRow({ row, reasons, canSetReasons }: { row: Entry; reasons: CostReason[] | undefined; canSetReasons: boolean }) {
  return (
    <tr className="hover:bg-primary-subtle">
      <td className={td}>
        <EntryCell line={row} />
      </td>
      <td className={td}>
        <ProductCell line={row} />
      </td>
      <td className={td}>
        <PurchaseCell line={row} />
      </td>
      <td className={td}>
        <QuotationCell line={row} />
      </td>
      <td className={td}>
        <DifferenceCell line={row} />
      </td>
      <td className={td}>
        <StatusReason row={row} reasons={reasons} canSetReasons={canSetReasons} />
      </td>
    </tr>
  );
}

function EntryCard({ row, reasons, canSetReasons }: { row: Entry; reasons: CostReason[] | undefined; canSetReasons: boolean }) {
  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <ProductCell line={row} />
        <div className="text-right">
          <EntryCell line={row} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PurchaseCell line={row} />
        <div className="space-y-2">
          <QuotationCell line={row} />
          <DifferenceCell line={row} />
        </div>
      </div>
      <StatusReason row={row} reasons={reasons} canSetReasons={canSetReasons} />
    </li>
  );
}
