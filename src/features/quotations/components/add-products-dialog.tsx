"use client";

import { useId, useState } from "react";
import { Loader2, PackagePlus, X } from "lucide-react";
import { toast } from "sonner";

import BasePicker, { PRODUCT_PICKER } from "@/shared/components/pickers/base-picker";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";

import { useAddLines } from "../hooks/use-quotations";
import { formatCount, parseSkuList } from "../lib/format";
import type { Quotation } from "../types/quotations.types";

export const MAX_ADDED_PER_REQUEST = 200;

interface Pick {
  sku: string;
  description?: string;
}

/**
 * Quote references the customer has not bought in the window. They are picked
 * from the product master or pasted as a list, and go in one request: the API
 * adds all or none, and says which reference stopped it.
 */
export default function AddProductsDialog({
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
      title="Agregar productos"
      description="Referencias que el cliente no compró en la ventana. Se cotizan con su costo, margen objetivo, apoyos e impuesto de licores, sin último precio."
    >
      {open && <AddProductsForm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function AddProductsForm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const add = useAddLines(quotation.id);
  const pasteId = useId();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existing = new Set(quotation.lines.map((line) => line.sku));
  const all = [...new Set([...picks.map((pick) => pick.sku), ...parseSkuList(pasted)])];
  const already = all.filter((sku) => existing.has(sku));
  const toAdd = all.filter((sku) => !existing.has(sku));
  const tooMany = toAdd.length > MAX_ADDED_PER_REQUEST;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (toAdd.length === 0) {
      setError("Elige al menos una referencia que no esté ya en la cotización.");
      return;
    }
    if (tooMany) return;
    setError(null);
    add.mutate(
      { version: quotation.version, skus: toAdd },
      {
        onSuccess: () => {
          toast.success(
            toAdd.length === 1
              ? `Se agregó ${toAdd[0]} al final de la cotización.`
              : `Se agregaron ${formatCount(toAdd.length)} referencias al final de la cotización.`
          );
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <BasePicker
        config={PRODUCT_PICKER}
        selected={null}
        onSelect={(option) =>
          setPicks((current) =>
            current.some((pick) => pick.sku === option.value) ? current : [...current, { sku: option.value, description: option.hint }]
          )
        }
        onClear={() => undefined}
      />

      {picks.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Referencias elegidas">
          {picks.map((pick) => (
            <li key={pick.sku} className="flex h-8 max-w-full items-center gap-1 rounded-md border border-border-control bg-canvas-subtle pl-2.5 pr-1 text-sm max-md:h-11">
              <span className="truncate" title={pick.description}>
                <span className="font-mono text-[13px]">{pick.sku}</span>
                {pick.description && <span className="text-text-secondary"> · {pick.description}</span>}
              </span>
              <button
                type="button"
                onClick={() => setPicks((current) => current.filter((item) => item.sku !== pick.sku))}
                aria-label={`Quitar ${pick.sku} de la lista`}
                className="flex size-6 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-md:size-9"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Field
        label="Pegar referencias"
        htmlFor={pasteId}
        optional
        hint="Una por línea, o separadas por comas o espacios, por ejemplo copiadas de una columna de Excel."
      >
        <Textarea
          id={pasteId}
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          aria-describedby={`${pasteId}-hint`}
          className="font-mono"
          rows={3}
        />
      </Field>

      <p className="text-sm" aria-live="polite">
        {toAdd.length === 0
          ? "Aún no hay referencias para agregar."
          : toAdd.length === 1
            ? "Se agrega 1 referencia."
            : `Se agregan ${formatCount(toAdd.length)} referencias.`}
        {already.length > 0 && (
          <span className="text-text-secondary">
            {" "}
            {already.length === 1 ? `${already[0]} ya está en la cotización y se omite.` : `${formatCount(already.length)} ya están en la cotización y se omiten.`}
          </span>
        )}
      </p>
      {tooMany && (
        <p role="alert" className="text-sm text-danger">
          Son {formatCount(toAdd.length)}; se agregan máximo {MAX_ADDED_PER_REQUEST} por vez. Divide la lista.
        </p>
      )}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={add.isPending || toAdd.length === 0 || tooMany} className="max-md:h-11">
          {add.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PackagePlus aria-hidden="true" />}
          Agregar a la cotización
        </Button>
      </DialogFooter>
    </form>
  );
}
