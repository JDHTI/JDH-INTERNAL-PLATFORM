"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Lock, LockOpen, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";

import { usePeriodAction, useSyncSales, type PeriodAction } from "../hooks/use-commercial-budget";
import { periodLabel } from "../lib/format";
import { downloadBudgetExport, downloadBudgetTemplate } from "../services/commercial-budget.service";
import type { BudgetFilters, BudgetPeriod, BudgetPermissions } from "../types/commercial-budget.types";
import BudgetUploadDialog from "./budget-upload-dialog";

/**
 * What can be done with the month: sync the sales, the workbook (template, upload) and the
 * export, close a finished month and reopen a closed one. Each shows only to whoever may.
 */
export default function BudgetActions({
  month,
  filters,
  permissions,
}: {
  month: BudgetPeriod;
  filters: BudgetFilters;
  permissions: BudgetPermissions;
}) {
  const sync = useSyncSales();
  const action = usePeriodAction();
  const [confirm, setConfirm] = useState<PeriodAction | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<"export" | "template" | null>(null);
  const closed = month.status === "cerrado";
  const label = periodLabel(month.period);

  const download = async (kind: "export" | "template") => {
    setDownloading(kind);
    try {
      await (kind === "export" ? downloadBudgetExport(month.period, filters) : downloadBudgetTemplate(month.period));
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      setDownloading(null);
    }
  };

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (result) => {
        const months = Object.keys(result.meses).length;
        const pending = result.pendientes.length;
        toast.success(
          `Ventas sincronizadas: ${months} ${months === 1 ? "mes copiado" : "meses copiados"} y ${result.vendedores} vendedores.${
            pending > 0 ? ` Faltan ${pending} meses de historia; se copian en las próximas sincronizaciones.` : ""
          }`
        );
      },
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const run = (kind: PeriodAction) => {
    setConfirm(null);
    action.mutate(
      { action: kind, period: month.period },
      {
        onSuccess: () => toast.success(kind === "close" ? `${label} quedó cerrado.` : `${label} se reabrió: vuelve a calcularse en vivo.`),
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
      }
    );
  };

  const canUpload = permissions.can_manage && !closed;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {permissions.can_manage && (
          <Button
            variant="outline"
            onClick={runSync}
            disabled={sync.isPending}
            title="Copia ahora del DWH el maestro de vendedores y las ventas del mes en curso, el anterior y la historia que falte"
          >
            {sync.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            {sync.isPending ? "Sincronizando" : "Sincronizar ventas"}
          </Button>
        )}
        <Menu
          trigger={
            <>
              <FileSpreadsheet aria-hidden="true" /> Excel
            </>
          }
          triggerLabel="Descargas y carga en Excel"
          triggerClassName={buttonVariants({ variant: "outline", className: "max-md:h-11" })}
        >
          <MenuItem onClick={() => download("export")} disabled={downloading !== null}>
            <Download aria-hidden="true" /> Descargar el mes con los filtros
          </MenuItem>
          <MenuItem onClick={() => download("template")} disabled={downloading !== null}>
            <Download aria-hidden="true" /> Plantilla del presupuesto
          </MenuItem>
          {canUpload && (
            <MenuItem onClick={() => setUploading(true)}>
              <Upload aria-hidden="true" /> Cargar presupuesto
            </MenuItem>
          )}
        </Menu>
        {permissions.can_close && !closed && month.is_finished && (
          <Button variant="primary" onClick={() => setConfirm("close")} disabled={action.isPending}>
            <Lock aria-hidden="true" /> {action.isPending ? "Cerrando" : "Cerrar mes"}
          </Button>
        )}
        {permissions.can_close && closed && (
          <Button variant="outline" onClick={() => setConfirm("reopen")} disabled={action.isPending}>
            <LockOpen aria-hidden="true" /> {action.isPending ? "Reabriendo" : "Reabrir"}
          </Button>
        )}
      </div>

      {sync.isPending && (
        <p role="status" className="w-full rounded-md bg-info-surface px-3 py-2 text-sm text-info">
          Copiando las ventas del DWH: puede tardar unas decenas de segundos. No cierres esta página.
        </p>
      )}

      <BudgetUploadDialog open={uploading} onClose={() => setUploading(false)} period={month.period} />

      <Dialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null);
        }}
        title={`${confirm === "reopen" ? "Reabrir" : "Cerrar"} ${label}`}
        description={
          confirm === "reopen"
            ? "Se descarta la foto del cierre: el mes vuelve a calcularse con el vendedor que cada cliente tiene hoy, y su presupuesto se puede editar otra vez."
            : "Se congela la foto del mes: las cifras de cada vendedor, su presupuesto, su equipo y regional, y qué cliente tenía cada uno. Una reasignación posterior ya no lo cambia, y el presupuesto queda sin edición hasta que se reabra."
        }
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => confirm && run(confirm)}>
            {confirm === "reopen" ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {confirm === "reopen" ? "Reabrir el mes" : "Cerrar el mes"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
