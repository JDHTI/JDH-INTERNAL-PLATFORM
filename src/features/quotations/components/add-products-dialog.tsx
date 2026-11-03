"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, PackagePlus, X } from "lucide-react";
import { toast } from "sonner";

import BasePicker, { PRODUCT_PICKER, type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAddLines } from "../hooks/use-quotations";
import { formatCount, parseSkuList } from "../lib/format";
import type { Quotation } from "../types/quotations.types";

export const MAX_ADDED_PER_REQUEST = 200;

/** The product master, worded for this step: the label says what to do, not what the field is. */
const PRODUCT_SEARCH: BasePickerConfig = {
  ...PRODUCT_PICKER,
  label: "1. Busca el producto",
  placeholder: "SKU o nombre, por ejemplo 26278 o ginebra",
};

interface Pick {
  sku: string;
  description?: string;
}

/**
 * Quote references the customer has not bought in the window. The dialog is
 * three steps on one screen: search, review the list, add. Picking a result
 * moves it to the list and clears the search for the next one; nothing is
 * sent until the button. Everything goes in one request: the API adds all or
 * none, and says which reference stopped it.
 */
export default function AddProductsDialog({
  quotation,
  open,
  onOpenChange,
  onAdded,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lets the editor show the new rows right away. */
  onAdded?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Agregar productos a la cotización"
      description="Para cotizarle al cliente productos que no compró en la ventana. Entran al final de la tabla con su costo, margen objetivo, apoyos e impuesto de licores, sin último precio; después les escribes el precio nuevo."
    >
      {open && (
        <AddProductsForm
          quotation={quotation}
          onClose={() => onOpenChange(false)}
          onAdded={() => {
            onOpenChange(false);
            onAdded?.();
          }}
        />
      )}
    </Dialog>
  );
}

function AddProductsForm({ quotation, onClose, onAdded }: { quotation: Quotation; onClose: () => void; onAdded: () => void }) {
  const add = useAddLines(quotation.id);
  const pasteId = useId();
  const listId = useId();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existing = new Set(quotation.lines.map((line) => line.sku));
  const pastedSkus = parseSkuList(pasted);
  const all = [...new Set([...picks.map((pick) => pick.sku), ...pastedSkus])];
  const already = all.filter((sku) => existing.has(sku));
  const toAdd = all.filter((sku) => !existing.has(sku));
  const tooMany = toAdd.length > MAX_ADDED_PER_REQUEST;
  const pastedOnly = pastedSkus.filter((sku) => !picks.some((pick) => pick.sku === sku) && !existing.has(sku));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (toAdd.length === 0) {
      setError("Busca un producto y elígelo de la lista de resultados; después pulsa «Agregar».");
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
              ? `Se agregó ${toAdd[0]}. Escríbele el precio nuevo en la tabla.`
              : `Se agregaron ${formatCount(toAdd.length)} productos. Escríbeles el precio nuevo en la tabla.`
          );
          onAdded();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <BasePicker
          config={PRODUCT_SEARCH}
          selected={null}
          onSelect={(option) => {
            setError(null);
            setPicks((current) =>
              current.some((pick) => pick.sku === option.value) ? current : [...current, { sku: option.value, description: option.hint }]
            );
          }}
          onClear={() => undefined}
        />
        <p className="text-[13px] text-text-secondary">
          Escribe al menos dos letras y elige el producto en los resultados. Pasa a la lista de abajo y puedes buscar el siguiente.
        </p>
      </div>

      <section aria-labelledby={listId} className="space-y-2">
        <h3 id={listId} className="text-[13px] font-medium">
          2. Productos por agregar{toAdd.length > 0 && <span className="tabular-nums"> ({formatCount(toAdd.length)})</span>}
        </h3>
        {picks.length === 0 && pastedOnly.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-control px-3 py-3 text-sm text-text-secondary">
            Aún no has elegido ninguno.
          </p>
        ) : (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border" aria-live="polite">
            {picks.map((pick) => (
              <PickRow
                key={pick.sku}
                sku={pick.sku}
                description={pick.description}
                already={existing.has(pick.sku)}
                onRemove={() => setPicks((current) => current.filter((item) => item.sku !== pick.sku))}
              />
            ))}
            {pastedOnly.map((sku) => (
              <PickRow key={`pasted-${sku}`} sku={sku} description="Pegado" already={false} />
            ))}
          </ul>
        )}
        {already.length > 0 && (
          <p className="text-[13px] text-text-secondary">
            {already.length === 1 ? `${already[0]} ya está en la cotización y no se agrega de nuevo.` : `${formatCount(already.length)} ya están en la cotización y no se agregan de nuevo.`}
          </p>
        )}
      </section>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setPasteOpen((current) => !current)}
          aria-expanded={pasteOpen}
          aria-controls={pasteId}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200", pasteOpen && "rotate-180")} aria-hidden="true" />
          ¿Tienes los SKU en Excel? Pégalos
        </button>
        {pasteOpen && (
          <div className="space-y-1.5">
            <label htmlFor={pasteId} className="sr-only">SKU pegados</label>
            <Textarea
              id={pasteId}
              value={pasted}
              onChange={(event) => {
                setPasted(event.target.value);
                setError(null);
              }}
              aria-describedby={`${pasteId}-hint`}
              className="font-mono"
              rows={3}
            />
            <p id={`${pasteId}-hint`} className="text-[13px] text-text-secondary">
              Copia la columna de SKU y pégala aquí: uno por línea, o separados por comas o espacios. Se suman a la lista de arriba.
            </p>
          </div>
        )}
      </div>

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
          {toAdd.length === 0
            ? "3. Agregar"
            : toAdd.length === 1
              ? "3. Agregar 1 producto"
              : `3. Agregar ${formatCount(toAdd.length)} productos`}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PickRow({
  sku,
  description,
  already,
  onRemove,
}: {
  sku: string;
  description?: string;
  already: boolean;
  onRemove?: () => void;
}) {
  return (
    <li className="flex min-h-10 items-center gap-3 px-3 py-1.5 text-sm">
      <span className="w-20 shrink-0 font-mono text-[13px]">{sku}</span>
      <span className={cn("min-w-0 flex-1 truncate", already && "text-text-secondary line-through")} title={description}>
        {description ?? "—"}
      </span>
      {already && <span className="shrink-0 text-xs text-text-secondary">Ya está</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${sku} de la lista`}
          className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-md:size-11"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
