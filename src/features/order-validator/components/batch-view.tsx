"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CloudOff, FileX2, RefreshCw, Search, Trash2, UserCheck } from "lucide-react";
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

import {
  useBatch,
  useBatchOrders,
  useCanManageValidations,
  useRevalidateBatch,
  useValidatorCatalogs,
} from "../hooks/use-order-validator";
import { formatDateTime } from "../lib/format";
import type { OrderSort, ValidationBatch, ValidationStatus } from "../types/order-validator.types";
import ApprovalDialog, { type ApprovalAction } from "./approval-dialog";
import DeleteBatchDialog from "./delete-batch-dialog";
import { OrdersList, OrdersTable } from "./orders-table";
import { StatusBadge } from "./status-badges";
import ThresholdControl from "./threshold-control";

const PAGE_SIZE = 25;
const ALL = "";
const numberFormat = new Intl.NumberFormat("es-CO");

const STATUS_ORDER: ValidationStatus[] = ["listo_para_liberar", "pendiente_validacion"];

const LIQUOR_OPTIONS = [
  { value: ALL, label: "Con y sin licor" },
  { value: "true", label: "Con impuesto licor" },
  { value: "false", label: "Sin impuesto licor" },
];

const SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: "attention", label: "Orden de atención" },
  { value: "file", label: "Orden del archivo" },
];

