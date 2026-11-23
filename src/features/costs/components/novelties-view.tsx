"use client";

import { useState } from "react";
import { CloudOff, FileText, FileX2, PanelRightOpen, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import FilterPanel from "@/shared/components/filter-panel";
import Pager from "@/shared/components/pager";
import BasePicker from "@/shared/components/pickers/base-picker";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoDateRange } from "@/shared/components/ui/date-range-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { formatCop, formatDay } from "@/features/supports/lib/format";

import { useCostReasons, useNovelties, useSetNoveltyReason } from "../hooks/use-costs";
import { NOVELTY_STATUS, SUPPLIER_FILTER, formatCo, formatSignedCop, formatSignedPct, today } from "../lib/format";
import type { CostPermissions, CostReason, Novelty, NoveltyKind, NoveltySort, NoveltyStatus, SortOrder } from "../types/costs.types";
import CreditNoteDialog from "./credit-note-dialog";
import NoveltyDetailDialog from "./novelty-detail-dialog";
import ReasonFilter from "./reason-filter";
import ReasonPicker from "./reason-picker";
import SortHeader from "./sort-header";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");
const ALL = "";
const KIND_OPTIONS: { value: NoveltyKind | typeof ALL; label: string }[] = [
  { value: ALL, label: "Todos los tipos" },
  { value: "diferencia", label: "Diferencia con la cotización" },
  { value: "sin_cotizacion", label: "Sin cotización" },
  { value: "sin_novedad", label: "Ya no es novedad" },
];

/**
 * The tray of the lines kept for a reason and, when the reason asks for it,
 * the supplier's credit note. Opens on the pending ones: that is the queue.
 * The status is never edited; it follows from the reason and the note.
 */
