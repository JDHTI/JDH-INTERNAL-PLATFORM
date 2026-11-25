"use client";

import { useId, useState } from "react";
import { CheckCheck, CloudOff, Download, FileX2, Loader2, RefreshCw, Search, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";

import FilterPanel from "@/shared/components/filter-panel";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";
import { formatCop } from "@/features/supports/lib/format";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

import {
  useExportPriceIncreases,
  useMarkPriceIncreasesLoaded,
  usePriceIncreaseOptions,
  usePriceIncreases,
  useSetPriceIncreaseDate,
} from "../hooks/use-commercial-masters";
import type { IncreaseScope, IncreaseStatus, PriceIncrease, SiesaLoadSelection } from "../types/price-increases.types";
import { INCREASE_STATUS, formatChange, formatIncreaseDay } from "./increase-format";
import { IncreaseScopeFilters, ScopeNote, useIncreaseScope } from "./increase-scope-filters";
import IncreaseSupplierFilter from "./increase-supplier-filter";
import PriceIncreasesUploadDialog from "./price-increases-upload-dialog";
import SiesaLoadDialog from "./siesa-load-dialog";

const PAGE_SIZE = 50;
/** What one load takes when it is every pending one of the filter. */
const MAX_LOAD = 2000;
const numberFormat = new Intl.NumberFormat("es-CO");
const STATUS = INCREASE_STATUS;
const formatDay = formatIncreaseDay;
const money = (value: Decimal | null) => (toNumber(value) === null ? "—" : formatCop(value!));
/** The cost the supplier charges: with the healthy-food tax when the row has it. */
const charged = (withTax: Decimal | null, without: Decimal | null) => (toNumber(withTax) !== null ? withTax : without);

/** A pending increase that is in no open load: the only kind a SIESA load takes. */
const loadable = (row: PriceIncrease) => row.is_pending && row.open_load === null;

/**
 * The purchasing area's price increase history, under the product master: what
 * went up, down or stayed, and what SIESA does not have yet (no system update
 * date: the quoter compares its new cost). The counts are chips that filter.
 * Increases come in when a supplier's request is approved, or from the area's
 * workbook (still kept in a sheet: downloaded in its format and uploaded back).
 * Managers send the pending ones to SIESA in a load, mark the ones already
 * loaded outside (no file), or set the system date row by row.
 */
export default function PriceIncreasesView() {
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<IncreaseStatus | "">("");
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useIncreaseScope();
  const q = useDebouncedValue(text.trim());
  const query = usePriceIncreases({ q, supplier, status, pending, ...scope, page, size: PAGE_SIZE });
  const options = usePriceIncreaseOptions();
  const result = query.data;
  const rows = result?.items ?? [];
  const counts = result?.counts;
  const canManage = result?.can_manage === true;
  const scoped = scope.co !== "" || scope.installation !== "";
  const filtered = q !== "" || supplier !== "" || status !== "" || pending || scoped;

  // The selection belongs to the filter it was made under: another filter starts empty.
  const filterKey = JSON.stringify([q, supplier, status, scope.co, scope.installation]);
  const [picked, setPicked] = useState<{ key: string; ids: Set<string>; all: boolean }>({ key: "", ids: new Set(), all: false });
  const selection = picked.key === filterKey ? picked : { key: filterKey, ids: new Set<string>(), all: false };
  const [loading, setLoading] = useState<SiesaLoadSelection | null>(null);
  const toggle = (id: string) => {
    const ids = new Set(selection.ids);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    setPicked({ key: filterKey, ids, all: false });
  };
  const pageLoadable = rows.filter(loadable).map((row) => row.id);
  const togglePage = (on: boolean) => {
    const ids = new Set(selection.ids);
    for (const id of pageLoadable) {
      if (on) ids.add(id);
      else ids.delete(id);
    }
    setPicked({ key: filterKey, ids, all: false });
  };
  const clearSelection = () => setPicked({ key: filterKey, ids: new Set(), all: false });
  const [marking, setMarking] = useState<SiesaLoadSelection | null>(null);
  const [uploading, setUploading] = useState(false);
  const exporter = useExportPriceIncreases();
  /** The picked increases, or every pending one of the filter, as the API takes them. */
  const picks = (): SiesaLoadSelection =>
    selection.all
      ? {
          all: true,
          filters: {
            q: q || undefined,
            status: status || undefined,
            supplier: supplier || undefined,
            co: scope.co || undefined,
            installation: scope.installation || undefined,
          },
        }
      : { increase_ids: [...selection.ids] };
  const pickedCount = selection.all ? Math.min(counts?.pendientes ?? 0, MAX_LOAD) : selection.ids.size;
  const download = () => {
    // The whole history takes about 20 s to build: say so while it does.
    const notice = toast.loading("Preparando el acumulado de alzas…");
    exporter.mutate(
      { q, supplier, status, pending, co: scope.co, installation: scope.installation },
      {
        onSuccess: () => toast.success("Acumulado de alzas descargado.", { id: notice }),
        onError: (failure) => toast.error(errorMessage(failure), { id: notice, duration: Infinity }),
      }
    );
  };
  const changeScope = (next: IncreaseScope) => {
    setScope(next);
    setPage(1);
  };

  const chooseStatus = (next: IncreaseStatus | "") => {
    setStatus((current) => (current === next ? "" : next));
    setPage(1);
  };
  const clear = () => {
    setText("");
    setSupplier("");
    setStatus("");
    setPending(false);
    if (scoped) setScope({ co: "", installation: "" });
    setPage(1);
  };

  return (
    <div className="space-y-3">
      {/* The same panel as the analysis: the two fields in one row, the
          states as chips below and, at the other end, clearing and loading. */}
      <FilterPanel
        label="Filtros del histórico"
        columns="md:grid-cols-4"
        fields={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setPage(1);
                }}
                placeholder="Referencia o descripción"
                aria-label="Buscar en el histórico de alzas por referencia o descripción"
                className="pl-9"
              />
            </div>
            <IncreaseSupplierFilter
              className="w-full"
              suppliers={options.data?.suppliers}
              value={supplier}
              onChange={(code) => {
                setSupplier(code);
                setPage(1);
              }}
            />
            <IncreaseScopeFilters options={options.data} scope={scope} onChange={changeScope} />
          </>
        }
        chips={
          <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {(Object.keys(STATUS) as IncreaseStatus[]).map((key) => (
              <ToggleChip key={key} active={status === key} onClick={() => chooseStatus(key)} count={counts?.[key]}>
                {STATUS[key].label}
              </ToggleChip>
            ))}
            <ToggleChip
              active={pending}
              onClick={() => {
                setPending((current) => !current);
                setPage(1);
              }}
              count={counts?.pendientes}
              title="Sin fecha de actualización en SIESA: el cotizador compara su costo nuevo"
            >
              Pendientes en SIESA
            </ToggleChip>
          </div>
        }
        end={
          <>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clear}>
                Limpiar filtros
              </Button>
            )}
            <Button
              variant="outline"
              onClick={download}
              disabled={exporter.isPending}
              title="El histórico de los filtros en el formato del libro «Acumulado Alza Precios»"
            >
              {exporter.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Descargar acumulado
            </Button>
            {canManage && (
              <Button variant="outline" onClick={() => setUploading(true)} title="Sube el libro «Acumulado Alza Precios» que se lleva en el sheet aparte">
                <Upload aria-hidden="true" /> Cargar acumulado
              </Button>
            )}
          </>
        }
      />

      <ScopeNote scope={scope} />

      {canManage && (counts?.pendientes ?? 0) > 0 && (
        <LoadBar
          count={selection.all ? null : selection.ids.size}
          pendingInFilter={counts?.pendientes ?? 0}
          onSelectAll={() => setPicked({ key: filterKey, ids: new Set(), all: true })}
          onClear={clearSelection}
          onGenerate={() => setLoading(picks())}
          onMark={() => setMarking(picks())}
        />
      )}

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el histórico de alzas" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo cargar el histórico de alzas"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => query.refetch()}>
                <RefreshCw aria-hidden="true" /> Reintentar
              </Button>
              {/* With a C.O. or installation the API needs the DWH (503 when it is down). */}
              {scoped && (
                <Button variant="outline" onClick={() => changeScope({ co: "", installation: "" })}>
                  Quitar C.O. e instalación
                </Button>
              )}
            </div>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        filtered ? (
          <StatePanel icon={FileX2} title="Ninguna alza coincide con los filtros" action={<Button variant="outline" onClick={clear}>Limpiar filtros</Button>}>
            Prueba con otro texto, otro proveedor o quita algún filtro.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Aún no hay alzas">
            Entran al aprobar una solicitud en Alzas de proveedor o al cargar el acumulado de alzas.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Histórico de alza de precios</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {canManage && (
                    <th scope="col" className="w-10 py-2 pl-3 pr-0">
                      <input
                        type="checkbox"
                        checked={selection.all || (pageLoadable.length > 0 && pageLoadable.every((id) => selection.ids.has(id)))}
                        ref={(element) => {
                          if (element) element.indeterminate = !selection.all && pageLoadable.some((id) => selection.ids.has(id)) && !pageLoadable.every((id) => selection.ids.has(id));
                        }}
                        onChange={(event) => togglePage(event.target.checked)}
                        disabled={selection.all || pageLoadable.length === 0}
                        aria-label="Seleccionar las alzas pendientes de esta página"
                        title="Solo se marcan las pendientes en SIESA que no están en un lote abierto"
                        className="size-4 accent-[var(--primary)]"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2">Producto</th>
                  <th scope="col" className="px-3 py-2">Incremento</th>
                  <th scope="col" className="px-3 py-2 text-right">Costo anterior</th>
                  <th scope="col" className="px-3 py-2 text-right">Costo nuevo</th>
                  <th scope="col" className="px-3 py-2 text-right">Variación</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Origen</th>
                  <th scope="col" className="px-3 py-2">Actualizado en SIESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <IncreaseRow
                    key={row.id}
                    row={row}
                    canManage={canManage}
                    checked={loadable(row) && (selection.all || selection.ids.has(row.id))}
                    onToggle={selection.all ? undefined : () => toggle(row.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "alza" : "alzas"}
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

      <SiesaLoadDialog selection={loading} onClose={() => setLoading(null)} onGenerated={clearSelection} />
      <MarkLoadedDialog selection={marking} count={pickedCount} onClose={() => setMarking(null)} onDone={clearSelection} />
      <PriceIncreasesUploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  );
}

/**
 * The action bar of the pending increases: how many are picked, taking every
 * pending one of the filter, and the two ways to SIESA: a load with its files,
 * or marking them as already loaded (to catch up, no file).
 */
function LoadBar({
  count,
  pendingInFilter,
  onSelectAll,
  onClear,
  onGenerate,
  onMark,
}: {
  /** Null: every pending one of the filter. */
  count: number | null;
  pendingInFilter: number;
  onSelectAll: () => void;
  onClear: () => void;
  onGenerate: () => void;
  onMark: () => void;
}) {
  const any = count === null || count > 0;
  const hint = any ? undefined : "Marca las alzas pendientes en la tabla, o toma todas las del filtro";
  return (
    <div role="region" aria-label="Alzas pendientes en SIESA" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      {any && (
        <span className="text-sm font-medium tabular-nums" aria-live="polite">
          {count === null
            ? `Todas las pendientes del filtro (${numberFormat.format(Math.min(pendingInFilter, MAX_LOAD))})`
            : `${numberFormat.format(count)} ${count === 1 ? "alza seleccionada" : "alzas seleccionadas"}`}
        </span>
      )}
      {count !== null && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className="max-md:h-11"
          title="Marca las pendientes en la tabla, o toma todas las del filtro (hasta 2.000; las que están en un lote abierto quedan por fuera)"
        >
          Seleccionar las {numberFormat.format(Math.min(pendingInFilter, MAX_LOAD))} pendientes del filtro
        </Button>
      )}
      {any && (
        <Button variant="ghost" size="sm" onClick={onClear} className="max-md:h-11">
          <X aria-hidden="true" /> Quitar selección
        </Button>
      )}
      <span className="ml-auto flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={onMark}
          disabled={!any}
          className="max-md:h-11"
          title={hint ?? "Ya están en SIESA: toman la fecha que elijas, sin lote ni archivos"}
        >
          <CheckCheck aria-hidden="true" /> Marcar como cargadas
        </Button>
        <Button onClick={onGenerate} disabled={!any} className="max-md:h-11" title={hint}>
          <Send aria-hidden="true" /> Generar cargue a SIESA
        </Button>
      </span>
    </div>
  );
}

/**
 * Pending increases that SIESA already has, loaded outside the platform: they
 * take the chosen day as their SIESA date, without a load or a file.
 */
function MarkLoadedDialog({
  selection,
  count,
  onClose,
  onDone,
}: {
  selection: SiesaLoadSelection | null;
  /** How many the selection holds, to say it; null when unknown. */
  count: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const dateId = useId();
  const today = toIso(new Date());
  const [day, setDay] = useState(today);
  const mark = useMarkPriceIncreasesLoaded();
  const problem = day === "" ? "Elige el día en que se cargaron." : day > today ? "No puede ser un día futuro." : null;
  const close = () => {
    mark.reset();
    setDay(today);
    onClose();
  };
  return (
    <Dialog
      open={selection !== null}
      onOpenChange={(open) => !open && close()}
      title="Marcar como cargadas en SIESA"
      description={`${count === null ? "Las alzas elegidas" : `${numberFormat.format(count)} ${count === 1 ? "alza" : "alzas"}`} dejan de estar pendientes con esta fecha de SIESA. No se genera lote ni archivo: úsalo para lo que ya se cargó por fuera.`}
    >
      <Field label="Día del cargue en SIESA" htmlFor={dateId} error={problem}>
        <DatePicker id={dateId} value={day} max={today} onChange={setDay} className="w-44" aria-invalid={problem !== null} />
      </Field>
      <DialogError message={mark.isError ? errorMessage(mark.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button
          disabled={problem !== null || mark.isPending || selection === null}
          onClick={() =>
            selection &&
            mark.mutate(
              { selection, day },
              {
                onSuccess: ({ updated, skipped }) => {
                  toast.success(`${numberFormat.format(updated)} ${updated === 1 ? "alza marcada" : "alzas marcadas"} como cargadas en SIESA.`);
                  if (skipped > 0) {
                    toast.warning(
                      `${numberFormat.format(skipped)} ${skipped === 1 ? "quedó" : "quedaron"} por fuera: ${skipped === 1 ? "está" : "están"} en un lote abierto o ya no ${skipped === 1 ? "estaba pendiente" : "estaban pendientes"}.`,
                      { duration: 10_000 }
                    );
                  }
                  onDone();
                  close();
                },
              }
            )
          }
        >
          {mark.isPending ? "Marcando…" : "Marcar como cargadas"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function IncreaseRow({
  row,
  canManage,
  checked,
  onToggle,
}: {
  row: PriceIncrease;
  canManage: boolean;
  checked: boolean;
  /** Undefined while every pending one of the filter is taken. */
  onToggle?: () => void;
}) {
  const look = row.status ? STATUS[row.status] : null;
  const variation = toNumber(row.variation_pct);
  return (
    <tr className={cn("h-10 align-top hover:bg-primary-subtle", checked && "bg-primary-subtle")}>
      {canManage && (
        <td className="py-2 pl-3 pr-0">
          {loadable(row) && (
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              disabled={!onToggle}
              aria-label={`Seleccionar el alza de ${row.sku} para el cargue a SIESA`}
              className="size-4 accent-[var(--primary)]"
            />
          )}
        </td>
      )}
      <td className="max-w-80 px-3 py-2">
        <span className="block truncate" title={row.description ?? undefined}>
          <span className="font-mono text-[13px]">{row.sku}</span>
          {row.description && <span className="text-text-secondary"> · {row.description}</span>}
        </span>
        <span className="block truncate text-xs text-text-secondary">
          {row.is_known_product ? (row.supplier_name ?? "—") : "No está en el maestro de productos"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums" title={row.notified_on ? `Notificada el ${formatDay(row.notified_on)}` : undefined}>
        {formatDay(row.increased_on)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(charged(row.old_cost_with_tax, row.old_cost))}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{money(charged(row.new_cost_with_tax, row.new_cost))}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
        {money(row.variation_amount)}
        {variation !== null && <span className="block text-xs text-text-secondary">{formatChange(variation)}</span>}
      </td>
      <td className="px-3 py-2">{look ? <Badge tone={look.tone}>{look.label}</Badge> : "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{row.source === "solicitud" ? "Solicitud del proveedor" : "Libro de alzas"}</td>
      <td className="px-3 py-2">
        <span className="flex flex-col items-start gap-1">
          <SystemDate row={row} canManage={canManage} />
          {row.open_load !== null && (
            <Badge tone="info" title="Está en un lote de cargue generado y aún no confirmado">
              En lote {row.open_load}
            </Badge>
          )}
        </span>
      </td>
    </tr>
  );
}

/**
 * When SIESA got the increase. Empty is pending: the quoter compares its new
 * cost. A manager sets or clears it in place; it saves on change.
 */
function SystemDate({ row, canManage }: { row: PriceIncrease; canManage: boolean }) {
  const save = useSetPriceIncreaseDate();
  const set = (day: string | null) =>
    save.mutate(
      { id: row.id, day },
      { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
    );
  if (!canManage) {
    return row.system_updated_on ? <span className="tabular-nums">{formatDay(row.system_updated_on)}</span> : <Badge tone="info">Pendiente</Badge>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="date"
        value={row.system_updated_on ?? ""}
        onChange={(event) => {
          if (event.target.value) set(event.target.value);
        }}
        disabled={save.isPending}
        title={row.system_updated_on ? undefined : "Pendiente en SIESA: el cotizador compara su costo nuevo"}
        aria-label={`Fecha de actualización en SIESA de ${row.sku}${row.system_updated_on ? "" : ", pendiente"}`}
        className={cn("h-8 w-36 tabular-nums max-md:h-11", !row.system_updated_on && "border-info text-text-secondary")}
      />
      {row.system_updated_on && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => set(null)}
          disabled={save.isPending}
          aria-label={`Marcar ${row.sku} como pendiente en SIESA`}
          title="Quitar la fecha: vuelve a pendiente"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </span>
  );
}
