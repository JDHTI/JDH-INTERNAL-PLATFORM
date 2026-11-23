"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { formatCop } from "@/features/supports/lib/format";

import { useAttachCreditNote } from "../hooks/use-costs";
import type { Novelty } from "../types/costs.types";

const MAX_MB = 10;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

/**
 * Pesos as people type them, to the API's plain form: «1.250.000,50» and
 * «1250000.50» are both «1250000.50»; dots in threes are thousands. Null when
 * it is not an amount.
 */
function parseAmount(text: string): string | null {
  const value = text.trim().replace(/\s|\$/g, "");
  const plain = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(value)
      ? value.replace(/\./g, "")
      : value;
  return /^\d+(\.\d{1,2})?$/.test(plain) && Number(plain) > 0 ? plain : null;
}

/**
 * Number, amount and the supplier's PDF or picture. A note is unique per
 * supplier and number, and one note usually covers several lines: when the
 * number already exists for the supplier its file is reused, so the file is
 * only needed for a new number. Each novelty keeps its own amount.
 */
export default function CreditNoteDialog({ novelty, onClose }: { novelty: Novelty | null; onClose: () => void }) {
  return (
    <Dialog
      open={novelty !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Registrar nota crédito"
      description={
        novelty
          ? `${novelty.line.supplier_name ?? "Proveedor"} · ${novelty.line.document ?? "entrada"} · referencia ${novelty.line.sku}`
          : undefined
      }
      isForm
    >
      {/* Keyed so a second novelty starts from an empty form. */}
      {novelty && <CreditNoteForm key={novelty.id} novelty={novelty} onClose={onClose} />}
    </Dialog>
  );
}

function CreditNoteForm({ novelty, onClose }: { novelty: Novelty; onClose: () => void }) {
  const ids = { number: useId(), amount: useId(), file: useId() };
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState({ number: false, amount: false });
  const save = useAttachCreditNote();

  const numberError = number.trim() === "" ? "Escribe el número de la nota crédito." : null;
  const amountError =
    amount.trim() === ""
      ? "Escribe el valor de la nota en pesos."
      : parseAmount(amount) === null
        ? "Escribe un valor mayor que cero, con coma para los centavos: 125.000,50."
        : null;
  const fileError =
    file && file.size > MAX_MB * 1024 * 1024 ? `El archivo pesa ${formatBytes(file.size)}; el máximo es ${MAX_MB} MB.` : null;
  const lineAmount = novelty.line.amount;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ number: true, amount: true });
    if (numberError || amountError || fileError) return;
    save.mutate({ id: novelty.id, input: { number: number.trim(), amount: parseAmount(amount)!, file } }, {
      onSuccess: (detail) => {
        const note = detail.credit_note;
        toast.success(
          note && note.original_filename && !file
            ? `Nota ${note.number} registrada con el soporte que ya tenía el proveedor.`
            : `Nota ${note?.number ?? number.trim()} registrada.`
        );
        onClose();
      },
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Número" htmlFor={ids.number} error={touched.number ? numberError : null}>
          <Input
            id={ids.number}
            value={number}
            maxLength={60}
            onChange={(event) => setNumber(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, number: true }))}
            aria-invalid={(touched.number && numberError !== null) || undefined}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Valor"
          htmlFor={ids.amount}
          hint={lineAmount !== null ? `Diferencia de la línea: ${formatCop(lineAmount)}` : undefined}
          error={touched.amount ? amountError : null}
        >
          <Input
            id={ids.amount}
            value={amount}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, amount: true }))}
            aria-invalid={(touched.amount && amountError !== null) || undefined}
            className="tabular-nums"
          />
        </Field>
      </div>
      <Field
        label="Soporte"
        htmlFor={ids.file}
        optional
        hint={`PDF, PNG o JPG hasta ${MAX_MB} MB. Si el número ya está registrado para este proveedor se usa su soporte y no hace falta adjuntarlo.`}
        error={fileError}
      >
        <Input id={ids.file} type="file" accept={ACCEPT} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </Field>
      <DialogError message={save.isError ? errorMessage(save.error) : null} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          Registrar nota crédito
        </Button>
      </DialogFooter>
    </form>
  );
}
