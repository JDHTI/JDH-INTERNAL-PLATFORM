"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatCop } from "@/features/supports/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCreateIncreaseRequest, useSupplierItems } from "../hooks/use-increase-requests";
import { parseAmount, today } from "../lib/format";
import { OBSERVATIONS, type LineInput, type SupplierItem } from "../types/increase-requests.types";
import DiscountFields, { discountsPayload, emptyDiscounts, type DiscountDraft } from "./discount-fields";

interface Draft {
  item: SupplierItem;
  newCost: string;
  increasedOn: string;
  discounts: DiscountDraft;
  observation: string;
  open: boolean;
}

const OBSERVATION_OPTIONS = [
  { value: "", label: "Sin observación" },
  ...OBSERVATIONS.map((value) => ({ value, label: value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) })),
];

/**
 * A few references typed by hand instead of the workbook: search the
 * supplier's active products, add them, and give each its new cost, increase
 * date and discounts. It becomes a request in review, like a loaded MAESTRA.
 */
export default function ManualRequestDialog({
  supplier,
  basePath,
  onClose,
}: {
  supplier: { code: string; name: string } | null;
  basePath: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={supplier !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      wide
      title="Digitar alzas"
      description={supplier ? `${supplier.name} · código ${supplier.code}` : undefined}
    >
      {supplier && <ManualForm key={supplier.code} supplierCode={supplier.code} basePath={basePath} onClose={onClose} />}
    </Dialog>
  );
}

function ManualForm({ supplierCode, basePath, onClose }: { supplierCode: string; basePath: string; onClose: () => void }) {
  const router = useRouter();
  const noteId = useId();
  const searchId = useId();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const q = useDebouncedValue(text.trim());
  const items = useSupplierItems(supplierCode, q);
  const create = useCreateIncreaseRequest();
  const chosen = new Set(drafts.map((draft) => draft.item.sku));
  const results = (items.data ?? []).filter((item) => !chosen.has(item.sku)).slice(0, 8);

  const add = (item: SupplierItem) =>
    setDrafts((current) => [
      ...current,
      {
        item,
        newCost: "",
        // The date of the line before: an increase usually covers the whole letter.
        increasedOn: current.at(-1)?.increasedOn ?? today(),
        discounts: emptyDiscounts(),
        observation: "",
        open: false,
      },
    ]);
  const update = (sku: string, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((draft) => (draft.item.sku === sku ? { ...draft, ...patch } : draft)));
  const remove = (sku: string) => setDrafts((current) => current.filter((draft) => draft.item.sku !== sku));

  const problems = (draft: Draft) => ({
    cost: parseAmount(draft.newCost) === null ? "Escribe el costo nuevo sin impuesto saludable." : null,
    date: draft.increasedOn === "" ? "Elige la fecha del incremento." : null,
    discounts: discountsPayload(draft.discounts) === null ? "Revisa los descuentos." : null,
  });
  const invalid = drafts.some((draft) => Object.values(problems(draft)).some(Boolean));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (drafts.length === 0 || invalid) return;
    const lines: LineInput[] = drafts.map((draft) => ({
      sku: draft.item.sku,
      new_cost: parseAmount(draft.newCost)!,
      increased_on: draft.increasedOn,
      ...discountsPayload(draft.discounts)!,
      observation: draft.observation || null,
    }));
    create.mutate(
      { supplier: supplierCode, note, lines },
      {
        onSuccess: (request) => {
          toast.success(`Solicitud creada con ${lines.length} ${lines.length === 1 ? "referencia" : "referencias"}, en revisión.`);
          onClose();
          router.push(`${basePath}/${request.id}`);
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <section aria-labelledby={`${searchId}-title`} className="space-y-2">
        <h3 id={`${searchId}-title`} className="text-sm font-semibold">
          Referencias del proveedor
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Referencia o descripción"
            aria-label="Buscar entre los productos activos del proveedor"
            className="pl-9"
          />
        </div>
        {items.isPending ? (
          <div className="h-24 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Cargando los productos del proveedor" />
        ) : items.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(items.error)}
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {q ? "Ningún producto activo del proveedor con ese texto." : "El proveedor no tiene más productos activos para agregar."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border" aria-label="Productos para agregar">
            {results.map((item) => (
              <li key={item.sku} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-[13px]">{item.sku}</span>
                  {item.description && <span className="text-text-secondary"> · {item.description}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums text-text-secondary">{formatCop(item.old_cost)}</span>
                  <Button size="sm" variant="outline" className="max-md:h-11" onClick={() => add(item)} aria-label={`Agregar ${item.sku}`}>
                    <Plus aria-hidden="true" /> Agregar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${searchId}-lines`} className="space-y-2">
        <h3 id={`${searchId}-lines`} className="text-sm font-semibold">
          Alzas de la solicitud {drafts.length > 0 && <span className="font-normal text-text-secondary">({drafts.length})</span>}
        </h3>
        {drafts.length === 0 ? (
          <p className={cn("text-sm", submitted ? "text-danger" : "text-text-secondary")} role={submitted ? "alert" : undefined}>
            Agrega al menos una referencia de la lista de arriba.
          </p>
        ) : (
          <ol className="space-y-2">
            {drafts.map((draft) => (
              <DraftLine
                key={draft.item.sku}
                draft={draft}
                errors={submitted ? problems(draft) : { cost: null, date: null, discounts: null }}
                onChange={(patch) => update(draft.item.sku, patch)}
                onRemove={() => remove(draft.item.sku)}
              />
            ))}
          </ol>
        )}
      </section>

      <Field label="Nota para la revisión" htmlFor={noteId} optional>
        <Textarea id={noteId} value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} />
      </Field>

      <DialogError message={create.isError ? errorMessage(create.error) : null} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creando…" : "Crear solicitud"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DraftLine({
  draft,
  errors,
  onChange,
  onRemove,
}: {
  draft: Draft;
  errors: { cost: string | null; date: string | null; discounts: string | null };
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const item = draft.item;
  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="truncate">
            <span className="font-mono text-[13px]">{item.sku}</span>
            {item.description && <span className="text-text-secondary"> · {item.description}</span>}
          </p>
          <p className="text-xs tabular-nums text-text-secondary">
            Costo anterior {formatCop(item.old_cost)} · con impuesto saludable {formatCop(item.old_cost_with_tax)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="max-md:size-11" onClick={onRemove} aria-label={`Quitar ${item.sku} de la solicitud`}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Costo nuevo sin impuesto saludable" htmlFor={`${id}-cost`} error={errors.cost}>
          <Input
            id={`${id}-cost`}
            value={draft.newCost}
            inputMode="decimal"
            onChange={(event) => onChange({ newCost: event.target.value })}
            aria-invalid={errors.cost !== null || undefined}
            className="tabular-nums"
          />
        </Field>
        <Field label="Fecha del incremento" htmlFor={`${id}-date`} error={errors.date}>
          <Input
            id={`${id}-date`}
            type="date"
            value={draft.increasedOn}
            onChange={(event) => onChange({ increasedOn: event.target.value })}
            aria-invalid={errors.date !== null || undefined}
            className="tabular-nums"
          />
        </Field>
        <div className="min-w-0 space-y-1.5">
          <span id={`${id}-obs`} className="block text-[13px] font-medium">
            Observación
          </span>
          <Dropdown
            value={draft.observation}
            options={OBSERVATION_OPTIONS}
            onValueChange={(observation) => onChange({ observation })}
            aria-labelledby={`${id}-obs`}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange({ open: !draft.open })}
        aria-expanded={draft.open}
        className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
      >
        {draft.open ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
        Descuentos
        {errors.discounts && <span className="font-normal text-danger"> · {errors.discounts}</span>}
      </button>
      {draft.open && <DiscountFields value={draft.discounts} onChange={(discounts) => onChange({ discounts })} compact />}
    </li>
  );
}
