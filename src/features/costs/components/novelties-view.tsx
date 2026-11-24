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
import { formatCop } from "@/features/supports/lib/format";

import { useCostReasons, useNovelties, useSetNoveltyReason } from "../hooks/use-costs";
import { NOVELTY_STATUS, SUPPLIER_FILTER, today } from "../lib/format";
import type { CostPermissions, CostReason, Novelty, NoveltyKind, NoveltySort, NoveltyStatus, SortOrder } from "../types/costs.types";
import CreditNoteDialog from "./credit-note-dialog";
import {
  DifferenceCell,
  EntryCell,
  ProductCell,
  PurchaseCells,
  PurchaseCols,
  PurchaseFigures,
  PurchaseGroupHeader,
  PurchaseSubHeaders,
  QuotationCell,
  QuotationFigures,
} from "./line-cells";
import NoveltyDetailDialog from "./novelty-detail-dialog";
import ReasonFilter from "./reason-filter";
import ReasonPicker from "./reason-picker";
import SortHeader, { td, th } from "./sort-header";

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
  const changeSort = (field: NoveltySort, direction: SortOrder) =>
    reset(() => {
      setSort(field);
      setOrder(direction);
    });
  const sortProps = { sort, order, onSort: changeSort, onReset: () => changeSort("date", "desc") };
  const rowProps = (row: Novelty) => ({
    row,
    reasons: reasons.data,
    canSetReasons: permissions.can_set_reasons,
    manages,
    onOpen: () => setOpenId(row.id),
    onRegisterNote: () => setNoting(row),
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
          {/* Phones: one card per novelty. */}
          <ul className="space-y-2 md:hidden" aria-label="Novedades">
            {rows.map((row) => (
              <NoveltyCard key={row.id} {...rowProps(row)} />
            ))}
          </ul>

          {/* From md up, a fixed-layout table: each cell groups its data, so the row fits without scrolling sideways. */}
          <div className="relative hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[50rem] table-fixed text-left text-sm">
              <caption className="sr-only">Novedades de las entradas de compra</caption>
              <colgroup>
                <col style={{ width: "11%" }} />
                <col />
                <PurchaseCols />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <SortHeader label="Entrada" fields={[["date", "Fecha"]]} rowSpan={2} {...sortProps} />
                  <SortHeader
                    label="Producto"
                    fields={[
                      ["sku", "Referencia"],
                      ["supplier", "Proveedor"],
                    ]}
                    rowSpan={2}
                    {...sortProps}
                  />
                  <PurchaseGroupHeader />
                  <SortHeader
                    label="Cotización"
                    rowSpan={2}
                    className="text-right"
                    title="Lo que debió costar la entrada: la cotización vigente menos su Tasa 1"
                    {...sortProps}
                  />
                  <SortHeader
                    label="Diferencia"
                    fields={[
                      ["difference", "En pesos"],
                      ["difference_pct", "En %"],
                    ]}
                    rowSpan={2}
                    {...sortProps}
                  />
                  <SortHeader label="Estado, motivo y nota" rowSpan={2} {...sortProps} />
                  <th scope="col" rowSpan={2} className={th}>
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
                <PurchaseSubHeaders />
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <NoveltyRow key={row.id} {...rowProps(row)} />
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

interface RowProps {
  row: Novelty;
  reasons: CostReason[] | undefined;
  canSetReasons: boolean;
  manages: boolean;
  onOpen: () => void;
  onRegisterNote: () => void;
}

function NoveltyRow({ row, reasons, canSetReasons, manages, onOpen, onRegisterNote }: RowProps) {
  const line = row.line;
  return (
    <tr className={cn("hover:bg-primary-subtle", row.voided && "text-text-secondary")}>
      <td className={td}>
        <EntryCell line={line} />
      </td>
      <td className={td}>
        <ProductCell line={line} />
      </td>
      <PurchaseCells line={line} />
      <td className={td}>
        <QuotationCell line={line} />
      </td>
      <td className={td}>
        <DifferenceCell line={line} />
      </td>
      <td className={td}>
        <div className="space-y-1.5">
          <StatusReason row={row} reasons={reasons} canSetReasons={canSetReasons} />
          <CreditNoteCell row={row} manages={manages} onOpen={onOpen} onRegisterNote={onRegisterNote} />
        </div>
      </td>
      <td className={cn(td, "px-1")}>
        <DetailButton row={row} onOpen={onOpen} />
      </td>
    </tr>
  );
}

function NoveltyCard(props: RowProps) {
  const { row, reasons, canSetReasons, manages, onOpen, onRegisterNote } = props;
  return (
    <li className={cn("space-y-3 rounded-lg border border-border bg-surface p-3 text-sm", row.voided && "text-text-secondary")}>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <ProductCell line={row.line} />
        <div className="text-right">
          <EntryCell line={row.line} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PurchaseFigures line={row.line} />
        <div className="space-y-2">
          <QuotationFigures line={row.line} />
          <DifferenceCell line={row.line} />
        </div>
      </div>
      <StatusReason row={row} reasons={reasons} canSetReasons={canSetReasons} />
      <div className="flex items-center justify-between gap-2">
        <CreditNoteCell row={row} manages={manages} onOpen={onOpen} onRegisterNote={onRegisterNote} />
        <DetailButton row={row} onOpen={onOpen} />
      </div>
    </li>
  );
}

function DetailButton({ row, onOpen }: { row: Novelty; onOpen: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="max-md:size-11"
      onClick={onOpen}
      aria-label={`Ver detalle e historial de ${row.line.document ?? "la novedad"}, referencia ${row.line.sku}`}
      title="Detalle e historial"
    >
      <PanelRightOpen aria-hidden="true" />
    </Button>
  );
}

/** The status (it follows from the reason and the note), what the line was, and its one reason. */
function StatusReason({ row, reasons, canSetReasons }: { row: Novelty; reasons: CostReason[] | undefined; canSetReasons: boolean }) {
  const line = row.line;
  const look = NOVELTY_STATUS[row.status];
  const save = useSetNoveltyReason();
  return (
    <div className="min-w-0 space-y-1">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Badge tone={look.tone} title={look.help}>
          {row.status_label}
        </Badge>
        <span className="text-xs text-text-secondary">{row.kind_label}</span>
      </span>
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
        <span className={cn("block truncate text-xs", !row.reason && "text-text-secondary")} title={row.reason?.name}>
          {row.reason?.name ?? "Sin motivo"}
        </span>
      )}
    </div>
  );
}

/** The note's number and amount (opens the detail with its file), or the way to register it. */
function CreditNoteCell({
  row,
  manages,
  onOpen,
  onRegisterNote,
}: {
  row: Novelty;
  manages: boolean;
  onOpen: () => void;
  onRegisterNote: () => void;
}) {
  const note = row.credit_note;
  if (note) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Nota crédito ${note.number} por ${formatCop(note.amount)}: ver detalle`}
        className="block max-w-full rounded-sm text-left text-[13px] tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex items-center gap-1 font-semibold">
          <FileText className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className="truncate">{note.number}</span>
        </span>
        <span className="block text-xs text-text-secondary">{formatCop(note.amount)}</span>
      </button>
    );
  }
  if (manages && !row.voided) {
    return (
      <Button
        variant={row.status === "espera_nota_credito" ? "outline" : "ghost"}
        size="sm"
        className="h-7 px-2 max-md:h-11"
        onClick={onRegisterNote}
        aria-label={`Registrar nota crédito de ${row.line.document ?? "la entrada"}, referencia ${row.line.sku}`}
      >
        <Plus aria-hidden="true" /> Registrar
      </Button>
    );
  }
  return <span className="text-xs text-text-secondary">Sin nota</span>;
}
