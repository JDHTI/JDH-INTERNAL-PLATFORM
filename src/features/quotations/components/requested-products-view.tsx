"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleSlash, FileX2, Loader2, PackageSearch, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useQuotationPermissions, useRequestedProducts, useUpdateRequestedProduct } from "../hooks/use-quotations";
import { formatCount, formatDateTime, formatMoney } from "../lib/format";
import type { RequestedProduct, RequestedProductStatus } from "../types/quotations.types";
import { QuotationLoadError } from "./quotations-gate";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 20;

const STATUS_LOOK: Record<RequestedProductStatus, { tone: BadgeTone; label: string; icon: typeof CheckCircle2 }> = {
  // Waiting on BI: amber, like the quotations waiting for validation.
  solicitado: { tone: "warning", label: "Solicitado", icon: PackageSearch },
  creado: { tone: "success", label: "Creado en SIESA", icon: CheckCircle2 },
  descartado: { tone: "neutral", label: "Descartado", icon: CircleSlash },
};

const FILTERS: { value: RequestedProductStatus | ""; label: string }[] = [
  { value: "solicitado", label: "Solicitados" },
  { value: "creado", label: "Creados en SIESA" },
  { value: "descartado", label: "Descartados" },
  { value: "", label: "Todos" },
];

const vatFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

type Action = { product: RequestedProduct; to: RequestedProductStatus };

/**
 * The products advisors quoted that SIESA does not have, apart from any
 * quotation: deleting a quotation never loses one. Comercial follows them;
 * BI moves them along (created in SIESA with its reference, or discarded).
 * Once created, each quotation that has it offers to swap in the reference.
 */
