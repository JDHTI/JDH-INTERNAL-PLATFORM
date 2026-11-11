"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CloudOff, FileX2, RefreshCw, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { formatCop } from "@/features/supports/lib/format";

import { usePriceIncreaseAnalysis } from "../hooks/use-commercial-masters";
import type { AnalysisPeriod, AnalysisSort, IncreaseStatus, ReferenceAnalysis } from "../types/price-increases.types";
import { INCREASE_STATUS, formatChange, formatIncreaseDay } from "./increase-format";
import ReferenceIncreasesDialog from "./reference-increases-dialog";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");
const PERIODS: { value: AnalysisPeriod; label: string }[] = [
  { value: "12m", label: "Último año" },
  { value: "24m", label: "2 años" },
  { value: "all", label: "Todo el histórico" },
];
/** The movement filter, in plural: what the references did in the period. */
const MOVEMENT_FILTERS: { value: IncreaseStatus; label: string }[] = [
  { value: "subio", label: "Subieron" },
  { value: "bajo", label: "Bajaron" },
  { value: "estable", label: "Estables" },
];

/**
 * How much each reference moved in a period, by when its increases took
 * effect: the last year by default, two years or the whole history. Four
 * figures for the period, the movement as chips that filter (with counts), and
 * one row per reference sorted by how much it went up. A row opens the
 * reference's whole history with a chart of its cost.
 */
