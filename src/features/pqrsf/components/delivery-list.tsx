"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Clock, CloudOff, FileText, Lock, MailCheck, MailWarning, type LucideIcon } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoDateRange } from "@/shared/components/ui/date-range-picker";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useDeliveryList, useDeliverySummary } from "../hooks/use-pqrsf";
import { formatDateTime, formatRelativeTime, todayIso } from "../lib/format";
import type { DeliveryStatus, DocumentDelivery } from "../types/pqrsf.types";

const PAGE_SIZE = 10;

const STATUS: Record<DeliveryStatus, { label: string; icon: LucideIcon; className: string }> = {
  pending: { label: "Envío pendiente", icon: Clock, className: "text-text-secondary" },
  sent: { label: "Documentos enviados", icon: MailCheck, className: "text-success" },
  failed: { label: "Envío fallido", icon: MailWarning, className: "text-danger" },
};

export const deliveryStatus = (status: DeliveryStatus) => STATUS[status] ?? STATUS.pending;

/**
 * Customers who asked for documents in the public form: what went out by email
 * on its own and what became a case. Managers only.
 */
export default function DeliveryList({ area }: { area: string }) {
  const id = useId();
  const summary = useDeliverySummary();
  const [unread, setUnread] = useState(false);
  const [text, setText] = useState("");
  const [range, setRange] = useState<IsoDateRange>({});
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());

  const list = useDeliveryList({
    unread: unread || undefined,
    q: q || undefined,
    from: range.from,
    to: range.to,
    page,
    size: PAGE_SIZE,
  });

  // Any filter change goes back to the first page.
  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const forbidden =
    (list.error instanceof ApiError && list.error.status === 403) ||
    (summary.error instanceof ApiError && summary.error.status === 403);

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const from = data && data.total > 0 ? (data.page - 1) * data.size + 1 : 0;
  const to = data ? Math.min(data.page * data.size, data.total) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de documentos</h1>
        <p className="text-sm text-text-secondary">
          Quien pide documentos por el formulario recibe al instante los que tienen certificado. Lo
          demás abre un caso.
          {summary.data && (
            <>
              {" "}
              <span className="tabular">
                {summary.data.unread} sin leer de {summary.data.total}.
              </span>
            </>
          )}
        </p>
      </div>

      {forbidden ? (
        <StatePanel icon={Lock} title="Esta vista es para quienes gestionan PQRSF">
          Pide acceso al área de Calidad si necesitas revisar las solicitudes de documentos.
        </StatePanel>
      ) : (
        <section aria-labelledby={`${id}-list`} className="min-w-0 space-y-4">
          <h2 id={`${id}-list`} className="sr-only">
            Listado
          </h2>
          <form
            role="search"
            aria-label="Filtros de solicitudes de documentos"
            onSubmit={(event) => event.preventDefault()}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label htmlFor={`${id}-q`} className="block text-[13px] font-medium">
                Buscar
              </label>
              <Input
                id={`${id}-q`}
                type="search"
                value={text}
                onChange={(event) => change(setText)(event.target.value)}
                placeholder="Nombre, NIT o correo"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${id}-range`} className="block text-[13px] font-medium">
                Fecha
              </label>
              <DateRangePicker
                id={`${id}-range`}
                value={range}
                onChange={change(setRange)}
                max={todayIso()}
              />
            </div>
            <div className="flex items-end">
              <label className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
                <input
                  type="checkbox"
                  checked={unread}
                  onChange={(event) => change(setUnread)(event.target.checked)}
                  className="size-4"
                />
                Solo sin leer
              </label>
            </div>
          </form>

          {list.isPending ? (
            <div className="space-y-2" aria-busy="true">
              <span className="sr-only">Cargando</span>
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-md bg-canvas-subtle" />
              ))}
            </div>
          ) : list.error ? (
            <StatePanel
              icon={CloudOff}
              tone="danger"
              title="No se cargaron las solicitudes"
              action={
                <Button variant="outline" onClick={() => list.refetch()}>
                  Reintentar
                </Button>
              }
            >
              {errorMessage(list.error)}
            </StatePanel>
          ) : data && data.items.length === 0 ? (
            <StatePanel icon={FileText} title="Nada con estos filtros">
              Cambia la fecha o el texto de búsqueda.
            </StatePanel>
          ) : (
            data && (
              <>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data.items.map((item) => (
                    <Row key={item.id} item={item} area={area} />
                  ))}
                </ul>
                <nav
                  aria-label="Paginación"
                  className="flex flex-wrap items-center justify-end gap-3"
                >
                  <span className="tabular text-[13px] text-text-secondary" aria-live="polite">
                    {from}–{to} de {data.total}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:h-11"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:h-11"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </nav>
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}

/** Unread rows carry a filled icon and bold name; the state is also in the tooltip. */
export function DeliveryIcon({ status, unread }: { status: DeliveryStatus; unread: boolean }) {
  const { label, icon: Icon, className } = deliveryStatus(status);
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        unread && "bg-info-badge"
      )}
      title={`${label}${unread ? ", sin leer" : ""}`}
    >
      <Icon className={cn("size-4", className)} aria-hidden="true" />
      <span className="sr-only">
        {label}
        {unread ? ", sin leer" : ""}
      </span>
    </span>
  );
}

function Row({ item, area }: { item: DocumentDelivery; area: string }) {
  const isUnread = !item.read_at;
  const names = item.documents.map((document) => document.name);
  return (
    <li>
      <Link
        href={`/${area}/pqrsf/solicitudes-documentos/${item.id}`}
        className="flex gap-3 px-3 py-3 hover:bg-canvas-subtle max-md:min-h-11"
      >
        <DeliveryIcon status={item.status} unread={isUnread} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className={cn("truncate", isUnread ? "font-semibold" : "font-medium")}>
              {item.full_name}
            </span>
            {item.business_name && (
              <span className="truncate text-text-secondary">· {item.business_name}</span>
            )}
          </p>
          {names.length > 0 && (
            <p className="line-clamp-2 text-[13px]">
              <span className="text-text-secondary">Enviados: </span>
              {names.join(", ")}
            </p>
          )}
          {item.manual_documents.length > 0 && (
            <p className="line-clamp-2 text-[13px]">
              <span className="text-text-secondary">
                A caso{item.case_code ? ` ${item.case_code}` : ""}:{" "}
              </span>
              {item.manual_documents.join(", ")}
            </p>
          )}
          <p className="text-[13px] text-text-secondary">{item.email}</p>
        </div>
        <time
          dateTime={item.created_at}
          title={formatDateTime(item.created_at)}
          className="shrink-0 text-[13px] whitespace-nowrap text-text-secondary"
        >
          {formatRelativeTime(item.created_at)}
        </time>
      </Link>
    </li>
  );
}