export default function RequestedProductsView({ basePath }: { basePath: string }) {
  const permissions = useQuotationPermissions().data;
  const canResolve = permissions?.can_validate === true;
  const [status, setStatus] = useState<RequestedProductStatus | "">("solicitado");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const q = useDebouncedValue(text.trim());
  const requests = useRequestedProducts({ status, q, page, size: PAGE_SIZE });
  const result = requests.data;
  const items = result?.items ?? [];

  const choose = (next: RequestedProductStatus | "") => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-text-secondary">
        {canResolve
          ? "Cuando se cree la referencia en SIESA, márcalo con su código: las cotizaciones que lo tienen podrán usarla."
          : "BI los revisa y, cuando la referencia existe en SIESA, las cotizaciones que los tienen pueden usarla."}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <ToggleChip key={filter.value || "todos"} active={status === filter.value} onClick={() => choose(filter.value)}>
              {filter.label}
            </ToggleChip>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder="Descripción o proveedor"
            aria-label="Buscar productos solicitados"
            className="pl-9 max-md:h-11"
          />
        </div>
      </div>

      {requests.isPending ? (
        <TableSkeleton rows={6} label="Cargando productos solicitados" />
      ) : requests.isError && !result ? (
        <QuotationLoadError error={requests.error} onRetry={() => void requests.refetch()} subject="los productos solicitados" />
      ) : items.length === 0 ? (
        status === "solicitado" && q === "" ? (
          <StatePanel icon={PackageSearch} title="No hay productos por revisar">
            Cuando un asesor cree un producto para cotizar desde una cotización, aparecerá aquí.
          </StatePanel>
        ) : (
          <StatePanel
            icon={FileX2}
            title="Ningún producto coincide"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setText("");
                  choose("");
                }}
              >
                Ver todos
              </Button>
            }
          >
            Prueba con otra palabra de la descripción o con otro estado.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", requests.isPlaceholderData && "opacity-60")}>
          <ul className="space-y-2 md:hidden">
            {items.map((product) => (
              <li key={product.id} className="space-y-2 rounded-lg border border-border bg-surface p-3">
                <ProductCell product={product} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge product={product} />
                  <span className="tabular-nums">{formatMoney(product.estimated_price)}</span>
                </div>
                <QuotationLinks product={product} basePath={basePath} />
                {canResolve && <Actions product={product} onAction={setAction} />}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Productos solicitados</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Producto</th>
                  <th scope="col" className="px-3 py-2 text-right">Precio estimado</th>
                  <th scope="col" className="px-3 py-2 text-right">IVA</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Cotizaciones</th>
                  <th scope="col" className="px-3 py-2">Solicitado</th>
                  {canResolve && <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((product) => (
                  <tr key={product.id} className="align-top hover:bg-primary-subtle">
                    <td className="max-w-80 px-3 py-2"><ProductCell product={product} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(product.estimated_price)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {toNumber(product.vat_pct) === null ? "—" : `${vatFormat.format(toNumber(product.vat_pct) ?? 0)} %`}
                    </td>
                    <td className="px-3 py-2"><StatusBadge product={product} /></td>
                    <td className="max-w-64 px-3 py-2"><QuotationLinks product={product} basePath={basePath} /></td>
                    <td className="px-3 py-2">
                      <span className="block truncate">{product.created_by}</span>
                      <span className="block whitespace-nowrap text-xs tabular-nums text-text-secondary">{formatDateTime(product.created_at)}</span>
                    </td>
                    {canResolve && (
                      <td className="px-3 py-2">
                        <Actions product={product} onAction={setAction} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {formatCount(result.total)} {result.total === 1 ? "producto" : "productos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <StatusDialog action={action} onClose={() => setAction(null)} />
    </div>
  );
}

function ProductCell({ product }: { product: RequestedProduct }) {
  return (
    <div className="min-w-0">
      <span className="block font-medium">{product.description}</span>
      <span className="block text-[13px] text-text-secondary">{product.supplier_name ?? "Sin proveedor"}</span>
      {product.note && <span className="block text-[13px] text-text-secondary">Nota: {product.note}</span>}
    </div>
  );
}

function StatusBadge({ product }: { product: RequestedProduct }) {
  const look = STATUS_LOOK[product.status];
  const Icon = look.icon;
  return (
    <Badge tone={look.tone}>
      <Icon aria-hidden="true" /> {product.status_label || look.label}
      {product.status === "creado" && product.siesa_sku && <span className="font-mono">· {product.siesa_sku}</span>}
    </Badge>
  );
}

/** The quotations that quote it and that the viewer can open; the rest are counted, not named. */
function QuotationLinks({ product, basePath }: { product: RequestedProduct; basePath: string }) {
  if (product.quotations.length === 0) return <span className="text-[13px] text-text-secondary">Ninguna abierta para ti</span>;
  const shown = product.quotations.slice(0, 2);
  const rest = product.quotations.length - shown.length;
  return (
    <ul className="space-y-0.5 text-[13px]">
      {shown.map((quotation) => (
        <li key={quotation.id} className="truncate">
          <Link
            href={`${basePath}/${quotation.id}`}
            className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {quotation.customer_name}
          </Link>
          <span className="text-text-secondary"> · {quotation.status_label}</span>
        </li>
      ))}
      {rest > 0 && <li className="text-text-secondary">y {formatCount(rest)} más</li>}
    </ul>
  );
}

function Actions({ product, onAction }: { product: RequestedProduct; onAction: (action: Action) => void }) {
  if (product.status !== "solicitado") {
    return (
      <Button variant="ghost" size="sm" onClick={() => onAction({ product, to: "solicitado" })} className="max-md:h-11">
        <RotateCcw aria-hidden="true" /> Volver a solicitado
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onAction({ product, to: "creado" })} className="max-md:h-11">
        <CheckCircle2 aria-hidden="true" /> Creado en SIESA
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onAction({ product, to: "descartado" })} className="max-md:h-11">
        Descartar
      </Button>
    </div>
  );
}

const DIALOG_TEXT: Record<RequestedProductStatus, { title: string; description: string; confirm: string }> = {
  creado: {
    title: "Marcar como creado en SIESA",
    description: "Escribe la referencia que se creó. Las cotizaciones que lo tienen podrán cambiarlo por esa referencia, con su costo y su regla.",
    confirm: "Marcar como creado",
  },
  descartado: {
    title: "Descartar el producto",
    description: "No se va a crear en SIESA. Sigue en las cotizaciones que lo tienen como producto para cotizar.",
    confirm: "Descartar",
  },
  solicitado: {
    title: "Volver a solicitado",
    description: "Queda otra vez por revisar; si tenía referencia de SIESA, se quita.",
    confirm: "Volver a solicitado",
  },
};

function StatusDialog({ action, onClose }: { action: Action | null; onClose: () => void }) {
  const text = action ? DIALOG_TEXT[action.to] : DIALOG_TEXT.solicitado;
  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm={action?.to === "creado"}
      wide={false}
      title={text.title}
      description={action ? `${action.product.description}. ${text.description}` : undefined}
    >
      {action && <StatusForm key={`${action.product.id}-${action.to}`} action={action} onClose={onClose} />}
    </Dialog>
  );
}

function StatusForm({ action, onClose }: { action: Action; onClose: () => void }) {
  const id = useId();
  const update = useUpdateRequestedProduct();
  const [sku, setSku] = useState("");
  const [note, setNote] = useState(action.product.note ?? "");
  const [skuError, setSkuError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const text = DIALOG_TEXT[action.to];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (action.to === "creado" && sku.trim() === "") {
      setSkuError("Escribe la referencia de SIESA, por ejemplo 10231.");
      return;
    }
    setFailure(null);
    update.mutate(
      {
        id: action.product.id,
        change: {
          status: action.to,
          ...(action.to === "creado" ? { siesa_sku: sku.trim() } : {}),
          ...(action.to !== "solicitado" && note.trim() ? { note: note.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(`${action.product.description}: ${STATUS_LOOK[action.to].label.toLowerCase()}.`);
          onClose();
        },
        onError: (error) => setFailure(errorMessage(error)),
      }
    );
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {action.to === "creado" && (
        <Field label="Referencia en SIESA" htmlFor={`${id}-sku`} error={skuError}>
          <Input
            id={`${id}-sku`}
            value={sku}
            onChange={(event) => {
              setSku(event.target.value);
              setSkuError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={skuError ? true : undefined}
            aria-describedby={skuError ? `${id}-sku-error` : undefined}
            className="font-mono max-md:h-11"
          />
        </Field>
      )}
      {action.to !== "solicitado" && (
        <Field label="Nota" htmlFor={`${id}-note`} optional>
          <Input id={`${id}-note`} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} className="max-md:h-11" />
        </Field>
      )}
      <DialogError message={failure} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={update.isPending} className="max-md:h-11">
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {text.confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}
