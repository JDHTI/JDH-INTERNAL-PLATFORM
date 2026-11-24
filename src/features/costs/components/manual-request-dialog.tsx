"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Plus, Search, Trash2 } from "lucide-react";
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

import { useCreateIncreaseRequest, usePutRequestSupport, useSupplierItems } from "../hooks/use-increase-requests";
import { parseAmount, parsePercent, today } from "../lib/format";
import { REGIONAL_HELP, REGIONAL_OPTIONS, regionalList, regionalProblem, restCoverage } from "../lib/regionals";
import { NATIONAL, OBSERVATIONS, REGIONALS, REST, type LineInput, type LineRegional, type SupplierItem } from "../types/increase-requests.types";
import PercentInput from "./percent-input";
import { SupportPicker } from "./support-file";

interface Draft {
  /** A reference can come in several lines, one per regional. */
  key: number;
  item: SupplierItem;
  regional: LineRegional;
  newCost: string;
  increasedOn: string;
  discount: string;
  publicPrice: string;
  observation: string;
}

interface DraftErrors {
  cost: string | null;
  date: string | null;
  discount: string | null;
  price: string | null;
}

const OBSERVATION_OPTIONS = [
  { value: "", label: "Sin observación" },
  ...OBSERVATIONS.map((value) => ({ value, label: value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) })),
];

