"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, CloudOff, FileX2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import SupportDetail from "@/features/supports/components/support-detail";
import { formatCop } from "@/features/supports/lib/format";

import {
  useBatch,
  useBatchOrders,
  useCanManageValidations,
  useRevalidateBatch,
  useValidatorCatalogs,
} from "../hooks/use-order-validator";
import { formatDateTime, formatOrderDate } from "../lib/format";
import type { ValidationBatch, ValidationOrder, ValidationStatus } from "../types/order-validator.types";
import OrderLines from "./order-lines";
import { StatusBadge } from "./status-badges";

const PAGE_SIZE = 25;
const ALL = "";
const numberFormat = new Intl.NumberFormat("es-CO");

const STATUS_ORDER: ValidationStatus[] = ["listo_para_liberar", "pendiente_validacion"];

/** One uploaded file: its totals, the filters, and every order with its lines. */
export default function BatchView({ batchId, basePath }: { batchId: string; basePath: string }) {
  const batch = useBatch(batchId);
  const catalogs = useValidatorCatalogs().data;
  const canManage = useCanManageValidations();
  const revalidate = useRevalidateBatch();

  const [status, setStatus] = useState<ValidationStatus | typeof ALL>(ALL);
  const [reason, setReason] = useState(ALL);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [supportId, setSupportId] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());

  useBreadcrumbLabel(`${basePath}/${batchId}`, batch.data?.file_name);

  const orders = useBatchOrders({ batchId, status, reason, q, page, size: PAGE_SIZE });
  const result = orders.data;
  const rows = useMemo(() => result?.items ?? [], [result]);

  const statusLabel = (value: ValidationStatus) =>
    catalogs?.statuses.find((entry) => entry.value === value)?.label ?? value;

  // A reason belongs to one status, so with a status chosen only its reasons are offered.
  const reasonOptions = [
    { value: ALL, label: "Todos los motivos" },
    ...(catalogs?.reasons ?? [])
      .filter((entry) => status === ALL || entry.status === status)
      .map((entry) => ({ value: entry.value, label: entry.label })),
  ];

  const filtered = status !== ALL || reason !== ALL || q !== "";

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const chooseStatus = (next: ValidationStatus | typeof ALL) =>
    reset(() => {
      setStatus(next);
      const current = catalogs?.reasons.find((entry) => entry.value === reason);
      if (next !== ALL && current && current.status !== next) setReason(ALL);
    });

  const clearFilters = () => {
    setStatus(ALL);
    setReason(ALL);
    setText("");
    setPage(1);
  };

  const toggle = (document: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(document)) next.add(document);
      return next;
    });

  const runRevalidate = () =>
    revalidate.mutate(batchId, {
      onSuccess: (updated) =>
        toast.success(
          `Archivo revalidado: ${numberFormat.format(updated.ready_order_count)} de ${numberFormat.format(updated.order_count)} pedidos listos.`
        ),
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  if (batch.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando archivo" />;
  }
  if (batch.isError) {
    return <LoadError error={batch.error} backHref={basePath} onRetry={() => batch.refetch()} />;
  }

  const counts = result?.counts;
  const total = counts ? counts.listo_para_liberar + counts.pendiente_validacion : null;

  return (
    <div className="space-y-4">
      <Header batch={batch.data} basePath={basePath}>
        {canManage && (
          <Button onClick={runRevalidate} disabled={revalidate.isPending}>
            <RefreshCw className={cn(revalidate.isPending && "animate-spin")} aria-hidden="true" />
            {revalidate.isPending ? "Revalidando…" : "Revalidar"}
          </Button>
        )}
      </Header>

      <dl className="grid gap-3 md:grid-cols-2">
        <Totals
          title="Pedidos"
          ready={batch.data.ready_order_count}
          pending={batch.data.pending_order_count}
          total={batch.data.order_count}
          statusLabel={statusLabel}
        />
        <Totals
          title="Líneas"
          ready={batch.data.ready_line_count}
          pending={batch.data.pending_line_count}
          total={batch.data.line_count}
          statusLabel={statusLabel}
        />
      </dl>

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1 lg:max-w-xl">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => reset(() => setText(event.target.value))}
            placeholder="Buscar por pedido, cliente, NIT, SKU o vendedor"
            aria-label="Buscar pedidos del archivo"
            className="pl-9"
          />
        </div>
        <Dropdown
          className="lg:w-80"
          value={reason}
          onValueChange={(value) => reset(() => setReason(value))}
          options={reasonOptions}
          aria-label="Filtrar por motivo"
        />
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <StatusChip active={status === ALL} onClick={() => chooseStatus(ALL)} count={total}>
          Todos
        </StatusChip>
        {STATUS_ORDER.map((value) => (
          <StatusChip key={value} active={status === value} onClick={() => chooseStatus(value)} count={counts?.[value] ?? null}>
            {statusLabel(value)}
          </StatusChip>
        ))}
      </div>

      {orders.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando pedidos" />
      ) : orders.isError && !result ? (
        <LoadError error={orders.error} backHref={basePath} onRetry={() => orders.refetch()} />
      ) : rows.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ningún pedido coincide con los filtros"
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          >
            Prueba con otro texto o quita el estado o el motivo.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Este archivo no tiene pedidos">
            El reporte se leyó sin encontrar pedidos retenidos.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", orders.isPlaceholderData && "opacity-60")}>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((order) => {
              const open = expanded.has(order.document);
              const panelId = `order-${order.document}`;
              return (
                <li key={order.document}>
                  <button
                    type="button"
                    onClick={() => toggle(order.document)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex min-h-14 w-full flex-col gap-1.5 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px]">{order.document}</span>
                        <span className="block truncate text-sm font-medium">{order.customer_name ?? "Sin cliente"}</span>
                      </span>
                      <ChevronDown className={cn("mt-1 size-4 shrink-0 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusBadge status={order.status} label={order.status_label} />
                      <span className="text-xs tabular-nums text-text-secondary">
                        {order.ready_line_count} de {order.line_count} líneas listas · {formatCop(order.total_amount)}
                      </span>
                    </span>
                  </button>
                  {open && (
                    <div id={panelId} className="border-t border-border bg-canvas-subtle">
                      <OrderLines lines={order.lines} onOpenSupport={setSupportId} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Pedidos del archivo con su estado de validación</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Pedido</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Fecha</th>
                  <th scope="col" className="px-3 py-2">Cliente</th>
                  <th scope="col" className="px-3 py-2">Vendedor</th>
                  <th scope="col" className="px-3 py-2 text-right">Líneas listas</th>
                  <th scope="col" className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              {rows.map((order) => (
                <OrderRows
                  key={order.document}
                  order={order}
                  open={expanded.has(order.document)}
                  onToggle={() => toggle(order.document)}
                  onOpenSupport={setSupportId}
                />
              ))}
            </table>
          </div>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "pedido" : "pedidos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
          {orders.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(orders.error)}
            </p>
          )}
        </div>
      )}

      <SupportDetail id={supportId} onClose={() => setSupportId(null)} />
    </div>
  );
}

function Header({
  batch,
  basePath,
  children,
}: {
  batch: ValidationBatch;
  basePath: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Todos los archivos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{batch.file_name}</h1>
          <p className="text-sm text-text-secondary">
            Subido por {batch.uploaded_by} el {formatDateTime(batch.uploaded_at)}
            {" · "}
            {batch.validated_at
              ? `Última validación el ${formatDateTime(batch.validated_at)}${batch.validated_by ? ` por ${batch.validated_by}` : ""}`
              : "Aún sin validar"}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Totals({
  title,
  ready,
  pending,
  total,
  statusLabel,
}: {
  title: string;
  ready: number;
  pending: number;
  total: number;
  statusLabel: (status: ValidationStatus) => string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
      <dt className="text-sm font-semibold">
        {title} <span className="font-normal tabular-nums text-text-secondary">({numberFormat.format(total)} en el archivo)</span>
      </dt>
      <dd className="mt-2 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Amount status="listo_para_liberar" value={ready} label={statusLabel("listo_para_liberar")} />
        <Amount status="pendiente_validacion" value={pending} label={statusLabel("pendiente_validacion")} />
      </dd>
    </div>
  );
}

function Amount({ status, value, label }: { status: ValidationStatus; value: number; label: string }) {
  return (
    <div className="space-y-1">
      <StatusBadge status={status} label={label} />
      <p className="text-2xl font-semibold tabular-nums">{numberFormat.format(value)}</p>
    </div>
  );
}

function StatusChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-150 max-md:min-h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary text-text-on-primary"
          : "border-border-control hover:bg-canvas-subtle"
      )}
    >
      {children}
      {count !== null && <span className="tabular-nums opacity-80">{numberFormat.format(count)}</span>}
    </button>
  );
}

