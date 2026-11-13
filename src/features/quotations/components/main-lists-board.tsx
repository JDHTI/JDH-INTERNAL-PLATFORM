"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eraser, FilterX, ListOrdered, Loader2, MessageSquareText, RefreshCw, Search, Target, Warehouse, X } from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { MultiSelect } from "@/shared/components/ui/multi-select";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import SupportDetail from "@/features/supports/components/support-detail";

import { useBoardApply, useBoardNote, useBoardOverview, useBoardPrices, useBoardReview, useBoardRows, useSyncBoard } from "../hooks/use-board";
import { useQuotationPermissions } from "../hooks/use-quotations";
import { formatCount, formatDateTime, formatMoney, formatVariation } from "../lib/format";
import { lastPriceStanding } from "../lib/line-status";
import type { ListFilter } from "../lib/list-review";
import { getBoardKeys } from "../services/board.service";
import type {
  BoardActionResult,
  BoardChip,
  BoardFilters,
  BoardKey,
  BoardList,
  BoardRow,
  BoardSort,
  BoardSync,
} from "../types/quotations.types";
import LineDetailDialog from "./line-detail-dialog";
import { CostBreakdown, MarginMark, NewMargin, type ReviewControl, ReviewSelect, SaleMark } from "./lines-table";
import { ListFilters } from "./list-review-controls";
import { QuotationLoadError } from "./quotations-gate";

const PAGE_SIZE = 100;
const keyOf = (key: BoardKey) => `${key.quotation_id}|${key.sku}`;
const quantity = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "lista", label: "Orden: lista y posición" },
  { value: "sku", label: "Orden: referencia" },
  { value: "margen_actual:asc", label: "Orden: margen actual, menor primero" },
  { value: "margen_actual:desc", label: "Orden: margen actual, mayor primero" },
  { value: "precio_actual:desc", label: "Orden: precio actual, mayor primero" },
  { value: "variacion:desc", label: "Orden: variación, mayor primero" },
  { value: "precio_nuevo:desc", label: "Orden: precio nuevo, mayor primero" },
];

/**
 * Every main list in one table: one row per reference and list. Each list is
 * built from SIESA (and refreshed) on its own, underneath; the table reads them
 * together, filtered and paged in the API. The lists dropdown narrows it to one
 * or several when needed. Prices, reviews and notes reach the list each row
 * belongs to.
 */
