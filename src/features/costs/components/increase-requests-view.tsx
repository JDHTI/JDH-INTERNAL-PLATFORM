"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudOff, Download, FileDown, FileX2, Keyboard, Loader2, Paperclip, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { formatWhen } from "@/features/supports/lib/format";
import Pager from "@/shared/components/pager";
import BasePicker, { SUPPLIER_PICKER } from "@/shared/components/pickers/base-picker";
import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useDownloadTemplate, useGenerateNotice, useIncreaseRequests } from "../hooks/use-increase-requests";
import { REQUEST_STATUS } from "../lib/format";
import type { CostPermissions } from "../types/costs.types";
import type { RequestStatus } from "../types/increase-requests.types";
import IncreaseUploadDialog from "./increase-upload-dialog";
import ManualRequestDialog from "./manual-request-dialog";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * Where a supplier's increases come in: pick the supplier, hand them their
 * MAESTRA, load it back or type a few references, and review the requests.
 * The tray opens on the ones in review; the supplier narrows it too. Once SIESA
 * has the approved increases, anyone who reads the tray builds the notice to
 * email, from the approved requests picked or all of them.
 */
export default function IncreaseRequestsView({ permissions, basePath }: { permissions: CostPermissions; basePath: string }) {
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const [status, setStatus] = useState<RequestStatus | "">("en_revision");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"upload" | "manual" | null>(null);
  const manages = permissions.modules["alzas-proveedor"]?.can_manage === true;
  const template = useDownloadTemplate();
  const query = useIncreaseRequests({ status, supplier: supplier?.value ?? "", page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];
  const chosen = supplier ? { code: supplier.value, name: supplier.label } : null;
  const approvedInFilter = result?.counts.aprobada ?? 0;

  // The notice's selection belongs to the supplier it was made under.
  const selectionKey = supplier?.value ?? "";
  const [picked, setPicked] = useState<{ key: string; ids: Set<string>; all: boolean }>({ key: "", ids: new Set(), all: false });
  const selection = picked.key === selectionKey ? picked : { key: selectionKey, ids: new Set<string>(), all: false };
  const pageApproved = rows.filter((row) => row.status === "aprobada").map((row) => row.id);
  const pick = (ids: Set<string>, all = false) => setPicked({ key: selectionKey, ids, all });
  const toggle = (id: string) => {
    const ids = new Set(selection.ids);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    pick(ids);
  };
  const togglePage = (on: boolean) => {
    const ids = new Set(selection.ids);
    for (const id of pageApproved) {
      if (on) ids.add(id);
      else ids.delete(id);
    }
    pick(ids);
  };
  const notice = useGenerateNotice();
  const generate = () =>
    notice.mutate(selection.all ? { all: true, supplier: supplier?.value ?? null } : { request_ids: [...selection.ids] }, {
      onSuccess: ({ rows: count, skipped }) => {
        toast.success(`Comunicado descargado con ${numberFormat.format(count)} ${count === 1 ? "alza" : "alzas"}.`);
        if (skipped > 0) {
          toast.warning(
            `${numberFormat.format(skipped)} ${skipped === 1 ? "alza aún no está cargada" : "alzas aún no están cargadas"} en SIESA y no van en el comunicado.`,
            { duration: 10_000 }
          );
        }
      },
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const download = () =>
    supplier &&
    template.mutate(supplier.value, { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) });

  return (
    <div className="space-y-4">
      <section aria-label="Proveedor y acciones" className="space-y-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="lg:w-96">
            <BasePicker
              config={SUPPLIER_PICKER}
              selected={supplier}
              onSelect={(option) => {
                setSupplier(option);
                setPage(1);
              }}
              onClear={() => {
                setSupplier(null);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="max-md:h-11" onClick={download} disabled={!supplier || template.isPending}>
              {template.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
              Descargar MAESTRA
            </Button>
            {manages && (
              <>
                <Button className="max-md:h-11" onClick={() => setDialog("upload")} disabled={!supplier}>
                  <Upload aria-hidden="true" /> Cargar MAESTRA diligenciada
                </Button>
                <Button variant="outline" className="max-md:h-11" onClick={() => setDialog("manual")} disabled={!supplier}>
                  <Keyboard aria-hidden="true" /> Digitar alzas
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-[13px] text-text-secondary">
          {supplier
            ? "La MAESTRA trae los productos activos del proveedor con su costo anterior; el proveedor diligencia el costo nuevo y la fecha."
            : "Elige el proveedor para descargar su MAESTRA, cargarla diligenciada o digitar sus alzas. La lista de abajo muestra las solicitudes de todos."}
        </p>
      </section>

      <div role="group" aria-label="Filtrar solicitudes por estado" className="flex flex-wrap gap-2">
        {(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((key) => (
          <ToggleChip
            key={key}
            active={status === key}
            onClick={() => {
              setStatus((current) => (current === key ? "" : key));
              setPage(1);
            }}
            count={result?.counts[key] ?? (result ? 0 : undefined)}
          >
            {REQUEST_STATUS[key].label}
          </ToggleChip>
        ))}
      </div>

      {approvedInFilter > 0 && (
        <div role="region" aria-label="Comunicado del alza" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-sm tabular-nums" aria-live="polite">
            {selection.all ? (
              <span className="font-medium">
                Todas las aprobadas{supplier ? " del proveedor" : ""} ({numberFormat.format(approvedInFilter)})
              </span>
            ) : selection.ids.size > 0 ? (
              <span className="font-medium">
                {numberFormat.format(selection.ids.size)} {selection.ids.size === 1 ? "solicitud seleccionada" : "solicitudes seleccionadas"}
              </span>
            ) : (
              <span className="text-text-secondary">Marca las solicitudes aprobadas que van en el comunicado, o toma todas.</span>
            )}
          </span>
          {!selection.all && (
            <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => pick(new Set(), true)}>
              Seleccionar las {numberFormat.format(approvedInFilter)} aprobadas{supplier ? " del proveedor" : ""}
            </Button>
          )}
          {(selection.all || selection.ids.size > 0) && (
            <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => pick(new Set())}>
              <X aria-hidden="true" /> Quitar selección
            </Button>
          )}
          <Button
            className="ml-auto max-md:h-11"
            onClick={generate}
            disabled={notice.isPending || (!selection.all && selection.ids.size === 0)}
            title="Solo van las alzas que SIESA ya tiene"
          >
            {notice.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileDown aria-hidden="true" />} Generar comunicado
          </Button>
        </div>
      )}

      {query.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando las solicitudes" />
      ) : query.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las solicitudes"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        <StatePanel
          icon={FileX2}
          title={
            status
              ? `No hay solicitudes ${REQUEST_STATUS[status].label.toLowerCase()}${supplier ? " de este proveedor" : ""}`
              : `Aún no hay solicitudes${supplier ? " de este proveedor" : ""}`
          }
          action={
            status ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
              >
                Ver todas las solicitudes
              </Button>
            ) : undefined
          }
        >
          {manages
            ? "Una solicitud nace al cargar la MAESTRA diligenciada o al digitar las alzas de un proveedor."
            : "Las crea quien gestiona las alzas de proveedor."}
        </StatePanel>
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Solicitudes de alza de los proveedores</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="w-10 py-2 pl-3 pr-0">
                    {pageApproved.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selection.all || pageApproved.every((id) => selection.ids.has(id))}
                        ref={(element) => {
                          if (element)
                            element.indeterminate =
                              !selection.all && pageApproved.some((id) => selection.ids.has(id)) && !pageApproved.every((id) => selection.ids.has(id));
                        }}
                        onChange={(event) => togglePage(event.target.checked)}
                        disabled={selection.all}
                        aria-label="Seleccionar las solicitudes aprobadas de esta página para el comunicado"
                        className="size-4 accent-[var(--primary)]"
                      />
                    )}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">Creada</th>
                  <th scope="col" className="px-3 py-2">Proveedor</th>
                  <th scope="col" className="px-3 py-2">Origen</th>
                  <th scope="col" className="px-3 py-2 text-right">Referencias</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Decisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const look = REQUEST_STATUS[row.status];
                  const approved = row.status === "aprobada";
                  const checked = approved && (selection.all || selection.ids.has(row.id));
                  return (
                    <tr key={row.id} className={cn("h-10 align-top hover:bg-primary-subtle", checked && "bg-primary-subtle")}>
                      <td className="py-2 pl-3 pr-0">
                        {approved && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(row.id)}
                            disabled={selection.all}
                            aria-label={`Incluir en el comunicado la solicitud de ${row.supplier_name ?? row.supplier_code}`}
                            className="size-4 accent-[var(--primary)]"
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatWhen(row.created_at)}
                        <span className="block text-xs text-text-secondary">{row.created_by}</span>
                      </td>
                      <td className="max-w-72 px-3 py-2">
                        <Link
                          href={`${basePath}/${row.id}`}
                          className="block truncate font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {row.supplier_name ?? row.supplier_code}
                        </Link>
                        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                          Código {row.supplier_code}
                          {row.support && (
                            <span className="inline-flex items-center" title={`Con soporte: ${row.support.file_name}`}>
                              <Paperclip className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">, con soporte del proveedor</span>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.source === "plantilla" ? "MAESTRA cargada" : "Digitada"}
                        {row.note && (
                          <span className="block max-w-56 truncate text-xs text-text-secondary" title={row.note}>
                            {row.note}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {row.accepted_count === row.line_count
                          ? numberFormat.format(row.line_count)
                          : `${numberFormat.format(row.accepted_count)} de ${numberFormat.format(row.line_count)}`}
                        {approved && (
                          <span
                            className={cn("block text-xs", row.loaded_count < row.accepted_count ? "text-text-secondary" : "text-success")}
                            title="Líneas aprobadas que SIESA ya tiene: las que van en el comunicado"
                          >
                            {numberFormat.format(row.loaded_count)} de {numberFormat.format(row.accepted_count)} en SIESA
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={look.tone}>{row.status_label}</Badge>
                      </td>
                      <td className="max-w-72 px-3 py-2">
                        {row.decided_by ? (
                          <>
                            <span className="block text-xs text-text-secondary">
                              {row.decided_by}, {formatWhen(row.decided_at)}
                            </span>
                            {row.decision_note && (
                              <span className="block truncate" title={row.decision_note}>
                                {row.decision_note}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "solicitud" : "solicitudes"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <IncreaseUploadDialog supplier={dialog === "upload" ? chosen : null} basePath={basePath} onClose={() => setDialog(null)} />
      <ManualRequestDialog supplier={dialog === "manual" ? chosen : null} basePath={basePath} onClose={() => setDialog(null)} />
    </div>
  );
}
