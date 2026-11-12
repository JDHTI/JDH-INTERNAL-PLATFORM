"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CloudUpload, FileCheck2, FileSpreadsheet, FileText, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";

import { useCreateLoad, useLoads, useStaging } from "../hooks/use-list-review";
import { useQuotationPermissions } from "../hooks/use-quotations";
import { formatCount, formatDateTime, formatDay, formatMoney, formatVariation } from "../lib/format";
import { downloadStagingFile } from "../services/quotations.service";
import type { ListKind, StagedList } from "../types/quotations.types";
import { QuotationLoadError } from "./quotations-gate";
import { tomorrow } from "./review-dialogs";

/**
 * What was validated and is not in SIESA yet, list by list. Whoever validates
 * picks the activation date, downloads the list's two SIESA pages (prices and
 * value taxes), loads them, and marks them loaded: the items leave this page
 * and the load stays in the history below.
 */
export default function StagingView({ kind, basePath }: { kind: ListKind; basePath: string }) {
  const staging = useStaging(kind);
  const loads = useLoads(kind);
  const canValidate = useQuotationPermissions(kind).data?.can_validate === true;
  const [activation, setActivation] = useState(tomorrow());
  const dateId = useId();
  const today = toIso(new Date());

  if (staging.isPending) return <TableSkeleton rows={6} label="Cargando lo que está por cargar" />;
  if (staging.isError && !staging.data) {
    return <QuotationLoadError error={staging.error} onRetry={() => void staging.refetch()} subject="lo que está por cargar" />;
  }
  const groups = staging.data;
  const total = groups.reduce((sum, group) => sum + group.item_count, 0);

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <StatePanel icon={Inbox} title="No hay nada por cargar">
          Cuando quien valida acepte ítems de una actualización, aparecerán aquí agrupados por lista para descargar sus archivos
          y cargarlos en SIESA.
        </StatePanel>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{formatCount(total)}</span> {total === 1 ? "ítem validado" : "ítems validados"} en{" "}
              <span className="font-semibold tabular-nums">{formatCount(groups.length)}</span> {groups.length === 1 ? "lista" : "listas"}.
              {!canValidate && " Quien valida descarga los archivos y los carga en SIESA."}
            </p>
            {canValidate && (
              <div className="space-y-1">
                <label htmlFor={dateId} className="block text-xs text-text-secondary">Fecha de activación en SIESA</label>
                <Input
                  id={dateId}
                  type="date"
                  value={activation}
                  min={today}
                  onChange={(event) => setActivation(event.target.value)}
                  className="w-44 max-md:h-11"
                />
              </div>
            )}
          </div>
          {groups.map((group) => (
            <StagedListCard key={group.price_list_id} kind={kind} group={group} basePath={basePath} canValidate={canValidate} activation={activation} />
          ))}
        </>
      )}

      <section aria-labelledby="loads-title" className="space-y-2">
        <h2 id="loads-title" className="text-base font-semibold">Últimas cargas</h2>
        {loads.isPending ? (
          <TableSkeleton rows={3} label="Cargando las últimas cargas" />
        ) : loads.isError ? (
          <p role="alert" className="text-sm text-danger">{errorMessage(loads.error)}</p>
        ) : loads.data.length === 0 ? (
          <p className="text-sm text-text-secondary">Aún no se ha marcado ninguna carga.</p>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Últimas cargas en SIESA</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Lista</th>
                  <th scope="col" className="px-3 py-2 text-right">Ítems</th>
                  <th scope="col" className="px-3 py-2">Activación</th>
                  <th scope="col" className="px-3 py-2">Marcó la carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loads.data.map((load) => (
                  <tr key={load.id}>
                    <td className="px-3 py-2">
                      <span className="font-mono">{load.price_list_id}</span>
                      {load.price_list_name && <span className="text-text-secondary"> · {load.price_list_name}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(load.line_count)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDay(load.activation_date)}</td>
                    <td className="px-3 py-2">
                      {load.created_by} <span className="text-text-secondary">· {formatDateTime(load.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StagedListCard({
  kind,
  group,
  basePath,
  canValidate,
  activation,
}: {
  kind: ListKind;
  group: StagedList;
  basePath: string;
  canValidate: boolean;
  activation: string;
}) {
  const [downloading, setDownloading] = useState<"xlsx" | "txt" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  const download = async (format: "xlsx" | "txt") => {
    setDownloading(format);
    try {
      await downloadStagingFile(kind, group.price_list_id, format, activation);
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section aria-labelledby={titleId} className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold">
          <span className="font-mono">Lista {group.price_list_id}</span>
          {group.price_list_name && <span className="font-normal text-text-secondary"> · {group.price_list_name}</span>}
          <span className="ml-2 text-sm font-normal tabular-nums text-text-secondary">
            {formatCount(group.item_count)} {group.item_count === 1 ? "ítem" : "ítems"}
          </span>
        </h2>
        {canValidate && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void download("xlsx")} disabled={downloading !== null} className="max-md:h-11">
              {downloading === "xlsx" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}
              Excel SIESA
            </Button>
            <Button variant="outline" onClick={() => void download("txt")} disabled={downloading !== null} className="max-md:h-11">
              {downloading === "txt" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
              Plano SIESA
            </Button>
            <Button onClick={() => setConfirming(true)} className="max-md:h-11">
              <FileCheck2 aria-hidden="true" /> Marcar cargada
            </Button>
          </div>
        )}
      </div>
      <div className="relative overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Ítems por cargar de la lista {group.price_list_id}</caption>
          <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" className="px-3 py-2">Referencia</th>
              <th scope="col" className="px-3 py-2 text-right">Precio actual</th>
              <th scope="col" className="px-3 py-2 text-right">Precio nuevo</th>
              <th scope="col" className="px-3 py-2 text-right">Var.</th>
              <th scope="col" className="px-3 py-2 text-right">Imp. consumo</th>
              <th scope="col" className="px-3 py-2">Validó</th>
              <th scope="col" className="px-3 py-2">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {group.items.map((item) => (
              <tr key={item.line_id}>
                <td className="max-w-80 px-3 py-2">
                  <Link
                    href={`${basePath}/${item.quotation_id}`}
                    className="block truncate font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    title={`Abrir la actualización${item.quotation_name ? ` de ${item.quotation_name}` : ""}`}
                  >
                    {item.description ?? item.sku}
                  </Link>
                  <span className="block font-mono text-[13px] text-text-secondary">
                    SKU {item.sku}
                    {item.unit ? ` · ${item.unit}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{item.current_price === null ? "—" : formatMoney(item.current_price)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(item.new_price)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.variation_pct === null ? "—" : formatVariation(item.variation_pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.value_tax_amount === null ? "—" : formatMoney(item.value_tax_amount)}</td>
                <td className="px-3 py-2 text-[13px]">
                  {item.validated_by ?? "—"}
                  {item.validated_at && <span className="block text-text-secondary">{formatDateTime(item.validated_at)}</span>}
                </td>
                <td className="max-w-64 px-3 py-2 text-[13px]">
                  <span className="line-clamp-2" title={item.note ?? undefined}>{item.note ?? <span className="text-text-secondary">—</span>}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadDialog kind={kind} group={group} activation={activation} open={confirming} onOpenChange={setConfirming} />
    </section>
  );
}

/** The validator says the downloaded files are in SIESA; exactly the items on screen go. */
function LoadDialog({
  kind,
  group,
  activation,
  open,
  onOpenChange,
}: {
  kind: ListKind;
  group: StagedList;
  activation: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const load = useCreateLoad(kind);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    setError(null);
    load.mutate(
      { priceListId: group.price_list_id, lineIds: group.items.map((item) => item.line_id), activationDate: activation },
      {
        onSuccess: (result) => {
          toast.success(`Carga de la lista ${result.price_list_id} registrada: ${formatCount(result.line_count)} ítems.`);
          onOpenChange(false);
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && load.isPending) return;
        setError(null);
        onOpenChange(next);
      }}
      isForm={false}
      title={`¿Ya cargaste la lista ${group.price_list_id} en SIESA?`}
    >
      <div className="space-y-4 text-sm">
        <p>
          Se marcan como cargados los {formatCount(group.item_count)} ítems de esta lista, con activación el {formatDay(activation)}. Salen de
          «Por cargar» y la carga queda en el historial. Usa la misma fecha de los archivos que cargaste.
        </p>
        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={load.isPending} className="max-md:h-11">
            Cancelar
          </Button>
          <Button onClick={submit} disabled={load.isPending} className="max-md:h-11">
            {load.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CloudUpload aria-hidden="true" />} Marcar cargada
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