export default function PriceIncreaseAnalysisView() {
  const [period, setPeriod] = useState<AnalysisPeriod>("12m");
  const [movement, setMovement] = useState<IncreaseStatus | "">("");
  const [text, setText] = useState("");
  const [sort, setSort] = useState<AnalysisSort>("accumulated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ReferenceAnalysis | null>(null);
  const q = useDebouncedValue(text.trim());
  const query = usePriceIncreaseAnalysis({ period, movement, q, sort, order, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];
  const summary = result?.summary;
  const filtered = q !== "" || movement !== "";

  const sortBy = (next: AnalysisSort) => {
    if (next === sort) setOrder((current) => (current === "desc" ? "asc" : "desc"));
    else {
      setSort(next);
      setOrder(next === "sku" ? "asc" : "desc");
    }
    setPage(1);
  };
  const clear = () => {
    setText("");
    setMovement("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Periodo" className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <ToggleChip
              key={item.value}
              active={period === item.value}
              onClick={() => {
                setPeriod(item.value);
                setPage(1);
              }}
            >
              {item.label}
            </ToggleChip>
          ))}
        </div>
        <div className="relative min-w-60 flex-1 lg:ml-auto lg:max-w-sm lg:flex-none">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder="Referencia, descripción o proveedor"
            aria-label="Buscar en el análisis de alzas"
            className="pl-9 lg:w-80"
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
        <Figure label="Referencias con cambios" value={summary ? numberFormat.format(summary.references) : null} />
        <Figure label="Alzas" value={summary ? numberFormat.format(summary.increases) : null} />
        <Figure
          label="Alza típica"
          hint="La mediana de las alzas del periodo: un error de digitación no la arrastra como a un promedio."
          value={summary ? formatChange(summary.typical_increase_pct) : null}
        />
        <Figure
          label="Pendientes en SIESA"
          hint="Su última alza no tiene fecha de actualización en SIESA: el cotizador compara su costo nuevo."
          value={summary ? numberFormat.format(summary.pending) : null}
        />
      </dl>

      <div role="group" aria-label="Movimiento en el periodo" className="flex flex-wrap items-center gap-2">
        {MOVEMENT_FILTERS.map((item) => (
          <ToggleChip
            key={item.value}
            active={movement === item.value}
            onClick={() => {
              setMovement((current) => (current === item.value ? "" : item.value));
              setPage(1);
            }}
            count={summary?.movements[item.value]}
          >
            {item.label}
          </ToggleChip>
        ))}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Calculando el análisis de alzas" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo calcular el análisis de alzas"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        filtered ? (
          <StatePanel icon={FileX2} title="Ninguna referencia coincide con los filtros" action={<Button variant="outline" onClick={clear}>Limpiar filtros</Button>}>
            Prueba con otro texto, otro movimiento u otro periodo.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Ninguna referencia tuvo cambios en el periodo">
            Prueba con «2 años» o «Todo el histórico», o carga el acumulado de alzas en el histórico.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Análisis de alzas por referencia</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <SortHeader label="Producto" column="sku" sort={sort} order={order} onSort={sortBy} />
                  <SortHeader label="Cambio en el periodo" column="accumulated" sort={sort} order={order} onSort={sortBy} numeric />
                  <SortHeader label="Alzas" column="increases" sort={sort} order={order} onSort={sortBy} numeric />
                  <SortHeader label="Cada cuánto" column="frequency" sort={sort} order={order} onSort={sortBy} numeric />
                  <SortHeader label="Última variación" column="last_change" sort={sort} order={order} onSort={sortBy} />
                  <th scope="col" className="px-3 py-2">En SIESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((item) => (
                  <AnalysisRow key={item.sku} item={item} onOpen={() => setOpen(item)} />
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "referencia" : "referencias"}
                {result.since ? ` con cambios desde el ${formatIncreaseDay(result.since)}` : " en todo el histórico"}
              </span>
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

      <ReferenceIncreasesDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** A headline figure of the period: a number, not a chart. */
function Figure({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3" title={hint}>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {value ?? <span className="inline-block h-7 w-16 animate-pulse rounded bg-canvas-subtle align-middle" aria-label="Cargando" />}
      </dd>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  order,
  onSort,
  numeric = false,
}: {
  label: string;
  column: AnalysisSort;
  sort: AnalysisSort;
  order: "asc" | "desc";
  onSort: (column: AnalysisSort) => void;
  numeric?: boolean;
}) {
  const active = sort === column;
  const Icon = !active ? ArrowUpDown : order === "desc" ? ArrowDown : ArrowUp;
  return (
    <th scope="col" aria-sort={active ? (order === "asc" ? "ascending" : "descending") : undefined} className={cn("px-3 py-2", numeric && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded-sm font-semibold uppercase tracking-[0.06em] hover:text-text-primary max-md:min-h-11",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-text-primary"
        )}
      >
        {label}
        <Icon className="size-3 shrink-0" aria-hidden="true" />
      </button>
    </th>
  );
}

function AnalysisRow({ item, onOpen }: { item: ReferenceAnalysis; onOpen: () => void }) {
  const last = item.last_status ? INCREASE_STATUS[item.last_status] : null;
  const start = toNumber(item.start_cost);
  const end = toNumber(item.end_cost);
  return (
    <tr className="h-10 cursor-pointer align-top hover:bg-primary-subtle" onClick={onOpen}>
      <td className="max-w-80 px-3 py-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="block max-w-full truncate rounded-sm text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          title={item.description ?? undefined}
        >
          <span className="font-mono text-[13px]">{item.sku}</span>
          {item.description && <span className="text-text-secondary"> · {item.description}</span>}
          <span className="sr-only">. Ver su histórico</span>
        </button>
        <span className="block truncate text-xs text-text-secondary">{item.supplier_name ?? "—"}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
        <span className="block font-semibold">{formatChange(item.accumulated_pct)}</span>
        {start !== null && end !== null && (
          <span className="block text-xs text-text-secondary">
            {formatCop(String(start))} → {formatCop(String(end))}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{item.increases}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{item.frequency_days === null ? "—" : `${item.frequency_days} días`}</td>
      <td className="whitespace-nowrap px-3 py-2">
        <span className="flex items-center gap-2">
          {last ? <Badge tone={last.tone}>{last.label}</Badge> : "—"}
          <span className="tabular-nums">{formatChange(item.last_change_pct)}</span>
        </span>
        <span className="block text-xs text-text-secondary">{formatIncreaseDay(item.last_increased_on)}</span>
      </td>
      <td className="px-3 py-2">{item.is_pending ? <Badge tone="info">Pendiente</Badge> : <span className="text-text-secondary">Al día</span>}</td>
    </tr>
  );
}
