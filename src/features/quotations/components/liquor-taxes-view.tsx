"use client";

import { useId, useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { AlertTriangle, CheckCircle2, FileCheck2, FileSpreadsheet, FileText, Loader2, Pencil, Undo2, Wine } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { useCreateLiquorUpdate, useLiquorOverview, useLiquorReview, useLiquorUpdates } from "../hooks/use-list-review";
import { formatCount, formatDateTime, formatDay, formatMoney } from "../lib/format";
import { downloadLiquorFile } from "../services/liquor.service";
import type { Liquor, LiquorUpdate, LiquorUpdateStatus, TaxValue } from "../types/liquor.types";
import { QuotationLoadError } from "./quotations-gate";
import { tomorrow } from "./review-dialogs";

const STATUS_TONE: Record<LiquorUpdateStatus, BadgeTone> = {
  pendiente_validacion: "warning",
  pendiente_carga: "info",
  cargada: "success",
  devuelta: "neutral",
};

/**
 * The liquor tax of every active liquor across every list: the value each
 * regional carries, what does not add up, the liquors of a liquor group with
 * no key, and the bulk changes. A change goes straight to SIESA, with no
 * validation: the few collaborators who manage it get SIESA's two pages (each
 * list's price, unchanged, and its new value tax) the moment they make it.
 */
export default function LiquorTaxesView() {
  const overview = useLiquorOverview();
  const canManage = overview.data?.can_manage === true;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState(false);

  if (overview.isPending) return <TableSkeleton rows={8} label="Cargando el impuesto licor de las listas" />;
  if (overview.isError && !overview.data) {
    return <QuotationLoadError error={overview.error} onRetry={() => void overview.refetch()} subject="el impuesto licor" />;
  }
  const { items, suspects, coast_lists: coastLists } = overview.data;
  const chosen = items.filter((item) => selected.has(item.sku));
  const toggle = (sku: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(sku)) next.add(sku);
      return next;
    });

  return (
    <div className="space-y-6">
      <section aria-labelledby="liquor-title" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 id="liquor-title" className="text-base font-semibold">
              Licores activos <span className="font-normal tabular-nums text-text-secondary">· {formatCount(items.length)}</span>
            </h2>
            <p className="text-[13px] text-text-secondary">
              Las listas {coastLists.join(", ")} pagan el valor Costa; todas las demás, el Nacional. Valores por unidad, en las listas activas.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setEditing(true)} disabled={chosen.length === 0} className="max-md:h-11">
              <Pencil aria-hidden="true" /> Cambiar impuesto{chosen.length > 0 ? ` (${formatCount(chosen.length)})` : ""}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <StatePanel icon={Wine} title="No hay licores activos con llave de impuesto">
            Ningún producto activo del maestro tiene la llave del impuesto al consumo de licores.
          </StatePanel>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Impuesto licor de cada producto activo en las listas</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {canManage && (
                    <th scope="col" className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={chosen.length === items.length}
                        ref={(element) => {
                          if (element) element.indeterminate = chosen.length > 0 && chosen.length < items.length;
                        }}
                        onChange={() => setSelected(chosen.length === items.length ? new Set() : new Set(items.map((item) => item.sku)))}
                        aria-label="Seleccionar todos los licores"
                        className="size-4 accent-[var(--primary)]"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2">Producto</th>
                  <th scope="col" className="px-3 py-2 text-right">Nacional</th>
                  <th scope="col" className="px-3 py-2 text-right">Costa</th>
                  <th scope="col" className="px-3 py-2 text-right">Maestro de márgenes</th>
                  <th scope="col" className="px-3 py-2 text-right">Listas</th>
                  <th scope="col" className="px-3 py-2">Revisar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.sku} className="align-top hover:bg-primary-subtle">
                    {canManage && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(item.sku)}
                          onChange={() => toggle(item.sku)}
                          aria-label={`Seleccionar ${item.description ?? item.sku}`}
                          className="mt-0.5 size-4 accent-[var(--primary)]"
                        />
                      </td>
                    )}
                    <td className="max-w-80 px-3 py-2">
                      <span className="block truncate font-medium" title={item.description ?? undefined}>{item.description ?? item.sku}</span>
                      <span className="block font-mono text-[13px] text-text-secondary">
                        SKU {item.sku} · llave {item.tax_key}
                        {item.tax_group ? ` · grupo ${item.tax_group}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <ValueCell value={item.national} values={item.national_values} regional="nacional" />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <ValueCell value={item.coast} values={item.coast_values} regional="Costa" />
                    </td>
                    <td className="px-3 py-2 text-right text-[13px] tabular-nums">
                      {item.master_national === null && item.master_coast === null ? (
                        <span className="text-text-secondary">Sin valor</span>
                      ) : (
                        <>
                          <span className="block">Nal. {formatMoney(item.master_national)}</span>
                          <span className="block text-text-secondary">Costa {formatMoney(item.master_coast)}</span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.lists_with_price)}</td>
                    <td className="px-3 py-2">
                      {item.flags.length === 0 ? (
                        <Badge tone="success" className="px-1.5 py-0 text-xs"><CheckCircle2 aria-hidden="true" /> Cuadra</Badge>
                      ) : (
                        <ul className="space-y-1">
                          {item.flag_labels.map((label) => (
                            <li key={label}>
                              <Badge tone="warning" className="whitespace-normal px-1.5 py-0 text-left text-xs">
                                <AlertTriangle aria-hidden="true" /> {label}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {suspects.length > 0 && (
        <section aria-labelledby="suspects-title" className="space-y-2">
          <h2 id="suspects-title" className="text-base font-semibold">
            Licores sin llave de impuesto <span className="font-normal tabular-nums text-text-secondary">· {formatCount(suspects.length)}</span>
          </h2>
          <p className="text-[13px] text-text-secondary">
            Productos activos de un grupo impositivo de licores o vinos que no tienen la llave del impuesto al consumo. Si deben
            llevarla, se crea en SIESA; no se cambian desde aquí.
          </p>
          <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Licores sin llave de impuesto</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Producto</th>
                  <th scope="col" className="px-3 py-2">Grupo impositivo</th>
                  <th scope="col" className="px-3 py-2 text-right">Listas con valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suspects.map((item) => (
                  <tr key={item.sku}>
                    <td className="px-3 py-2">
                      <span className="block font-medium">{item.description ?? item.sku}</span>
                      <span className="block font-mono text-[13px] text-text-secondary">SKU {item.sku}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono">{item.tax_group ?? "—"}</span>
                      {item.tax_group_name && <span className="text-text-secondary"> · {item.tax_group_name}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.lists_with_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <LiquorUpdates canManage={canManage} />

      <ChangeDialog
        items={chosen}
        open={editing}
        onOpenChange={setEditing}
        onCreated={() => {
          setEditing(false);
          setSelected(new Set());
        }}
      />
    </div>
  );
}

/** The regional's value, and on hover or focus every value it carries with its lists. */
function ValueCell({ value, values, regional }: { value: string | null; values: TaxValue[]; regional: string }) {
  const real = values.filter((item) => item.amount !== null);
  const several = real.length > 1;
  const missing = values.find((item) => item.amount === null);
  if (values.length === 0) return <span className="text-text-secondary">Sin listas</span>;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        aria-label={`Valor ${regional}: ${value === null ? "sin valor" : formatMoney(value)}. Ver los valores por lista`}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-semibold underline decoration-dotted underline-offset-4",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xl:min-h-11"
        )}
      >
        {value === null ? <span className="font-normal text-text-secondary">Sin valor</span> : formatMoney(value)}
        {(several || missing) && <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface-raised px-3 py-2 text-left text-[13px] text-text-primary shadow-modal outline-none">
            <Popover.Title className="mb-1 font-semibold">Valores en las listas de la regional {regional}</Popover.Title>
            <ul className="space-y-1.5">
              {values.map((item) => (
                <li key={item.amount ?? "none"}>
                  <span className="font-semibold tabular-nums">{item.amount === null ? "Sin valor" : formatMoney(item.amount)}</span>
                  <span className="text-text-secondary">
                    {" "}
                    · {formatCount(item.lists.length)} {item.lists.length === 1 ? "lista" : "listas"}
                  </span>
                  <span className="block break-words font-mono text-xs text-text-secondary">
                    {item.lists.slice(0, 30).join(", ")}
                    {item.lists.length > 30 ? ` y ${formatCount(item.lists.length - 30)} más` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** New national and Coast values for the ticked liquors, prefilled with what the lists carry today. */
function ChangeDialog({
  items,
  open,
  onOpenChange,
  onCreated,
}: {
  items: Liquor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const create = useCreateLiquorUpdate();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && create.isPending) return;
        onOpenChange(next);
      }}
      isForm
      wide
      title="Cambiar el impuesto licor"
      description="Se escribe en todas las listas activas donde el producto tiene precio, con el valor de su regional. El Excel y el plano para SIESA quedan listos al guardar, sin validación."
    >
      {open && <ChangeForm items={items} create={create} onCancel={() => onOpenChange(false)} onCreated={onCreated} />}
    </Dialog>
  );
}

const plain = (value: string | null) => {
  const number = toNumber(value);
  return number === null ? "" : String(Math.round(number * 100) / 100);
};

function ChangeForm({
  items,
  create,
  onCancel,
  onCreated,
}: {
  items: Liquor[];
  create: ReturnType<typeof useCreateLiquorUpdate>;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(items.map((item) => [item.sku, { national: plain(item.national), coast: plain(item.coast) }]))
  );
  const [note, setNote] = useState("");
  const [activation, setActivation] = useState(tomorrow());
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const dateId = useId();
  const today = useMemo(() => toIso(new Date()), []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const changes = [];
    for (const item of items) {
      const national = values[item.sku].national.replace(/\./g, "").replace(",", ".").trim();
      const coast = values[item.sku].coast.replace(/\./g, "").replace(",", ".").trim();
      if (!/^\d+(\.\d{1,4})?$/.test(national) || !/^\d+(\.\d{1,4})?$/.test(coast)) {
        setError(`Escribe el valor Nacional y Costa de ${item.description ?? item.sku} en pesos, sin signos.`);
        return;
      }
      changes.push({ sku: item.sku, national, coast });
    }
    create.mutate(
      { changes, note, activationDate: activation },
      {
        onSuccess: (result) => {
          toast.success(
            `Plano listo: ${formatCount(result.row_count)} precios en ${formatCount(result.list_count)} listas. Descárgalo en «Cambios del impuesto».`
          );
          onCreated();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset disabled={create.isPending} className="min-w-0 space-y-3">
        <legend className="sr-only">Valores nuevos por producto</legend>
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.sku} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] sm:items-end">
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.description ?? item.sku}</span>
                <span className="block font-mono text-xs text-text-secondary">
                  SKU {item.sku} · hoy Nal. {formatMoney(item.national)} · Costa {formatMoney(item.coast)}
                </span>
              </span>
              {(["national", "coast"] as const).map((field) => (
                <label key={field} className="space-y-1 text-xs text-text-secondary">
                  {field === "national" ? "Nacional" : "Costa"}
                  <Input
                    inputMode="decimal"
                    value={values[item.sku][field]}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [item.sku]: { ...current[item.sku], [field]: event.target.value } }))
                    }
                    aria-label={`${field === "national" ? "Valor Nacional" : "Valor Costa"} de ${item.description ?? item.sku}`}
                    className="text-right tabular-nums max-md:h-11"
                  />
                </label>
              ))}
            </li>
          ))}
        </ul>
        <div className="space-y-1">
          <label htmlFor={dateId} className="block text-sm font-medium">Fecha de activación en SIESA</label>
          <Input
            id={dateId}
            type="date"
            value={activation}
            min={today}
            onChange={(event) => setActivation(event.target.value)}
            className="w-44 max-md:h-11"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={noteId} className="block text-sm font-medium">Motivo</label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Resolución, alza del proveedor…"
            className="w-full rounded-md border border-border-control bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </div>
      </fieldset>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={create.isPending} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending} className="max-md:h-11">
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />} Generar plano
        </Button>
      </DialogFooter>
    </form>
  );
}

/** The bulk changes and what each person can do with them now. */
function LiquorUpdates({ canManage }: { canManage: boolean }) {
  const updates = useLiquorUpdates();
  return (
    <section aria-labelledby="liquor-updates-title" className="space-y-2">
      <h2 id="liquor-updates-title" className="text-base font-semibold">Cambios del impuesto</h2>
      {updates.isPending ? (
        <TableSkeleton rows={3} label="Cargando los cambios del impuesto" />
      ) : updates.isError ? (
        <p role="alert" className="text-sm text-danger">{errorMessage(updates.error)}</p>
      ) : updates.data.length === 0 ? (
        <p className="text-sm text-text-secondary">Aún no hay cambios. Selecciona productos arriba y usa «Cambiar impuesto».</p>
      ) : (
        <ul className="space-y-2">
          {updates.data.map((item) => (
            <LiquorUpdateCard key={item.id} item={item} canManage={canManage} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LiquorUpdateCard({ item, canManage }: { item: LiquorUpdate; canManage: boolean }) {
  const review = useLiquorReview();
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState<"xlsx" | "txt" | null>(null);
  const download = async (format: "xlsx" | "txt") => {
    setDownloading(format);
    try {
      await downloadLiquorFile(item.id, format);
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };
  const markUploaded = () =>
    review.mutate(
      { kind: "uploaded", item },
      {
        onSuccess: () => toast.success("Cambio marcado como cargado. El maestro de márgenes tomó los valores nuevos."),
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
      }
    );
  return (
    <li className="space-y-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[item.status]} className="px-1.5 py-0 text-xs">{item.status_label}</Badge>
            <span className="text-sm font-medium">
              {formatCount(item.changes.length)} {item.changes.length === 1 ? "producto" : "productos"}
            </span>
            {item.row_count > 0 && (
              <span className="text-[13px] tabular-nums text-text-secondary">
                · {formatCount(item.row_count)} precios en {formatCount(item.list_count)} listas
              </span>
            )}
          </p>
          <p className="text-[13px] text-text-secondary">
            Hizo {item.created_by} · {formatDateTime(item.created_at)}
            {item.activation_date && ` · activa el ${formatDay(item.activation_date)}`}
            {item.uploaded_by && ` · cargó ${item.uploaded_by}`}
          </p>
          {item.note && <p className="text-[13px]">Motivo: {item.note}</p>}
          {item.review_note && <p className="text-[13px]">Anulado: {item.review_note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {(item.status === "pendiente_carga" || item.status === "cargada") && canManage && (
            <>
              <Button variant="outline" onClick={() => void download("xlsx")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "xlsx" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}
                Excel SIESA
              </Button>
              <Button variant="outline" onClick={() => void download("txt")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "txt" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                Plano SIESA
              </Button>
            </>
          )}
          {item.status === "pendiente_carga" && canManage && (
            <>
              <Button onClick={markUploaded} disabled={review.isPending} className="max-md:h-11">
                {review.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />} Marcar cargado
              </Button>
              <Button variant="ghost" onClick={() => setCancelling(true)} disabled={review.isPending} className="max-md:h-11">
                <Undo2 aria-hidden="true" /> Anular
              </Button>
            </>
          )}
        </div>
      </div>
      {/* `relative`: the screen-reader words in the cells stay inside the scroll box instead of widening the page. */}
      <div className="relative overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-max text-left text-[13px] tabular-nums">
          <caption className="sr-only">Valores del cambio</caption>
          <thead className="bg-canvas-subtle text-xs text-text-secondary">
            <tr>
              <th scope="col" className="px-2 py-1.5">Producto</th>
              <th scope="col" className="px-2 py-1.5 text-right">Nacional</th>
              <th scope="col" className="px-2 py-1.5 text-right">Costa</th>
              <th scope="col" className="px-2 py-1.5 text-right">Listas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {item.changes.map((change) => (
              <tr key={change.sku}>
                <td className="px-2 py-1.5">
                  {change.description ?? change.sku} <span className="font-mono text-text-secondary">· {change.sku}</span>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Change before={change.previous_national} after={change.national} />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Change before={change.previous_coast} after={change.coast} />
                </td>
                <td className="px-2 py-1.5 text-right">{formatCount(change.lists)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CancelLiquorDialog item={item} open={cancelling} onOpenChange={setCancelling} />
    </li>
  );
}

function Change({ before, after }: { before: string | null; after: string }) {
  const same = toNumber(before) === toNumber(after);
  return (
    <span className="whitespace-nowrap">
      {!same && (
        <>
          <span className="text-text-secondary line-through">{before === null ? "sin valor" : formatMoney(before)}</span>{" "}
          <span className="sr-only">pasa a</span>
        </>
      )}
      <span className="font-semibold">{formatMoney(after)}</span>
    </span>
  );
}

/** A change whose files were not loaded: it stops counting and its files no longer download. */
function CancelLiquorDialog({ item, open, onOpenChange }: { item: LiquorUpdate; open: boolean; onOpenChange: (open: boolean) => void }) {
  const review = useLiquorReview();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    review.mutate(
      { kind: "cancel", item, note },
      {
        onSuccess: () => {
          toast.success("Cambio anulado. No cargues sus archivos.");
          onOpenChange(false);
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !review.isPending && onOpenChange(next)}
      isForm
      title="¿Anular el cambio del impuesto?"
      description="Solo si sus archivos no se cargaron en SIESA. Deja de contar y sus archivos ya no se descargan."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor={noteId} className="block text-sm font-medium">Motivo (opcional)</label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-border-control bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </div>
        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={review.isPending} className="max-md:h-11">Cancelar</Button>
          <Button type="submit" disabled={review.isPending} className="max-md:h-11">
            {review.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Anular
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