export default function MainListsBoard() {
  const params = useSearchParams();
  const permissions = useQuotationPermissions("principal").data;
  const canManage = permissions?.can_manage === true;
  const canValidate = permissions?.can_validate === true;
  const overview = useBoardOverview();
  const [filters, setFilters] = useState<BoardFilters>(() => ({
    lists: params.getAll("lista"),
    q: "",
    suppliers: [],
    categories: [],
    chip: null,
    sort: "lista",
    desc: false,
  }));
  const [text, setText] = useState(params.get("q") ?? "");
  const q = useDebouncedValue(text.trim());
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, BoardKey>>(() => new Map());
  const [detail, setDetail] = useState<BoardRow | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const effective = useMemo(() => ({ ...filters, q }), [filters, q]);
  const lists = overview.data?.lists ?? [];
  const built = lists.some((item) => item.quotation_id !== null);
  const rows = useBoardRows(effective, page, PAGE_SIZE, built);
  const note = useBoardNote();
  const review = useBoardReview();
  const pendingKey = review.isPending && review.variables ? keyOf(review.variables.keys[0]) : null;
  // A row's review changes on its own chip, in the table or in its detail; never in bulk.
  const reviewControl: ReviewControl = {
    canEdit: canManage,
    canValidate,
    pending: pendingKey,
    keyOf: (line) => keyOf(line as BoardRow),
    onChange: (line, status) => {
      const row = line as BoardRow;
      review.mutate(
        { keys: [{ quotation_id: row.quotation_id, sku: row.sku }], status },
        {
          onSuccess: (result) => {
            const skipped = result.skipped[0];
            if (skipped) toast.warning(`${row.description ?? row.sku}: ${skipped.reason}`, { duration: 10_000 });
          },
          onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
        }
      );
    },
  };

  // A new filter starts on its first page.
  const change = (next: Partial<BoardFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };
  const filtered = filters.lists.length > 0 || q !== "" || filters.suppliers.length > 0 || filters.categories.length > 0 || filters.chip !== null;
  const clear = () => {
    setText("");
    change({ lists: [], suppliers: [], categories: [], chip: null });
  };

  if (overview.isPending) return <TableSkeleton rows={8} label="Cargando las listas principales" />;
  if (overview.isError && !overview.data) {
    return <QuotationLoadError error={overview.error} onRetry={() => void overview.refetch()} subject="las listas principales" />;
  }

  const listLabel = (item: BoardList) => `${item.code} · ${item.name ?? "Sin nombre"}`;
  const listOptions = lists.map(listLabel);
  const byLabel = new Map(lists.map((item) => [listLabel(item), item.code]));
  const page_ = rows.data;
  const pageRows = page_?.items ?? [];
  const pageKeys = pageRows.map((row) => ({ quotation_id: row.quotation_id, sku: row.sku }));
  const allOnPage = pageKeys.length > 0 && pageKeys.every((key) => selected.has(keyOf(key)));
  // The open detail follows its row as the page is read again (a review just changed).
  const shown = detail ? (pageRows.find((row) => keyOf(row) === keyOf(detail)) ?? detail) : null;

  return (
    // A container: the filters lay out by the room the sidebar leaves, not the window's.
    <div className="@container space-y-4">
      <ListsPanel
        lists={lists}
        sync={overview.data?.sync ?? null}
        syncEnabled={overview.data?.sync_enabled === true}
        canManage={canManage}
      />

      {!built ? (
        <StatePanel icon={ListOrdered} title="Aún no se ha armado la lista general">
          {canManage
            ? "Usa «Armar lista general» para traer de SIESA las 14 listas con su costo, margen objetivo, última venta y apoyos. Después se trabajan todas juntas en esta tabla y se sincronizan solas con la carga diaria."
            : "Cuando un colaborador arme la lista general, aparecerán aquí las 14 listas juntas."}
        </StatePanel>
      ) : (
        <>
          {/* One row once there is room; stacked on a phone. */}
          <div role="search" aria-label="Filtros de las listas" className="flex flex-col gap-2 @3xl:flex-row @3xl:items-center">
            <div className="relative min-w-0 @3xl:flex-[1.4]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setPage(1);
                }}
                placeholder="Referencia o descripción"
                aria-label="Buscar por referencia o descripción"
                className="pl-9 max-md:h-11"
              />
            </div>
            <MultiSelect
              label="Listas"
              allLabel="Todas las listas"
              options={listOptions}
              value={filters.lists.map((code) => listOptions.find((label) => byLabel.get(label) === code) ?? code)}
              onValueChange={(labels) => change({ lists: labels.map((label) => byLabel.get(label) ?? label) })}
              className="min-w-0 @3xl:flex-1"
            />
            {(overview.data?.suppliers.length ?? 0) > 0 && (
              <MultiSelect
                label="Proveedores"
                allLabel="Todos los proveedores"
                options={overview.data?.suppliers ?? []}
                value={filters.suppliers}
                onValueChange={(next) => change({ suppliers: next })}
                className="min-w-0 @3xl:flex-1"
              />
            )}
            {(overview.data?.categories.length ?? 0) > 0 && (
              <MultiSelect
                label="Categorías"
                allLabel="Todas las categorías"
                options={overview.data?.categories ?? []}
                value={filters.categories}
                onValueChange={(next) => change({ categories: next })}
                className="min-w-0 @3xl:flex-1"
              />
            )}
            <Dropdown
              aria-label="Ordenar la tabla"
              options={SORT_OPTIONS}
              value={filters.sort === "lista" || filters.sort === "sku" ? filters.sort : `${filters.sort}:${filters.desc ? "desc" : "asc"}`}
              onValueChange={(next) => {
                const [sort, direction] = next.split(":") as [BoardSort, string | undefined];
                change({ sort, desc: direction === "desc" });
              }}
              className="min-w-0 @3xl:flex-[1.2]"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={clear}
              disabled={!filtered}
              aria-label="Borrar filtros"
              title="Borrar filtros"
              className="shrink-0 self-end @3xl:self-auto max-md:size-11"
            >
              <FilterX aria-hidden="true" />
            </Button>
          </div>

          <ListFilters
            counts={page_?.counts}
            total={page_?.counts.todos}
            active={(filters.chip ?? "all") as ListFilter}
            onSelect={(next) => change({ chip: next === "all" ? null : (next as BoardChip) })}
          />

          {canManage && (
            <BoardActions
              selected={selected}
              filters={effective}
              total={page_?.total ?? 0}
              onSelect={setSelected}
            />
          )}

          {rows.isPending ? (
            <TableSkeleton rows={10} label="Cargando las referencias" />
          ) : rows.isError && !page_ ? (
            <QuotationLoadError error={rows.error} onRetry={() => void rows.refetch()} subject="las referencias" />
          ) : pageRows.length === 0 ? (
            <StatePanel
              icon={FilterX}
              title="Ninguna referencia coincide"
              action={filtered ? <Button variant="outline" onClick={clear}>Borrar filtros</Button> : undefined}
            >
              Prueba con otra referencia, otra lista u otro filtro.
            </StatePanel>
          ) : (
            <div className={cn("space-y-3", rows.isPlaceholderData && "opacity-60")}>
              {!page_?.stock_read && (
                <p className="text-[13px] text-warning">El datawarehouse no respondió con las existencias de esta página.</p>
              )}
              <BoardTable
                rows={pageRows}
                canManage={canManage}
                canValidate={canValidate}
                review={reviewControl}
                selected={selected}
                allOnPage={allOnPage}
                onToggle={(key) =>
                  setSelected((current) => {
                    const next = new Map(current);
                    if (!next.delete(keyOf(key))) next.set(keyOf(key), key);
                    return next;
                  })
                }
                onTogglePage={() =>
                  setSelected((current) => {
                    const next = new Map(current);
                    for (const key of pageKeys) {
                      if (allOnPage) next.delete(keyOf(key));
                      else next.set(keyOf(key), key);
                    }
                    return next;
                  })
                }
                onOpen={setDetail}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-text-secondary">
                  {formatCount(page_?.total ?? 0)} {page_?.total === 1 ? "referencia" : "referencias"} en{" "}
                  {filters.lists.length === 0 ? "todas las listas" : `${filters.lists.length} ${filters.lists.length === 1 ? "lista" : "listas"}`}
                </span>
                <Pager page={page} size={PAGE_SIZE} total={page_?.total ?? 0} count={pageRows.length} onPageChange={setPage} />
              </div>
            </div>
          )}
        </>
      )}

      <LineDetailDialog
        line={shown}
        forList
        item={
          shown
            ? {
                quotationId: shown.quotation_id,
                canEdit: canManage,
                review: reviewControl,
                saveNote: (text) => note.mutateAsync({ key: { quotation_id: shown.quotation_id, sku: shown.sku }, note: text }),
              }
            : undefined
        }
        onClose={() => setDetail(null)}
        onOpenAgreement={(id) => {
          setDetail(null);
          setAgreementId(id);
        }}
      />
      <SupportDetail id={agreementId} onClose={() => setAgreementId(null)} />
    </div>
  );
}