export default function NoveltiesView({ permissions }: { permissions: CostPermissions }) {
  const [status, setStatus] = useState<NoveltyStatus | "">("pendiente");
  const [range, setRange] = useState<IsoDateRange>({});
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const [co, setCo] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [kind, setKind] = useState<NoveltyKind | "">("");
  const [sort, setSort] = useState<NoveltySort>("date");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [noting, setNoting] = useState<Novelty | null>(null);

  const q = useDebouncedValue(text.trim());
  const coQuery = useDebouncedValue(co.trim());
  const reasons = useCostReasons();
  const manages = permissions.modules["novedades-compras"]?.can_manage === true;
  const query = useNovelties({
    status,
    since: range.from ?? "",
    until: range.to ?? "",
    supplier: supplier?.value ?? "",
    co: coQuery,
    reasonId,
    kind,
    q,
    sort,
    order,
    page,
    size: PAGE_SIZE,
  });
  const result = query.data;
  const rows = result?.items ?? [];
  const filtered = Boolean(range.from) || q !== "" || supplier !== null || coQuery !== "" || reasonId !== "" || kind !== "";

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const clear = () =>
    reset(() => {
      setRange({});
      setText("");
      setSupplier(null);
      setCo("");
      setReasonId("");
      setKind("");
    });
  const changeSort = (column: NoveltySort) =>
    reset(() => {
      if (column === sort) setOrder((current) => (current === "desc" ? "asc" : "desc"));
      else {
        setSort(column);
        setOrder(column === "sku" || column === "supplier" ? "asc" : "desc");
      }
    });

  return (
    <div className="space-y-3">
      <FilterPanel
        label="Filtros de las novedades"
        columns="md:grid-cols-3 2xl:grid-cols-6"
        fields={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={text}
                onChange={(event) => reset(() => setText(event.target.value))}
                placeholder="Referencia, documento o nota"
                aria-label="Buscar por referencia, descripción, documento o número de nota crédito"
                className="pl-9"
              />
            </div>
            <DateRangePicker
              value={range}
              max={today()}
              label="Fecha de la entrada"
              placeholder="Cualquier fecha de entrada"
              onChange={(next) => reset(() => setRange(next))}
            />
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
            <ReasonFilter reasons={reasons.data} value={reasonId} onChange={(next) => reset(() => setReasonId(next))} />
            <Dropdown
              value={kind}
              options={KIND_OPTIONS}
              onValueChange={(next) => reset(() => setKind(next as NoveltyKind | ""))}
              aria-label="Tipo de novedad"
            />
          </>
        }
        chips={
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {(Object.keys(NOVELTY_STATUS) as NoveltyStatus[]).map((key) => (
              <ToggleChip
                key={key}
                active={status === key}
                onClick={() => reset(() => setStatus((current) => (current === key ? "" : key)))}
                count={result?.counts[key] ?? (result ? 0 : undefined)}
                title={NOVELTY_STATUS[key].help}
              >
                {NOVELTY_STATUS[key].label}
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

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando las novedades" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las novedades"
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
          <StatePanel
            icon={FileX2}
            title="Ninguna novedad coincide con los filtros"
            action={
              <Button variant="outline" onClick={clear}>
                Limpiar filtros
              </Button>
            }
          >
            Prueba con otro texto, otro proveedor o quita algún filtro.
          </StatePanel>
        ) : status ? (
          <StatePanel
            icon={FileX2}
            title={`No hay novedades en «${NOVELTY_STATUS[status].label}»`}
            action={
              <Button variant="outline" onClick={() => reset(() => setStatus(""))}>
                Ver todas las novedades
              </Button>
            }
          >
            {status === "pendiente" ? "Todas las novedades tienen motivo." : NOVELTY_STATUS[status].help}
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Aún no hay novedades">
            Llegan con la sincronización diaria del DWH, o cuando alguien le pone motivo a una línea en el análisis de entradas.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          {/* Relative so the sr-only header text stays inside the scroll area instead of widening the page. */}
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Novedades de las entradas de compra</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <SortHeader label="Fecha" column="date" sort={sort} order={order} onSort={changeSort} numeric />
                  <th scope="col" className="px-3 py-2">C.O.</th>
                  <th scope="col" className="px-3 py-2">Documento</th>
                  <SortHeader label="Referencia" column="sku" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader label="Proveedor" column="supplier" sort={sort} order={order} onSort={changeSort} />
                  <th scope="col" className="px-3 py-2 text-right">Cotización</th>
                  <th scope="col" className="px-3 py-2 text-right">Precio unitario</th>
                  <SortHeader label="Diferencia" column="difference" sort={sort} order={order} onSort={changeSort} numeric />
                  <SortHeader label="Dif. %" column="difference_pct" sort={sort} order={order} onSort={changeSort} numeric />
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="w-60 px-3 py-2">Motivo</th>
                  <th scope="col" className="px-3 py-2">Nota crédito</th>
                  <th scope="col" className="w-14 px-3 py-2">
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <NoveltyRow
                    key={row.id}
                    row={row}
                    reasons={reasons.data}
                    canSetReasons={permissions.can_set_reasons}
                    manages={manages}
                    onOpen={() => setOpenId(row.id)}
                    onRegisterNote={() => setNoting(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "novedad" : "novedades"}
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

      <NoveltyDetailDialog
        noveltyId={openId}
        permissions={permissions}
        onRegisterNote={(novelty) => {
          // One modal at a time: the form replaces the detail.
          setOpenId(null);
          setNoting(novelty);
        }}
        onClose={() => setOpenId(null)}
      />
      <CreditNoteDialog novelty={noting} onClose={() => setNoting(null)} />
    </div>
  );
}

function NoveltyRow({
  row,
  reasons,
  canSetReasons,
  manages,
  onOpen,
  onRegisterNote,
}: {
  row: Novelty;
  reasons: CostReason[] | undefined;
  canSetReasons: boolean;
  manages: boolean;
  onOpen: () => void;
  onRegisterNote: () => void;
}) {
  const line = row.line;
  const look = NOVELTY_STATUS[row.status];
  const save = useSetNoveltyReason();
  const note = row.credit_note;

  return (
    <tr className={cn("h-10 align-top hover:bg-primary-subtle", row.voided && "text-text-secondary")}>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatDay(line.entry_date)}</td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums" title={line.regional_name ?? undefined}>
        {formatCo(line.co)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px]">{line.document ?? "—"}</td>
      <td className="max-w-72 px-3 py-2">
        <span className="block truncate" title={line.description ?? undefined}>
          <span className="font-mono text-[13px]">{line.sku}</span>
          {line.description && <span className="text-text-secondary"> · {line.description}</span>}
        </span>
      </td>
      <td className="max-w-56 px-3 py-2">
        <span className="block truncate" title={line.supplier_nit ? `NIT ${line.supplier_nit}` : undefined}>
          {line.supplier_name ?? line.supplier_code ?? "—"}
        </span>
      </td>
      <td
        className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
        title={line.quotation_since ? `Cotización vigente desde el ${formatDay(line.quotation_since)}` : undefined}
      >
        {formatCop(line.quotation)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{formatCop(line.unit_price)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatSignedCop(line.difference)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatSignedPct(line.difference_pct)}</td>
      <td className="px-3 py-2">
        <span className="flex flex-col items-start gap-1">
          <Badge tone={look.tone} title={look.help}>
            {row.status_label}
          </Badge>
          <span className="text-xs text-text-secondary">{row.kind_label}</span>
        </span>
      </td>
      <td className="w-60 px-3 py-1.5">
        {canSetReasons && !row.voided ? (
          <ReasonPicker
            reasons={reasons}
            value={row.reason?.id ?? null}
            valueName={row.reason?.name}
            saving={save.isPending}
            label={`Motivo de ${line.document ?? "la entrada"}, referencia ${line.sku}`}
            onChange={(reasonId) =>
              save.mutate(
                { id: row.id, reasonId },
                { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
              )
            }
          />
        ) : (
          <span className={cn("block truncate py-0.5", !row.reason && "text-text-secondary")} title={row.reason?.name}>
            {row.reason?.name ?? "Sin motivo"}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5">
        {note ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Nota crédito ${note.number} por ${formatCop(note.amount)}: ver detalle`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-sm text-left tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
          >
            <FileText className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            {note.number} · {formatCop(note.amount)}
          </button>
        ) : manages && !row.voided ? (
          <Button
            variant={row.status === "espera_nota_credito" ? "outline" : "ghost"}
            size="sm"
            className="max-md:h-11"
            onClick={onRegisterNote}
            aria-label={`Registrar nota crédito de ${line.document ?? "la entrada"}, referencia ${line.sku}`}
          >
            <Plus aria-hidden="true" /> Registrar
          </Button>
        ) : (
          <span className="text-text-secondary">—</span>
        )}
      </td>
      <td className="w-14 px-2 py-1 text-right">
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" onClick={onOpen} aria-label={`Ver detalle e historial de ${line.document ?? "la novedad"}, referencia ${line.sku}`} title="Detalle e historial">
          <PanelRightOpen aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}