/**
 * A few references typed by hand instead of the workbook: search the
 * supplier's active products and give each line its regional, new cost,
 * increase date, discount and PVP. A reference can repeat with other
 * regionals. It becomes a request in review, like a loaded MAESTRA.
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
  const nextKey = useRef(1);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const q = useDebouncedValue(text.trim());
  const items = useSupplierItems(supplierCode, q);
  const create = useCreateIncreaseRequest();
  const attach = usePutRequestSupport();
  const [support, setSupport] = useState<File | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const results = (items.data ?? []).slice(0, 8);

  const linesOf = (sku: string, list = drafts) => list.filter((draft) => draft.item.sku === sku);
  const addLine = (item: SupplierItem, after?: Draft) => {
    const key = nextKey.current++;
    setDrafts((current) => {
      const siblings = linesOf(item.sku, current);
      // A second line of a reference starts on the first regional not taken yet.
      const regional: LineRegional =
        siblings.length === 0 ? NATIONAL : (REGIONALS.find((value) => !siblings.some((draft) => draft.regional === value)) ?? REST);
      const draft: Draft = {
        key,
        item,
        regional,
        newCost: "",
        // The date of the line before: an increase usually covers the whole letter.
        increasedOn: after?.increasedOn ?? current.at(-1)?.increasedOn ?? today(),
        discount: after?.discount ?? "",
        publicPrice: "",
        observation: "",
      };
      if (!after) return [...current, draft];
      const index = current.findIndex((entry) => entry.key === after.key);
      return [...current.slice(0, index + 1), draft, ...current.slice(index + 1)];
    });
  };
  const update = (key: number, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  const remove = (key: number) => setDrafts((current) => current.filter((draft) => draft.key !== key));

  const errorsOf = (draft: Draft): DraftErrors => ({
    cost: parseAmount(draft.newCost) === null ? "Escribe el costo nuevo sin impuesto saludable." : null,
    date: draft.increasedOn === "" ? "Elige la fecha del incremento." : null,
    discount: parsePercent(draft.discount) === undefined ? "De 0 a 100, con coma para los decimales." : null,
    price: draft.publicPrice.trim() !== "" && parseAmount(draft.publicPrice) === null ? "Un PVP mayor que cero, o vacío." : null,
  });
  const skus = [...new Set(drafts.map((draft) => draft.item.sku))];
  const regionalProblems = new Map(skus.map((sku) => [sku, regionalProblem(linesOf(sku).map((draft) => draft.regional))]));
  const invalid =
    drafts.some((draft) => Object.values(errorsOf(draft)).some(Boolean)) || [...regionalProblems.values()].some((problem) => problem !== null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (drafts.length === 0 || invalid) return;
    const lines: LineInput[] = drafts.map((draft) => ({
      sku: draft.item.sku,
      regional: draft.regional,
      new_cost: parseAmount(draft.newCost)!,
      increased_on: draft.increasedOn,
      regular_discount_pct: parsePercent(draft.discount) ?? null,
      public_price: draft.publicPrice.trim() === "" ? null : parseAmount(draft.publicPrice),
      observation: draft.observation || null,
    }));
    create.mutate(
      { supplier: supplierCode, note, lines },
      {
        onSuccess: async (request) => {
          // The JSON create takes no file: the support goes right after, to the new request.
          if (support) {
            try {
              await attach.mutateAsync({ id: request.id, file: support });
            } catch (failure) {
              toast.error(`La solicitud se creó, pero el soporte no se adjuntó: ${errorMessage(failure)} Adjúntalo desde el detalle.`, {
                duration: Infinity,
              });
            }
          }
          toast.success(`Solicitud creada con ${lines.length} ${lines.length === 1 ? "línea" : "líneas"}, en revisión.`);
          onClose();
          router.push(`${basePath}/${request.id}`);
        },
      }
    );
  };
  const busy = create.isPending || attach.isPending;

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
          <p className="text-sm text-text-secondary">{q ? "Ningún producto activo del proveedor con ese texto." : "El proveedor no tiene productos activos."}</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border" aria-label="Productos para agregar">
            {results.map((item) => {
              const count = linesOf(item.sku).length;
              return (
                <li key={item.sku} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-[13px]">{item.sku}</span>
                    {item.description && <span className="text-text-secondary"> · {item.description}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="tabular-nums text-text-secondary">{formatCop(item.old_cost)}</span>
                    <Button size="sm" variant="outline" className="max-md:h-11" onClick={() => addLine(item)} aria-label={`Agregar ${item.sku}`}>
                      <Plus aria-hidden="true" /> {count > 0 ? `Agregar (${count})` : "Agregar"}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${searchId}-lines`} className="space-y-2">
        <h3 id={`${searchId}-lines`} className="text-sm font-semibold">
          Alzas de la solicitud {drafts.length > 0 && <span className="font-normal text-text-secondary">({drafts.length})</span>}
        </h3>
        <p className="text-[13px] text-text-secondary">{REGIONAL_HELP}</p>
        {drafts.length === 0 ? (
          <p className={cn("text-sm", submitted ? "text-danger" : "text-text-secondary")} role={submitted ? "alert" : undefined}>
            Agrega al menos una referencia de la lista de arriba.
          </p>
        ) : (
          <ol className="space-y-2">
            {drafts.map((draft) => {
              const siblings = linesOf(draft.item.sku);
              // The reference's regional problem is shown once, on its last line.
              const problem = siblings.at(-1)?.key === draft.key ? regionalProblems.get(draft.item.sku) ?? null : null;
              return (
                <DraftLine
                  key={draft.key}
                  draft={draft}
                  errors={submitted ? errorsOf(draft) : { cost: null, date: null, discount: errorsOf(draft).discount, price: null }}
                  regionalProblem={problem}
                  restCovers={draft.regional === REST ? restCoverage(siblings.map((line) => line.regional)) : []}
                  onChange={(patch) => update(draft.key, patch)}
                  onRemove={() => remove(draft.key)}
                  onAnother={() => addLine(draft.item, siblings.at(-1))}
                />
              );
            })}
          </ol>
        )}
      </section>

      <SupportPicker file={support} onChange={setSupport} onProblem={setSupportError} disabled={busy} />

      <Field label="Nota para la revisión" htmlFor={noteId} optional>
        <Textarea id={noteId} value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} />
      </Field>

      <DialogError message={supportError ?? (create.isError ? errorMessage(create.error) : null)} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Creando…" : "Crear solicitud"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DraftLine({
  draft,
  errors,
  regionalProblem,
  restCovers,
  onChange,
  onRemove,
  onAnother,
}: {
  draft: Draft;
  errors: DraftErrors;
  regionalProblem: string | null;
  restCovers: string[];
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
  onAnother: () => void;
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
        <span className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="max-md:h-11"
            onClick={onAnother}
            aria-label={`Agregar otra regional para ${item.sku}`}
            title="Otra línea de esta referencia con otra regional"
          >
            <CopyPlus aria-hidden="true" /> Otra regional
          </Button>
          <Button variant="ghost" size="icon-sm" className="max-md:size-11" onClick={onRemove} aria-label={`Quitar esta línea de ${item.sku}`}>
            <Trash2 aria-hidden="true" />
          </Button>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="min-w-0 space-y-1.5">
          <span id={`${id}-regional`} className="block text-[13px] font-medium">
            Regional
          </span>
          <Dropdown
            value={draft.regional}
            options={REGIONAL_OPTIONS}
            onValueChange={(regional) => onChange({ regional: regional as LineRegional })}
            aria-labelledby={`${id}-regional`}
            aria-invalid={regionalProblem !== null || undefined}
          />
          {restCovers.length > 0 && <p className="text-xs text-text-secondary">Cubre {regionalList(restCovers)}.</p>}
        </div>
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
        <Field label="Descuento regular" htmlFor={`${id}-discount`} optional error={errors.discount}>
          <PercentInput id={`${id}-discount`} value={draft.discount} onChange={(discount) => onChange({ discount })} />
        </Field>
        <Field label="PVP sin IVA" htmlFor={`${id}-pvp`} optional error={errors.price}>
          <Input
            id={`${id}-pvp`}
            value={draft.publicPrice}
            inputMode="decimal"
            onChange={(event) => onChange({ publicPrice: event.target.value })}
            aria-invalid={errors.price !== null || undefined}
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
      {regionalProblem && (
        <p role="alert" className="text-sm text-danger">
          {item.sku}: {regionalProblem}
        </p>
      )}
    </li>
  );
}
