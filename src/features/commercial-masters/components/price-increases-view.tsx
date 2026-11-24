"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";

import FilterPanel from "@/shared/components/filter-panel";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { formatCop } from "@/features/supports/lib/format";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

import { usePriceIncreaseOptions, usePriceIncreases, useSetPriceIncreaseDate } from "../hooks/use-commercial-masters";
import type { IncreaseScope, IncreaseStatus, PriceIncrease } from "../types/price-increases.types";
import { INCREASE_STATUS, formatChange, formatIncreaseDay } from "./increase-format";
import { IncreaseScopeFilters, ScopeNote, useIncreaseScope } from "./increase-scope-filters";
import IncreaseSupplierFilter from "./increase-supplier-filter";
import PriceIncreasesUploadDialog from "./price-increases-upload-dialog";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");
const STATUS = INCREASE_STATUS;
const formatDay = formatIncreaseDay;
const money = (value: Decimal | null) => (toNumber(value) === null ? "—" : formatCop(value!));
/** The cost the supplier charges: with the healthy-food tax when the row has it. */
const charged = (withTax: Decimal | null, without: Decimal | null) => (toNumber(withTax) !== null ? withTax : without);

/**
 * The purchasing area's price increase history, under the product master: what
 * went up, down or stayed, and what SIESA does not have yet (no system update
 * date: the quoter compares its new cost). The counts are chips that filter.
 * Managers upload the workbook and set the system date row by row.
 */
export default function PriceIncreasesView() {
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<IncreaseStatus | "">("");
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [scope, setScope] = useIncreaseScope();
  const q = useDebouncedValue(text.trim());
  const query = usePriceIncreases({ q, supplier, status, pending, ...scope, page, size: PAGE_SIZE });
  const options = usePriceIncreaseOptions();
  const result = query.data;
  const rows = result?.items ?? [];
  const counts = result?.counts;
  const scoped = scope.co !== "" || scope.installation !== "";
  const filtered = q !== "" || supplier !== "" || status !== "" || pending || scoped;
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
            {result?.can_manage && (
              <Button variant="outline" onClick={() => setUploading(true)}>
                <Upload aria-hidden="true" /> Cargar alzas
              </Button>
            )}
          </>
        }
      />

      <ScopeNote scope={scope} />

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
          <StatePanel icon={FileX2} title="Aún no hay alzas cargadas">
            {result?.can_manage ? "Carga el acumulado de alzas con «Cargar alzas»." : "Las carga quien gestiona el acumulado de alzas."}
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Histórico de alza de precios</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
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
                  <IncreaseRow key={row.id} row={row} canManage={result?.can_manage === true} />
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

      <PriceIncreasesUploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  );
}

function IncreaseRow({ row, canManage }: { row: PriceIncrease; canManage: boolean }) {
  const look = row.status ? STATUS[row.status] : null;
  const variation = toNumber(row.variation_pct);
  return (
    <tr className="h-10 align-top hover:bg-primary-subtle">
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
        <SystemDate row={row} canManage={canManage} />
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
