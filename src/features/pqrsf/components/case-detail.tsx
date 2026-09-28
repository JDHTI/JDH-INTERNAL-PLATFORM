"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CloudOff, Copy, FileQuestion, Lock, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCaseDetail, useCatalog, useMarkRead } from "../hooks/use-pqrsf";
import {
  formatDate,
  formatDateTime,
  legacyAssignee,
  originLabel,
  personName,
} from "../lib/format";
import { inboxHref } from "../lib/inbox-state";
import type { PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";
import { DueLabel, StatusBadge } from "./case-badges";
import { AssignDialog, EditCaseDialog, StatusDialog } from "./case-dialogs";
import CaseItems from "./case-items";
import CaseTimeline from "./case-timeline";
import IntakeRequestSection from "./intake-request";

export default function CaseDetailScreen({ area, caseId }: { area: string; caseId: string }) {
  const detail = useCaseDetail(caseId);
  const catalog = useCatalog();
  const markRead = useMarkRead(caseId);
  useBreadcrumbLabel(`/${area}/pqrsf/${caseId}`, detail.data?.case.code);

  // Once per visit, and the API decides whether it counts: only the
  // assignee's first read moves the case to «Leída».
  const readSent = useRef(false);
  const mutateRead = markRead.mutate;
  useEffect(() => {
    if (readSent.current) return;
    readSent.current = true;
    mutateRead();
  }, [mutateRead]);

  const back = (
    <Link
      href={inboxHref(area)}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a la bandeja
    </Link>
  );

  if (detail.isPending || catalog.isPending) return <DetailSkeleton />;

  const error = detail.error ?? catalog.error;
  if (error) {
    // A malformed id in the URL comes back as 422: for the reader, it is the same missing case.
    const raw = error instanceof ApiError ? error.status : 0;
    const status = raw === 422 ? 404 : raw;
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">
          {status === 404 ? "Caso no encontrado" : status === 403 ? "Sin acceso al caso" : "No se abrió el caso"}
        </h1>
        {status === 404 ? (
          <StatePanel icon={FileQuestion} title="Este caso no existe">
            El enlace puede estar incompleto o el caso fue creado en otro ambiente. Búscalo por su
            consecutivo en la bandeja.
          </StatePanel>
        ) : status === 403 ? (
          <StatePanel icon={Lock} title={errorMessage(error)}>
            Ves los casos que tienes asignados y los que registraste. Si necesitas este, pídele a
            Calidad que te lo asigne.
          </StatePanel>
        ) : (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="La plataforma no respondió"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  detail.refetch();
                  catalog.refetch();
                }}
              >
                Reintentar
              </Button>
            }
          >
            {errorMessage(error)}
          </StatePanel>
        )}
      </div>
    );
  }

  if (!detail.data || !catalog.data) return <DetailSkeleton />;
  const { case: item, events, request } = detail.data;
  return (
    <div className="space-y-6">
      {back}
      <CaseHeader item={item} catalog={catalog.data} />

      {/* The facts sit beside the work only on very wide screens. Below that
          they become a strip on top, so the documents table keeps the full
          width its nine columns need. */}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CaseFacts item={item} />
        <div className="min-w-0 space-y-8 2xl:row-start-1">
          {(item.subject || item.description) && (
            <section aria-labelledby="subject-heading" className="space-y-1">
              <h2 id="subject-heading" className="text-base font-semibold">
                {item.subject ?? "Descripción"}
              </h2>
              {item.description && (
                <p className="max-w-prose text-sm whitespace-pre-wrap">{item.description}</p>
              )}
            </section>
          )}
          <CaseItems item={item} catalog={catalog.data} />
          {request && <IntakeRequestSection caseId={item.id} request={request} />}
          <CaseTimeline item={item} events={events} catalog={catalog.data} />
        </div>
      </div>
    </div>
  );
}

