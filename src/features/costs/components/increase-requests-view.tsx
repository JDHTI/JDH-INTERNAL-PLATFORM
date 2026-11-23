"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudOff, Download, FileX2, Keyboard, Loader2, RefreshCw, Upload } from "lucide-react";
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

import { useDownloadTemplate, useIncreaseRequests } from "../hooks/use-increase-requests";
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
 * The tray opens on the ones in review; the supplier narrows it too.
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
                  return (
                    <tr key={row.id} className="h-10 align-top hover:bg-primary-subtle">
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
                        <span className="block text-xs text-text-secondary">Código {row.supplier_code}</span>
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
