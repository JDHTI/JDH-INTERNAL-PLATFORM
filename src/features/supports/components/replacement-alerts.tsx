"use client";

import { useId, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useCalcMethodLabel, useRetireSupports } from "../hooks/use-supports";
import { formatDay, formatSupplierValue } from "../lib/format";
import type { AlertSupport, ReplacementAlert } from "../types/support.types";

/**
 * «Apoyos programados que reemplazan uno vigente». Leaving one programmed needs
 * nothing: the previous support ends the day before (the daily job cuts it if
 * it has to). Expiring the previous one now goes through the mass retire.
 */
export default function ReplacementAlerts({
  open,
  onClose,
  alerts,
}: {
  open: boolean;
  onClose: () => void;
  alerts: ReplacementAlert[];
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Apoyos programados que reemplazan uno vigente"
      description="Si los dejas programados, el anterior termina el día antes de que empiece el nuevo. Si el cambio debe regir ya, vence el anterior hoy."
      wide
      isForm
    >
      {alerts.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm">No hay apoyos programados que reemplacen uno vigente.</p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <AlertRow key={`${alert.programmed.id}-${alert.previous.id}`} alert={alert} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function AlertRow({ alert }: { alert: ReplacementAlert }) {
  const id = useId();
  const retire = useRetireSupports();
  const [expiring, setExpiring] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { programmed, previous } = alert;

  const expireNow = () => {
    setError(null);
    retire.mutate(
      { action: "vencer", reason: reason.trim(), items: [{ id: previous.id, version: previous.version }] },
      {
        onSuccess: () => setDone(true),
        onError: (failure) =>
          setError(
            failure instanceof ApiError && failure.status === 409
              ? "El apoyo anterior cambió o ya no está vigente. Cierra y vuelve a abrir la lista."
              : errorMessage(failure)
          ),
      }
    );
  };

  return (
    <li className="space-y-3 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium">
        {programmed.customer_name ?? (programmed.customer_nit ? `NIT ${programmed.customer_nit}` : "Todos los clientes")}
        <span className="font-mono text-[13px] font-normal text-text-secondary"> · {programmed.product_sku ?? programmed.supplier_sku ?? "Todas las referencias"}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Side title="Vigente hoy" support={previous} until={alert.previous_ends} />
        <Side title="Programado" support={programmed} />
      </div>
      {done ? (
        <p role="status" className="text-success">El anterior quedó vencido. El programado rige desde su fecha de inicio.</p>
      ) : expiring ? (
        <div className="space-y-2 border-t border-border pt-3">
          <label htmlFor={`${id}-reason`} className="block text-[13px] font-medium">Observación</label>
          <Textarea id={`${id}-reason`} rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} disabled={retire.isPending} />
          {error && <p role="alert" className="text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setExpiring(false)} disabled={retire.isPending}>Volver</Button>
            <Button size="sm" onClick={expireNow} disabled={reason.trim().length < 3 || retire.isPending}>
              {retire.isPending ? "Venciendo" : "Vencer el anterior ya"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-text-secondary">
            {alert.chained ? "El anterior ya termina ese día." : "El proceso diario lo cortará el día antes del nuevo."}
          </span>
          <Button variant="outline" size="sm" onClick={() => setExpiring(true)}>Vencer el anterior ya</Button>
        </div>
      )}
    </li>
  );
}

function Side({ title, support, until }: { title: string; support: AlertSupport; until?: string }) {
  const methodLabel = useCalcMethodLabel();
  return (
    <div className="space-y-0.5 rounded-md bg-canvas-subtle p-2.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
        {title}
        {until && <Badge tone="warning">Hasta {formatDay(until)}</Badge>}
      </p>
      <p className="tabular-nums">
        <span className="font-semibold">{formatSupplierValue(support.calc_method, support.supplier_value)}</span> · {methodLabel(support.calc_method)}
      </p>
      <p className="text-xs tabular-nums text-text-secondary">
        {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "indefinido"}
      </p>
    </div>
  );
}
