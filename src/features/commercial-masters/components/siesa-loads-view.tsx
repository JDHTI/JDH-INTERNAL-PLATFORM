"use client";

import { useId, useState } from "react";
import { Ban, Check, CloudOff, FileX2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { formatWhen } from "@/features/supports/lib/format";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Field } from "@/shared/components/ui/field";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { useConfirmSiesaLoad, useSiesaLoad, useSiesaLoads, useVoidSiesaLoad } from "../hooks/use-commercial-masters";
import type { SiesaLoad, SiesaLoadDetail, SiesaLoadStatus } from "../types/price-increases.types";
import { formatIncreaseDay } from "./increase-format";
import { LOAD_STATUS, LoadFiles, LoadRowsTable, LoadStatusBadge, LoadSteps } from "./siesa-load-parts";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * The SIESA loads, the latest first, with chips by status. A row opens its
 * quotations and its two files; a generated one is confirmed (the day it was
 * loaded in SIESA) or voided by whoever manages the history.
 */
export default function SiesaLoadsView() {
  const [status, setStatus] = useState<SiesaLoadStatus | "">("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const query = useSiesaLoads({ status, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];

  return (
    <div className="space-y-3">
      <section aria-label="Cómo se carga una alza en SIESA" className="rounded-lg border border-border bg-surface px-4 py-3">
        <LoadSteps />
      </section>

      <div role="group" aria-label="Filtrar por estado del lote" className="flex flex-wrap gap-2">
        {(Object.keys(LOAD_STATUS) as SiesaLoadStatus[]).map((key) => (
          <ToggleChip
            key={key}
            active={status === key}
            onClick={() => {
              setStatus((current) => (current === key ? "" : key));
              setPage(1);
            }}
            count={result?.counts[key] ?? (result ? 0 : undefined)}
          >
            {LOAD_STATUS[key].label}
          </ToggleChip>
        ))}
      </div>

      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando los lotes de cargue" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar los lotes"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        <StatePanel icon={FileX2} title={status ? "Ningún lote en ese estado" : "Aún no hay lotes de cargue"}>
          Se generan en el acumulado de alzas: marca las pendientes y usa «Generar cargue a SIESA».
        </StatePanel>
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Lotes de cargue a SIESA</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Lote</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right">Alzas</th>
                  <th scope="col" className="px-3 py-2">Generado</th>
                  <th scope="col" className="px-3 py-2">Cargado en SIESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((load) => (
                  <LoadRow key={load.id} load={load} onOpen={() => setOpen(load.id)} />
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "lote" : "lotes"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <LoadDialog id={open} canManage={result?.can_manage === true} onClose={() => setOpen(null)} />
    </div>
  );
}

function LoadRow({ load, onOpen }: { load: SiesaLoad; onOpen: () => void }) {
  return (
    <tr className="cursor-pointer align-top hover:bg-primary-subtle" onClick={onOpen}>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="rounded-sm font-semibold tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          Lote {load.number}
          <span className="sr-only">. Ver sus cotizaciones</span>
        </button>
      </td>
      <td className="px-3 py-2">
        <LoadStatusBadge status={load.status} label={load.status_label} />
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{numberFormat.format(load.row_count)}</td>
      <td className="px-3 py-2">
        <span className="block">{load.created_by}</span>
        <span className="block text-xs text-text-secondary">{formatWhen(load.created_at)}</span>
      </td>
      <td className="px-3 py-2 tabular-nums">{load.loaded_on ? formatIncreaseDay(load.loaded_on) : "—"}</td>
    </tr>
  );
}

function LoadDialog({ id, canManage, onClose }: { id: string | null; canManage: boolean; onClose: () => void }) {
  const query = useSiesaLoad(id);
  const load = query.data;
  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => !open && onClose()}
      wide
      title={load ? `Lote ${load.number}` : "Lote de cargue"}
      description={load ? `${load.status_label} · ${numberFormat.format(load.row_count)} ${load.row_count === 1 ? "cotización" : "cotizaciones"}` : undefined}
    >
      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el lote" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(query.error)}
        </p>
      ) : load ? (
        <LoadDetail load={load} canManage={canManage} onClose={onClose} />
      ) : null}
    </Dialog>
  );
}