const TRIGGER_TEXT: Record<string, string> = {
  dwh: "automática, con la carga del día",
  scheduled: "automática, de respaldo",
  startup: "automática, al reiniciar",
  manual: "manual",
};

/**
 * The 14 main lists, each with its code, name and how many references it has;
 * when it was read and how its items stand go in the tooltip. The whole set is
 * built and synced in the background (list 1 alone takes minutes): the first
 * time with «Armar lista general», then with the day's loads, by itself after
 * the DWH's supply load or with «Sincronizar».
 */
function ListsPanel({ lists, sync, syncEnabled, canManage }: { lists: BoardList[]; sync: BoardSync | null; syncEnabled: boolean; canManage: boolean }) {
  const start = useSyncBoard();
  const built = lists.some((item) => item.quotation_id !== null);
  const running = sync?.status === "queued" || sync?.status === "running";
  const failed = (sync?.lists ?? []).filter((item) => item.status === "error");
  const run = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success("Sincronización en curso: las listas se actualizan solas en unos minutos."),
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  return (
    <section aria-labelledby="main-lists-title" className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 id="main-lists-title" className="text-base font-semibold">Listas</h2>
          <p className="text-[13px] text-text-secondary" aria-live="polite">
            {running ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                {sync?.status === "queued" ? "Sincronización en cola…" : "Sincronizando las listas con SIESA…"}
              </span>
            ) : sync?.finished_at ? (
              `Última sincronización: ${formatDateTime(sync.finished_at)}, ${TRIGGER_TEXT[sync.trigger] ?? sync.trigger}${
                sync.trigger === "manual" && sync.triggered_by ? ` (${sync.triggered_by})` : ""
              }.`
            ) : built ? (
              "Se sincroniza sola con la carga diaria del DWH."
            ) : (
              "Aún no se ha armado la lista general."
            )}
          </p>
        </div>
        {canManage && (
          <Button
            variant={built ? "outline" : "primary"}
            onClick={run}
            disabled={running || start.isPending || !syncEnabled}
            title={
              !syncEnabled
                ? "Las tareas en segundo plano están apagadas: pide a TI que las encienda."
                : "Lee las 14 listas de SIESA con la carga del día. Conserva precios nuevos, estados y observaciones."
            }
            className="max-md:h-11"
          >
            {running || start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            {built ? "Sincronizar con la carga del día" : "Armar lista general"}
          </Button>
        )}
      </div>
      {!running && (sync?.status === "failed" || failed.length > 0) && (
        <p role="alert" className="text-[13px] text-danger">
          {failed.length > 0
            ? `No se sincronizaron: ${failed.map((item) => `${item.code} (${item.error ?? "error"})`).join("; ")}.`
            : `La sincronización falló: ${sync?.error ?? "sin detalle"}.`}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
        {lists.map((item) => {
          const details = [
            item.name ? `${item.code} · ${item.name}` : item.code,
            item.quotation_id === null
              ? "Sin armar"
              : `${formatCount(item.counts.sin_marcar ?? 0)} sin marcar · ${formatCount(item.counts.por_validar ?? 0)} por validar · ${formatCount(item.counts.validada ?? 0)} validadas · ${formatCount(item.counts.cargada ?? 0)} cargadas`,
            item.built_at ? `Leída de SIESA el ${formatDateTime(item.built_at)}` : null,
            ...item.warnings.map((warning) => warning.label),
          ]
            .filter(Boolean)
            .join("\n");
          return (
            <li key={item.code} title={details} className="relative min-w-0 rounded-md border border-border px-2.5 py-1.5">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="font-mono text-sm font-semibold">{item.code}</span>
                <span className="truncate text-[13px]">{item.name ?? "—"}</span>
              </span>
              <span className="block text-xs tabular-nums text-text-secondary">
                {item.quotation_id === null ? "Sin armar" : `${formatCount(item.line_count)} referencias`}
              </span>
              <span className="sr-only">. {details}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * What the ticked rows can take, on any list: a price from the suggestions, or
 * none. The review is not here: it changes row by row, on each row's chip.
 */
function BoardActions({
  selected,
  filters,
  total,
  onSelect,
}: {
  selected: Map<string, BoardKey>;
  filters: BoardFilters;
  total: number;
  onSelect: (next: Map<string, BoardKey>) => void;
}) {
  const apply = useBoardApply();
  const [loadingAll, setLoadingAll] = useState(false);
  const busy = apply.isPending || loadingAll;
  if (selected.size === 0) return null;
  const keys = [...selected.values()];

  const report = (verb: string) => (result: BoardActionResult) => {
    if (result.skipped.length > 0) {
      toast.warning(
        `${formatCount(result.done)} ${verb}. ${formatCount(result.skipped.length)} no: ${result.skipped
          .slice(0, 3)
          .map((item) => `${item.sku} (${item.reason})`)
          .join("; ")}${result.skipped.length > 3 ? "…" : ""}`,
        { duration: 10_000 }
      );
    } else {
      toast.success(`${formatCount(result.done)} ${result.done === 1 ? "referencia" : "referencias"}: ${verb}.`);
    }
  };
  const onError = (failure: Error) => toast.error(errorMessage(failure), { duration: Infinity });
  const runApply = (mode: "optimo" | "minimo" | "limpiar", verb: string) =>
    apply.mutate({ keys, mode }, { onSuccess: report(verb), onError });
  const selectAll = async () => {
    setLoadingAll(true);
    try {
      const all = await getBoardKeys(filters);
      onSelect(new Map(all.map((key) => [keyOf(key), key])));
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div role="region" aria-label="Acciones sobre las referencias seleccionadas" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <span className="text-sm font-medium tabular-nums">
        {formatCount(selected.size)} {selected.size === 1 ? "seleccionada" : "seleccionadas"}
      </span>
      {selected.size < total && (
        <Button variant="ghost" size="sm" onClick={() => void selectAll()} disabled={busy} className="max-md:h-11">
          {loadingAll && <Loader2 className="animate-spin" aria-hidden="true" />} Seleccionar las {formatCount(Math.min(total, 10_000))} del filtro
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => onSelect(new Map())} disabled={busy} className="mr-auto max-md:h-11">
        <X aria-hidden="true" /> Quitar selección
      </Button>
      <Button variant="outline" onClick={() => runApply("optimo", "con el precio óptimo")} disabled={busy} className="max-md:h-11">
        <Target aria-hidden="true" /> Precio óptimo
      </Button>
      <Button variant="outline" onClick={() => runApply("minimo", "con el precio mínimo")} disabled={busy} className="max-md:h-11">
        Precio mínimo
      </Button>
      <Button variant="outline" onClick={() => runApply("limpiar", "sin precio nuevo")} disabled={busy} className="max-md:h-11">
        <Eraser aria-hidden="true" /> Limpiar precio
      </Button>
    </div>
  );
}

const th = "px-2.5 py-2 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";
const td = "px-2.5 py-2 align-top";

function BoardTable({
  rows,
  canManage,
  canValidate,
  review,
  selected,
  allOnPage,
  onToggle,
  onTogglePage,
  onOpen,
}: {
  rows: BoardRow[];
  canManage: boolean;
  canValidate: boolean;
  review: ReviewControl;
  selected: Map<string, BoardKey>;
  allOnPage: boolean;
  onToggle: (key: BoardKey) => void;
  onTogglePage: () => void;
  onOpen: (row: BoardRow) => void;
}) {
  return (
    <>
      {/* Wide screens: one table. */}
      <div className="relative hidden overflow-x-auto rounded-lg border border-border bg-surface lg:block">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <caption className="sr-only">Referencias de las listas principales</caption>
          <thead className="bg-canvas-subtle">
            <tr>
              {canManage && (
                <th scope="col" className={cn(th, "w-10")}>
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={onTogglePage}
                    aria-label="Seleccionar las referencias de esta página"
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
              )}
              <th scope="col" className={th}>Producto</th>
              <th scope="col" className={cn(th, "w-24")}>Lista</th>
              <th scope="col" className={cn(th, "w-36 text-right")}>Precio actual sin IVA</th>
              <th scope="col" className={cn(th, "w-48")}>Precios sugeridos</th>
              <th scope="col" className={cn(th, "w-36 text-right")}>Precio nuevo sin IVA</th>
              <th scope="col" className={cn(th, "w-28 text-right")}>Imp. consumo</th>
              <th scope="col" className={cn(th, "w-24 text-right")}>Var.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const key = { quotation_id: row.quotation_id, sku: row.sku };
              return (
                <tr key={keyOf(key)} className="hover:bg-primary-subtle">
                  {canManage && (
                    <td className={cn(td, "pr-0")}>
                      <input
                        type="checkbox"
                        checked={selected.has(keyOf(key))}
                        onChange={() => onToggle(key)}
                        aria-label={`Seleccionar ${row.description ?? row.sku} en la lista ${row.price_list_id}`}
                        className="mt-0.5 size-4 accent-[var(--primary)]"
                      />
                    </td>
                  )}
                  <td className={cn(td, "min-w-0")}><ProductCell row={row} review={review} onOpen={onOpen} /></td>
                  <td className={td}><ListCell row={row} /></td>
                  <td className={cn(td, "text-right")}><CurrentPrice row={row} /></td>
                  <td className={td}><Suggested row={row} showCost={canValidate} /></td>
                  <td className={td}><PriceCell row={row} editable={canManage} /></td>
                  <td className={cn(td, "text-right tabular-nums")}>
                    {toNumber(row.value_tax_amount) ? formatMoney(row.value_tax_amount) : <span className="text-text-secondary">—</span>}
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>
                    {row.new_price !== null && toNumber(row.variation_pct) !== null ? formatVariation(row.variation_pct) : <span className="text-text-secondary">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Narrow screens: a card per row, with the same blocks. */}
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
        {rows.map((row) => {
          const key = { quotation_id: row.quotation_id, sku: row.sku };
          return (
            <li key={keyOf(key)} className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-3">
              <div className="flex items-start gap-2">
                {canManage && (
                  <input
                    type="checkbox"
                    checked={selected.has(keyOf(key))}
                    onChange={() => onToggle(key)}
                    aria-label={`Seleccionar ${row.description ?? row.sku} en la lista ${row.price_list_id}`}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                  />
                )}
                <div className="min-w-0 flex-1"><ProductCell row={row} review={review} onOpen={onOpen} /></div>
                <ListCell row={row} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-xs text-text-secondary">Precio actual sin IVA</span>
                  <CurrentPrice row={row} alignStart />
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Precios sugeridos</span>
                  <Suggested row={row} showCost={canValidate} />
                </div>
              </div>
              <div>
                <span className="block text-xs text-text-secondary">Precio nuevo sin IVA</span>
                <PriceCell row={row} editable={canManage} wide />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ProductCell({ row, review, onOpen }: { row: BoardRow; review: ReviewControl; onOpen: (row: BoardRow) => void }) {
  const onHand = toNumber(row.stock_on_hand);
  const available = toNumber(row.stock_available);
  return (
    <div className="min-w-0 space-y-0.5">
      <button
        type="button"
        onClick={() => onOpen(row)}
        title={`${row.description ?? row.sku}. Ver el detalle`}
        className="relative block max-w-full truncate rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xl:min-h-11"
      >
        {row.description ?? row.sku}
        <span className="sr-only">. Ver el detalle</span>
      </button>
      <p className="truncate text-[13px] text-text-secondary">
        {[`SKU ${row.sku}`, row.supplier_name ?? row.supplier_code, row.unit].filter(Boolean).join(" · ")}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-text-secondary">
        <ReviewSelect line={row} control={review} />
        {!row.is_active && <Badge tone="danger" className="px-1.5 py-0 text-xs">Inactiva</Badge>}
        <span className="inline-flex items-center gap-1 tabular-nums" title="En las bodegas de la lista, según la foto de SIESA de esta mañana">
          <Warehouse className="size-3.5 shrink-0" aria-hidden="true" />
          {onHand === null ? "Sin existencia" : `Existencia ${quantity.format(onHand)}`}
          {onHand !== null && available !== null && available < onHand && <span>({quantity.format(available)} disp.)</span>}
        </span>
        {row.note && (
          <button
            type="button"
            onClick={() => onOpen(row)}
            title={`Observación: ${row.note}`}
            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <MessageSquareText className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{row.note}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ListCell({ row }: { row: BoardRow }) {
  return (
    <span className="inline-flex min-w-0 flex-col" title={row.price_list_name ?? undefined}>
      <span className="font-mono text-sm font-semibold">{row.price_list_id}</span>
      <span className="max-w-24 truncate text-xs text-text-secondary">{row.price_list_name}</span>
    </span>
  );
}

function CurrentPrice({ row, alignStart = false }: { row: BoardRow; alignStart?: boolean }) {
  const has = toNumber(row.last_price) !== null;
  return (
    <div className={cn("space-y-0.5 tabular-nums", alignStart ? "text-left" : "text-right")}>
      <span className={cn("flex items-center gap-1 whitespace-nowrap", alignStart ? "justify-start" : "justify-end", has ? "font-semibold" : "text-[13px] text-text-secondary")}>
        {has ? formatMoney(row.last_price) : "Sin precio en la lista"}
        <SaleMark line={row} />
      </span>
      {has && <MarginMark value={row.current_margin_with_support_pct} standing={lastPriceStanding(row)} />}
    </div>
  );
}

function Suggested({ row, showCost }: { row: BoardRow; showCost: boolean }) {
  const line = "flex items-baseline justify-between gap-2";
  return (
    <dl className="space-y-0.5 text-[13px] tabular-nums">
      <div className={line}>
        <dt className="text-xs text-text-secondary">Óptimo</dt>
        <dd className="font-semibold">{toNumber(row.optimal_price) === null ? "—" : formatMoney(row.optimal_price)}</dd>
      </div>
      <div className={line}>
        <dt className="text-xs text-text-secondary">Mínimo</dt>
        <dd className="font-semibold">{toNumber(row.min_price) === null ? "—" : formatMoney(row.min_price)}</dd>
      </div>
      {showCost && (
        <div className={cn(line, "mt-1 border-t border-border pt-1")}>
          <dt className="text-xs text-text-secondary">Costo más alto</dt>
          <dd><CostBreakdown line={row} /></dd>
        </div>
      )}
    </dl>
  );
}

/** The new price, in whole pesos: saved when the field is left or with Enter. Empty clears it. */
function PriceCell({ row, editable, wide = false }: { row: BoardRow; editable: boolean; wide?: boolean }) {
  const save = useBoardPrices();
  const stored = row.new_price === null ? "" : String(Math.round(toNumber(row.new_price) ?? 0));
  const [text, setText] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(stored);
  if (stored !== synced) {
    // The row changed on the server (a bulk action, another person): show its value.
    setSynced(stored);
    setText(stored);
  }
  const commit = () => {
    const clean = text.replace(/[.\s$]/g, "").trim();
    if (clean === stored) return;
    if (clean !== "" && !/^\d+$/.test(clean)) {
      setError("Escribe el precio en pesos enteros, sin decimales.");
      return;
    }
    setError(null);
    save.mutate([{ quotation_id: row.quotation_id, sku: row.sku, new_price: clean === "" ? null : clean }], {
      onSuccess: (result) => {
        if (result.skipped.length > 0) setError(result.skipped[0].reason);
      },
      onError: (failure) => setError(errorMessage(failure)),
    });
  };
  const disabled = !editable || !row.is_active;
  return (
    <div className={cn("space-y-1", !wide && "text-right")}>
      <div className="relative">
        <Input
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          disabled={disabled || save.isPending}
          placeholder={disabled ? "" : "Sin cambio"}
          aria-label={`Precio nuevo de ${row.description ?? row.sku} en la lista ${row.price_list_id}, sin IVA`}
          aria-invalid={error ? true : undefined}
          title={error ?? undefined}
          className={cn("bg-surface text-right tabular-nums", wide ? "h-11 w-40" : "h-8 w-full min-w-24", error && "border-danger")}
        />
        {save.isPending && <Loader2 className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-text-secondary" aria-hidden="true" />}
      </div>
      {error && <span role="alert" className="block text-xs text-danger">{error}</span>}
      {row.new_price !== null && <span className="block"><NewMargin line={row} /></span>}
    </div>
  );
}