function CaseHeader({ item, catalog }: { item: PqrsfCase; catalog: TrackingCatalog }) {
  const [dialog, setDialog] = useState<"status" | "assign" | "edit" | null>(null);
  const [copied, setCopied] = useState(false);
  const isClosed = item.closed_at !== null;
  const { can_work: canWork, can_assign: canAssign } = item.permissions;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("El navegador no permitió copiar. Selecciona el consecutivo y cópialo a mano.", {
        duration: Infinity,
      });
    }
  };

  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{item.code}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              className="max-md:size-11"
              onClick={copy}
              aria-label={copied ? "Consecutivo copiado" : `Copiar ${item.code}`}
              title="Copiar consecutivo"
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm text-text-secondary">
            {item.request_type.name} · {originLabel(item.origin)} · Recibido el{" "}
            <span className="tabular">{formatDate(item.received_on)}</span>
            {item.legacy?.original_consecutive !== undefined &&
              String(item.legacy.original_consecutive) !== item.code && (
                <> · En el Excel era {String(item.legacy.original_consecutive)}</>
              )}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Vence</span>
            <DueLabel item={item} layout="inline" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {canWork && !isClosed && (
            <Button variant="outline" className="max-md:h-11" onClick={() => setDialog("edit")}>
              <Pencil aria-hidden="true" />
              Editar datos
            </Button>
          )}
          {canAssign && !isClosed && (
            <Button variant="secondary" className="max-md:h-11" onClick={() => setDialog("assign")}>
              <UserRound aria-hidden="true" />
              {item.assignee ? "Reasignar" : "Asignar"}
            </Button>
          )}
          {canWork && (
            <Button className="max-md:h-11" onClick={() => setDialog("status")}>
              {isClosed ? "Reabrir caso" : "Cambiar estado"}
            </Button>
          )}
        </div>
      </div>

      {isClosed && (
        <p className="rounded-md bg-success-badge px-3 py-2 text-sm text-success" role="status">
          Finalizado el{" "}
          <time dateTime={item.closed_at!} title={formatDateTime(item.closed_at!)} className="tabular">
            {formatDateTime(item.closed_at!).split(",")[0]}
          </time>
          . El caso queda de solo lectura: se puede comentar{canWork ? " o reabrir" : ""}.
        </p>
      )}
      {!canWork && !isClosed && (
        <p className="rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          Puedes ver y comentar este caso. Los cambios los hace su responsable o el equipo de
          Calidad.
        </p>
      )}

      {dialog === "status" && (
        <StatusDialog item={item} catalog={catalog} open onOpenChange={() => setDialog(null)} />
      )}
      {dialog === "assign" && (
        <AssignDialog item={item} open onOpenChange={() => setDialog(null)} />
      )}
      {dialog === "edit" && (
        <EditCaseDialog item={item} catalog={catalog} open onOpenChange={() => setDialog(null)} />
      )}
    </header>
  );
}

function CaseFacts({ item }: { item: PqrsfCase }) {
  const legacy = legacyAssignee(item);
  const facts: [string, React.ReactNode][] = [
    [
      "Responsable",
      item.assignee ? (
        personName(item.assignee)
      ) : legacy ? (
        <>
          <span className="block">Sin asignar</span>
          <span className="block text-[13px] text-text-secondary">
            Responsable (histórico): {legacy}
          </span>
        </>
      ) : (
        <span className="text-text-secondary">Sin asignar</span>
      ),
    ],
    ["Cliente", item.customer_name],
    ["NIT", item.customer_nit && <span className="tabular">{item.customer_nit}</span>],
    ["Ejecutivo comercial", item.sales_executive_name],
    [
      "Usuario solicitante",
      item.requester_name || item.requester_email ? (
        <>
          {item.requester_name && <span className="block">{item.requester_name}</span>}
          {item.requester_email && (
            <span className="block text-[13px] break-all text-text-secondary">
              {item.requester_email}
            </span>
          )}
        </>
      ) : null,
    ],
    ["Proveedor", item.supplier_name],
    ["Dependencia", item.dependency?.name],
    ["Sucursal", item.site?.name],
    ["Fecha de recepción", <span key="r" className="tabular">{formatDate(item.received_on)}</span>],
    ["Registrado por", item.created_by ? personName(item.created_by) : "Sistema"],
  ];

  return (
    <aside
      aria-labelledby="facts-heading"
      className="h-fit rounded-lg border border-border p-4 2xl:col-start-2 2xl:row-start-1"
    >
      <h2 id="facts-heading" className="mb-3 text-base font-semibold">
        Datos del caso
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4 2xl:grid-cols-1">
        {facts.map(([label, value]) => (
          <div key={label} className="space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="min-w-0 break-words">
              {value || <span className="text-text-secondary">Sin dato</span>}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Cargando caso</span>
      <div className="h-4 w-32 animate-pulse rounded-sm bg-canvas-subtle" />
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
      </div>
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" />
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-9 bg-canvas-subtle" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex h-10 items-center gap-4 border-t border-border px-3">
              <div className="h-3 w-1/3 animate-pulse rounded-sm bg-canvas-subtle" />
              <div className="ml-auto h-3 w-20 animate-pulse rounded-sm bg-canvas-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