function LoadDetail({ load, canManage, onClose }: { load: SiesaLoadDetail; canManage: boolean; onClose: () => void }) {
  const dateId = useId();
  const today = toIso(new Date());
  const [loadedOn, setLoadedOn] = useState(today);
  const [voiding, setVoiding] = useState(false);
  const confirm = useConfirmSiesaLoad();
  const voidLoad = useVoidSiesaLoad();
  const open = load.status === "generado";
  const dateProblem = loadedOn === "" ? "Elige el día en que se cargó." : loadedOn > today ? "No puede ser un día futuro." : null;

  return (
    <div className="space-y-4">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Fact label="Generado">
          {load.created_by}, {formatWhen(load.created_at)}
        </Fact>
        {load.confirmed_by && (
          <Fact label="Confirmado">
            {load.confirmed_by}, {formatWhen(load.confirmed_at)} · cargado el {formatIncreaseDay(load.loaded_on)}
          </Fact>
        )}
        {load.voided_by && (
          <Fact label="Anulado">
            {load.voided_by}, {formatWhen(load.voided_at)}
          </Fact>
        )}
      </dl>

      {load.status !== "anulado" && <LoadFiles load={load} />}
      <LoadRowsTable rows={load.rows} caption={`Cotizaciones del lote ${load.number}`} />

      {open && canManage && (
        <section aria-labelledby={`${dateId}-title`} className="space-y-2 rounded-lg border border-border p-3">
          <h3 id={`${dateId}-title`} className="text-sm font-semibold">
            Confirmar el cargue en SIESA
          </h3>
          <p className="text-[13px] text-text-secondary">
            Cuando el TXT ya esté cargado en SIESA: las alzas del lote toman esa fecha y dejan de estar pendientes. Si no se cargó, anula el
            lote y sus alzas quedan libres para otro.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Día del cargue" htmlFor={dateId} error={dateProblem}>
              <DatePicker id={dateId} value={loadedOn} max={today} onChange={setLoadedOn} className="w-44" aria-invalid={dateProblem !== null} />
            </Field>
            <Button
              onClick={() =>
                confirm.mutate(
                  { id: load.id, loadedOn },
                  { onSuccess: (done) => toast.success(`Lote ${done.number} confirmado: sus alzas ya no están pendientes.`) }
                )
              }
              disabled={dateProblem !== null || confirm.isPending}
              className="max-md:h-11"
            >
              <Check aria-hidden="true" /> {confirm.isPending ? "Confirmando…" : "Confirmar cargue en SIESA"}
            </Button>
            <Button variant="ghost" onClick={() => setVoiding(true)} className="max-md:h-11">
              <Ban aria-hidden="true" /> Anular
            </Button>
          </div>
          <DialogError message={confirm.isError ? errorMessage(confirm.error) : null} />
        </section>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </DialogFooter>

      <ConfirmDeleteDialog
        open={voiding}
        onOpenChange={(next) => {
          setVoiding(next);
          if (!next) voidLoad.reset();
        }}
        title={`¿Anular el lote ${load.number}?`}
        confirmLabel={voidLoad.isPending ? "Anulando…" : "Anular lote"}
        isPending={voidLoad.isPending}
        error={voidLoad.isError ? errorMessage(voidLoad.error) : null}
        onConfirm={() =>
          voidLoad.mutate(load.id, {
            onSuccess: () => {
              setVoiding(false);
              toast.success(`Lote ${load.number} anulado: sus alzas quedan libres.`);
            },
          })
        }
      >
        Hazlo solo si el TXT no se cargó en SIESA. Sus {numberFormat.format(load.row_count)} alzas siguen pendientes y pueden ir en otro lote.
      </ConfirmDeleteDialog>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