/** One order and, when open, its lines under it. A tbody per order keeps the pair together. */
function OrderRows({
  order,
  open,
  onToggle,
  onOpenSupport,
}: {
  order: ValidationOrder;
  open: boolean;
  onToggle: () => void;
  onOpenSupport: (supportId: string) => void;
}) {
  const panelId = `order-${order.document}`;
  return (
    <tbody className="divide-y divide-border border-t border-border">
      <tr className="h-10 hover:bg-primary-subtle">
        <td className="whitespace-nowrap px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? "Ocultar" : "Ver"} las líneas del pedido ${order.document}`}
            className="inline-flex items-center gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-150", !open && "-rotate-90")} aria-hidden="true" />
            <span className="font-mono text-[13px]">{order.document}</span>
          </button>
        </td>
        <td className="px-3 py-2">
          <StatusBadge status={order.status} label={order.status_label} />
        </td>
        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatOrderDate(order.order_date)}</td>
        <td className="max-w-64 px-3 py-2">
          <span className="block truncate font-medium">{order.customer_name ?? "Sin cliente"}</span>
          <span className="block truncate text-xs text-text-secondary">
            <span className="font-mono">{order.customer_nit ?? ""}</span>
            {order.channel ? ` · ${order.channel}` : ""}
          </span>
        </td>
        <td className="max-w-48 truncate px-3 py-2">{order.salesperson ?? "—"}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          {order.ready_line_count}
          <span className="text-text-secondary"> de {order.line_count}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCop(order.total_amount)}</td>
      </tr>
      {open && (
        <tr id={panelId}>
          <td colSpan={7} className="bg-canvas-subtle p-0">
            <OrderLines lines={order.lines} onOpenSupport={onOpenSupport} />
          </td>
        </tr>
      )}
    </tbody>
  );
}

function LoadError({ error, backHref, onRetry }: { error: Error; backHref: string; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? "No encontramos este archivo"
      : status === 429
        ? "Demasiadas consultas seguidas"
        : "No se pudo cargar el archivo";
  const description =
    status === 404
      ? "Puede que se haya retirado o que el enlace esté incompleto."
      : status === 429
        ? "Espera unos segundos y vuelve a intentarlo."
        : errorMessage(error);
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={title}
      action={
        status === 404 ? (
          <Link
            href={backHref}
            className="inline-flex h-9 items-center rounded-md border border-border-control px-3 text-sm font-medium hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ver todos los archivos
          </Link>
        ) : (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        )
      }
    >
      {description}
    </StatePanel>
  );
}