/** One uploaded file: its totals, the filters, and every order with its lines. */
export default function BatchView({ batchId, basePath }: { batchId: string; basePath: string }) {
  const batch = useBatch(batchId);
  const catalogs = useValidatorCatalogs().data;
  const canManage = useCanManageValidations();
  const revalidate = useRevalidateBatch();

  const [status, setStatus] = useState<ValidationStatus | typeof ALL>(ALL);
  const [reason, setReason] = useState(ALL);
  const [liquorTax, setLiquorTax] = useState(ALL);
  const [sort, setSort] = useState<OrderSort>("attention");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [supportId, setSupportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<ApprovalAction | null>(null);
  const router = useRouter();
  const q = useDebouncedValue(text.trim());

  useBreadcrumbLabel(`${basePath}/${batchId}`, batch.data?.file_name);

  // The order the rows come in is the server's: attention first by default. It is never re-sorted here.
  const orders = useBatchOrders({ batchId, status, reason, liquorTax, sort, q, page, size: PAGE_SIZE });
  const result = orders.data;
  const rows = useMemo(() => result?.items ?? [], [result]);

  // Only pending orders can be ticked. The selection is read back from the
  // rows on screen, so an order that stopped being pending drops out of it.
  const pendingOrders = rows.filter((order) => order.status === "pendiente_validacion");
  const selectedDocuments = pendingOrders.filter((order) => selected.has(order.document)).map((order) => order.document);
  const allSelected = pendingOrders.length > 0 && selectedDocuments.length === pendingOrders.length;

  const statusLabel = (value: ValidationStatus) =>
    catalogs?.statuses.find((entry) => entry.value === value)?.label ?? value;

  // A reason belongs to one status, so with a status chosen only its reasons are offered.
  const reasonOptions = [
    { value: ALL, label: "Todos los motivos" },
    ...(catalogs?.reasons ?? [])
      .filter((entry) => status === ALL || entry.status === status)
      .map((entry) => ({ value: entry.value, label: entry.label })),
  ];

  const filtered = status !== ALL || reason !== ALL || liquorTax !== ALL || q !== "";

  // Any change to what is listed starts over on page 1 with nothing ticked, so
  // an approval never reaches an order that is no longer in view.
  const reset = (apply: () => void) => {
    apply();
    setPage(1);
    setSelected(new Set());
  };

  const goToPage = (next: number) => {
    setPage(next);
    setSelected(new Set());
  };

  const toggleSelected = (document: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(document)) next.add(document);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(pendingOrders.map((order) => order.document)));

  const chooseStatus = (next: ValidationStatus | typeof ALL) =>
    reset(() => {
      setStatus(next);
      const current = catalogs?.reasons.find((entry) => entry.value === reason);
      if (next !== ALL && current && current.status !== next) setReason(ALL);
    });

  const clearFilters = () => {
    setStatus(ALL);
    setReason(ALL);
    setLiquorTax(ALL);
    setText("");
    setPage(1);
    setSelected(new Set());
  };

  const toggle = (document: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(document)) next.add(document);
      return next;
    });

  // Without a threshold the API keeps the saved one, and the manual approvals either way.
  const runRevalidate = () =>
    revalidate.mutate(
      { id: batchId },
      {
        onSuccess: (updated) =>
          toast.success(
            `Archivo revalidado: ${numberFormat.format(updated.ready_order_count)} de ${numberFormat.format(updated.order_count)} pedidos listos.`
          ),
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
      }
    );

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
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" /> Eliminar archivo
            </Button>
            <Button variant="outline" onClick={runRevalidate} disabled={revalidate.isPending}>
              <RefreshCw className={cn(revalidate.isPending && "animate-spin")} aria-hidden="true" />
              {revalidate.isPending ? "Revalidando…" : "Revalidar"}
            </Button>
          </div>
        )}
      </Header>
      <DeleteBatchDialog
        batch={deleting ? batch.data : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => router.push(basePath)}
      />

      <ThresholdControl batch={batch.data} canManage={canManage} />

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
          className="lg:w-72"
          value={reason}
          onValueChange={(value) => reset(() => setReason(value))}
          options={reasonOptions}
          aria-label="Filtrar por motivo"
        />
        <Dropdown
          className="lg:w-48"
          value={liquorTax}
          onValueChange={(value) => reset(() => setLiquorTax(value))}
          options={LIQUOR_OPTIONS}
          aria-label="Filtrar por impuesto al licor"
        />
        <Dropdown
          className="lg:w-48"
          value={sort}
          onValueChange={(value) => reset(() => setSort(value as OrderSort))}
          options={SORT_OPTIONS}
          aria-label="Orden de los pedidos"
        />
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Sticky so "Aprobar pedidos" stays in reach while the rows are ticked down the page. */}
      <div className="sticky top-0 z-20 flex min-h-12 flex-wrap items-center justify-between gap-2 bg-canvas py-2">
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
        {canManage && (
          // The region stays mounted so a screen reader announces the count as it
          // appears; the count and the button exist only while something is selected.
          <div className="flex items-center gap-3" aria-live="polite">
            {selectedDocuments.length > 0 && (
              <>
                <span className="text-sm tabular-nums text-text-secondary">
                  {selectedDocuments.length === 1 ? "1 pedido seleccionado" : `${selectedDocuments.length} pedidos seleccionados`}
                </span>
                <Button onClick={() => setAction({ kind: "approve", documents: selectedDocuments })}>
                  <UserCheck aria-hidden="true" /> Aprobar pedidos
                </Button>
              </>
            )}
          </div>
        )}
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
            Prueba con otro texto o quita el estado, el motivo o el impuesto al licor.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Este archivo no tiene pedidos">
            El reporte se leyó sin encontrar pedidos retenidos.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", orders.isPlaceholderData && "opacity-60")}>
          <OrdersList
            rows={rows}
            expanded={expanded}
            canManage={canManage}
            selected={selected}
            onToggle={toggle}
            onSelect={toggleSelected}
            onRevoke={(document) => setAction({ kind: "revoke", document })}
            onOpenSupport={setSupportId}
          />
          <OrdersTable
            rows={rows}
            expanded={expanded}
            canManage={canManage}
            selected={selected}
            allSelected={allSelected}
            someSelected={selectedDocuments.length > 0}
            hasPending={pendingOrders.length > 0}
            onToggle={toggle}
            onSelect={toggleSelected}
            onSelectAll={toggleAll}
            onRevoke={(document) => setAction({ kind: "revoke", document })}
            onOpenSupport={setSupportId}
          />

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "pedido" : "pedidos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={goToPage} />
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
      <ApprovalDialog
        batchId={batchId}
        action={action}
        onClose={() => setAction(null)}
        onApproved={() => setSelected(new Set())}
      />
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
        <div className="min-w-0 flex-1 basis-80 space-y-1">
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
