"use client";

import { useId, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";

import { useCalcMethodLabel } from "../hooks/use-supports";
import { formatDay } from "../lib/format";
import type { OnOverlap, OverlapChoice, SupportOverlap } from "../types/support.types";

/**
 * The supports a new or edited one crosses (same class, supplier, customer,
 * reference and lists, dates that touch). Only one can be in force, so the
 * person picks what happens to the previous ones and the same write goes again.
 */
export default function OverlapDialog({
  overlaps,
  pending,
  error,
  onResolve,
  onCancel,
}: {
  /** null keeps it closed. */
  overlaps: SupportOverlap[] | null;
  pending: boolean;
  error: string | null;
  onResolve: (choice: OverlapChoice) => void;
  onCancel: () => void;
}) {
  const count = overlaps?.length ?? 0;
  return (
    <Dialog
      open={overlaps !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
      title={count === 1 ? "Se cruza con otro apoyo" : `Se cruza con ${count} apoyos`}
      description="Solo uno puede estar vigente para la misma clase, proveedor, cliente y referencia. Elige qué pasa con el anterior."
      isForm
      wide
    >
      {overlaps && <Choice overlaps={overlaps} pending={pending} error={error} onResolve={onResolve} onCancel={onCancel} />}
    </Dialog>
  );
}

function Choice({
  overlaps,
  pending,
  error,
  onResolve,
  onCancel,
}: {
  overlaps: SupportOverlap[];
  pending: boolean;
  error: string | null;
  onResolve: (choice: OverlapChoice) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const methodLabel = useCalcMethodLabel();
  const [reason, setReason] = useState("");
  const [chosen, setChosen] = useState<OnOverlap | null>(null);

  const resolve = (on_overlap: OnOverlap) => {
    setChosen(on_overlap);
    onResolve({ on_overlap, overlap_reason: reason.trim() || undefined });
  };

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Apoyos con los que se cruza</caption>
          <thead className="bg-canvas-subtle text-xs font-semibold text-text-secondary">
            <tr>
              <th scope="col" className="px-3 py-2">Cliente</th>
              <th scope="col" className="px-3 py-2">Referencia</th>
              <th scope="col" className="px-3 py-2">Tipo apoyo</th>
              <th scope="col" className="px-3 py-2">Vigencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {overlaps.map((overlap) => (
              <tr key={overlap.id} className="align-top">
                <td className="px-3 py-2 font-mono text-[13px]">{overlap.customer_nit ?? <span className="font-sans">Todos</span>}</td>
                <td className="px-3 py-2">
                  <span className="block font-mono text-[13px]">{overlap.product_sku ?? overlap.supplier_sku ?? "Todas"}</span>
                  {overlap.program && <span className="block text-xs text-text-secondary">{overlap.program}</span>}
                </td>
                <td className="px-3 py-2">{methodLabel(overlap.calc_method)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {formatDay(overlap.valid_from)} a {overlap.valid_to ? formatDay(overlap.valid_to) : "indefinido"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-medium">Vencer el anterior</dt>
          <dd className="text-text-secondary">
            Queda vigente hasta el día antes de que empiece el nuevo. Si el anterior empieza después, se anula.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Anular el anterior</dt>
          <dd className="text-text-secondary">Deja de contar desde ya, con la observación.</dd>
        </div>
      </dl>

      <Field label="Observación" htmlFor={`${id}-reason`} optional hint="Queda en el apoyo anterior.">
        <Textarea id={`${id}-reason`} rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={() => resolve("anular_anterior")} disabled={pending}>
          {pending && chosen === "anular_anterior" ? "Anulando" : "Anular el anterior"}
        </Button>
        <Button onClick={() => resolve("vencer_anterior")} disabled={pending}>
          {pending && chosen === "vencer_anterior" ? "Venciendo" : "Vencer el anterior"}
        </Button>
      </DialogFooter>
    </div>
  );
}
