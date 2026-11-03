"use client";

import { useId, useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";

import { useGenerateQuotation } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import type { Quotation } from "../types/quotations.types";

const LIST_ID_MAX = 3;

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIso(date);
}

/**
 * Validates the rule and leaves the quotation ready to download. The target
 * list defaults to the customer's; since lists are shared, the dialog says
 * how many customers a price written there reaches before anyone confirms.
 */
export default function GenerateDialog({
  quotation,
  open,
  onOpenChange,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Generar formato de SIESA"
      description="Arma el Excel de actualización de listas y el plano de importación con las referencias que tienen precio nuevo."
    >
      {/* Mounted only while open, so each opening starts from the quotation's current values. */}
      {open && <GenerateForm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function GenerateForm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const generate = useGenerateQuotation(quotation.id);
  const dateId = useId();
  const listId = useId();
  const [activation, setActivation] = useState(quotation.activation_date ?? tomorrow());
  const [list, setList] = useState(quotation.export_price_list_id ?? quotation.price_list_id ?? "");
  const [listError, setListError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changed = quotation.lines.filter((line) => line.new_price !== null);
  const blocking = changed.filter((line) => line.compliance !== null && line.compliance !== "cumple");
  const trimmedList = list.trim().toUpperCase();
  const customerList = quotation.price_list_id ?? "";
  const shared = quotation.price_list_customers ?? 0;
  const blocked = changed.length === 0 || blocking.length > 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (trimmedList === "") {
      setListError("Escribe el código de la lista de precios, por ejemplo 1.");
      return;
    }
    setListError(null);
    setError(null);
    generate.mutate(
      {
        version: quotation.version,
        options: {
          activation_date: activation,
          ...(trimmedList !== customerList ? { price_list_id: trimmedList } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Formato generado. Ya puedes descargar el Excel y el plano.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm">
        {changed.length === 1 ? "Se exporta " : "Se exportan "}
        <strong className="tabular-nums">{formatCount(changed.length)}</strong>{" "}
        {changed.length === 1 ? "referencia" : "referencias"} con precio nuevo.
      </p>

      {changed.length === 0 && (
        <Alert severity="danger">No hay precios nuevos. Escribe al menos uno en la columna «Precio nuevo».</Alert>
      )}
      {blocking.length > 0 && (
        <Alert severity="danger">
          {formatCount(blocking.length)} {blocking.length === 1 ? "referencia cambiada no cumple" : "referencias cambiadas no cumplen"} la
          regla (bajo el mínimo, sin margen objetivo o sin costo). Ajusta o quita esos precios; el filtro «No cumplen» las muestra.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de activación" htmlFor={dateId} hint="Desde cuándo rige el precio en SIESA.">
          <DatePicker id={dateId} value={activation} onChange={setActivation} min={toIso(new Date())} aria-describedby={`${dateId}-hint`} />
        </Field>
        <Field
          label="Lista de precios destino"
          htmlFor={listId}
          error={listError}
          hint={trimmedList === customerList ? "La lista del cliente en SIESA." : `La del cliente es ${customerList || "desconocida"}.`}
        >
          <Input
            id={listId}
            value={list}
            maxLength={LIST_ID_MAX}
            onChange={(event) => {
              setList(event.target.value);
              setListError(null);
            }}
            onBlur={() => setList((current) => current.trim().toUpperCase())}
            aria-invalid={listError ? true : undefined}
            aria-describedby={listError ? `${listId}-error` : `${listId}-hint`}
            className="font-mono uppercase max-md:h-11"
            autoComplete="off"
          />
        </Field>
      </div>

      {trimmedList !== "" && trimmedList === customerList && shared > 1 && (
        <Alert severity="info">
          La lista {customerList}
          {quotation.price_list_name ? ` (${quotation.price_list_name})` : ""} la comparten{" "}
          <strong className="tabular-nums">{formatCount(shared)}</strong> clientes activos: al cargarla en SIESA, estos
          precios les cambian a todos. Si el ajuste es solo para este cliente, escribe otra lista.
        </Alert>
      )}
      {trimmedList !== "" && trimmedList !== customerList && (
        <Alert severity="info">
          Vas a escribir en la lista {trimmedList}, no en la del cliente ({customerList || "sin lista"}). Revisa que ese
          código exista en SIESA.
        </Alert>
      )}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={blocked || generate.isPending} className="max-md:h-11">
          {generate.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
          Generar formato
        </Button>
      </DialogFooter>
    </form>
  );
}
