"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useUpdateItem } from "../hooks/use-pqrsf";
import { documentName, formatDate, todayIso } from "../lib/format";
import type { CaseItem, PqrsfCase } from "../types/pqrsf.types";

/**
 * Registers when a requested document was answered. Whether it was late is
 * the API's call: a late answer comes back as 422 asking for the cause, and
 * the cause fields open here, in the same dialog, with that message on top.
 */
export default function RespondItemDialog({
  item,
  document,
  onOpenChange,
}: {
  item: PqrsfCase;
  document: CaseItem;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useUpdateItem(item.id);
  const [respondedOn, setRespondedOn] = useState(document.responded_on ?? todayIso());
  const [cause, setCause] = useState(document.delay_cause ?? "");
  const [detail, setDetail] = useState(document.delay_detail ?? "");
  const [lateMessage, setLateMessage] = useState<string | null>(null);
  const [causeError, setCauseError] = useState<string | null>(null);

  const asksCause = lateMessage !== null || document.is_late;
  const name = documentName(document);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) mutation.reset();
        onOpenChange(next);
      }}
      isForm
      title={document.responded_on ? "Editar respuesta" : "Registrar respuesta"}
      description={`${name} · recibido el ${formatDate(item.received_on)}${
        document.sla_days !== null ? ` · establecido ${document.sla_days} días hábiles` : ""
      }`}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (asksCause && !cause.trim()) {
            setCauseError("Escribe la causal del retraso, por ejemplo «Proveedor no envió el certificado».");
            return;
          }
          setCauseError(null);
          mutation.mutate(
            {
              itemId: document.id,
              input: {
                responded_on: respondedOn,
                ...(asksCause
                  ? { delay_cause: cause.trim(), delay_detail: detail.trim() || null }
                  : {}),
              },
            },
            {
              onSuccess: () => {
                toast.success(`Respuesta de «${name}» registrada.`);
                onOpenChange(false);
              },
              onError: (error) => {
                if (
                  error instanceof ApiError &&
                  error.status === 422 &&
                  /causal/i.test(error.detail) &&
                  !asksCause
                ) {
                  setLateMessage(error.detail);
                  mutation.reset();
                }
              },
            }
          );
        }}
      >
        <Field label="Fecha de respuesta" htmlFor={`${id}-date`}>
          <Input
            id={`${id}-date`}
            type="date"
            required
            min={item.received_on}
            max={todayIso()}
            value={respondedOn}
            onChange={(event) => {
              setRespondedOn(event.target.value);
              // Another date may no longer be late: let the API decide again.
              if (!document.is_late) setLateMessage(null);
            }}
            className="w-44"
          />
        </Field>

        {asksCause && (
          <div className="space-y-4 rounded-md border border-border p-4">
            <p role="alert" className="text-sm text-warning">
              {lateMessage ?? "Este documento se respondió tarde: la causal es obligatoria para cerrar el caso."}
            </p>
            <Field
              label="Causal del retraso"
              htmlFor={`${id}-cause`}
              error={causeError}
            >
              <Input
                id={`${id}-cause`}
                value={cause}
                maxLength={300}
                autoFocus
                onChange={(event) => setCause(event.target.value)}
                onBlur={() => cause.trim() && setCauseError(null)}
                aria-invalid={causeError ? true : undefined}
                aria-describedby={causeError ? `${id}-cause-error` : undefined}
              />
            </Field>
            <Field label="Detalle" htmlFor={`${id}-detail`} optional>
              <Textarea
                id={`${id}-detail`}
                value={detail}
                maxLength={2000}
                onChange={(event) => setDetail(event.target.value)}
              />
            </Field>
          </div>
        )}

        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {asksCause ? "Guardar con causal" : "Registrar respuesta"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
