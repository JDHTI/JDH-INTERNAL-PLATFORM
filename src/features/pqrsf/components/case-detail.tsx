"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CloudOff,
  Copy,
  FileQuestion,
  Lock,
  Pencil,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
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
  stripCid,
} from "../lib/format";
import { inboxHref } from "../lib/inbox-state";
import type {
  IntakeRequest,
  PqrsfCase,
  SalesExecutive,
  TrackingCatalog,
} from "../types/pqrsf.types";
import { DueLabel, NewsBadge } from "./case-badges";
import CaseClassification from "./case-classification";
import { AssignDialog, DeleteCaseDialog, EditCaseDialog, StatusDialog } from "./case-dialogs";
import CaseItems from "./case-items";
import CaseProducts from "./case-products";
import CaseTimeline from "./case-timeline";
import CaseFiles from "./case-files";
import IntakeRequestSection from "./intake-request";
import { StatusMenu } from "./status-menu";
import SupplierMessageDialog from "./supplier-message-dialog";

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
  // Email cases often carry the subject again as the first line of the body.
  const subject = item.subject ? stripCid(item.subject) : null;
  let description = item.description ? stripCid(item.description) : "";
  if (subject && description.toLowerCase().startsWith(subject.toLowerCase())) {
    description = description.slice(subject.length).trim();
  }
  // Requested documents only apply to request types that allow them
  // (Petición). A case that already has rows keeps showing them.
  const showsDocuments =
    item.items.length > 0 ||
    catalog.data.request_types.find((type) => type.id === item.request_type.id)
      ?.allows_document_request === true;
  return (
    <div className="space-y-6">
      {back}
      <CaseHeader area={area} item={item} request={request} catalog={catalog.data} />

      {/* The facts sit beside the work only on very wide screens. Below that
          they become a strip on top, so the documents table keeps the full
          width its nine columns need. */}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CaseFacts item={item} />
        <div className="min-w-0 space-y-8 2xl:row-start-1">
          {(subject || description) && (
            <section aria-labelledby="subject-heading" className="space-y-1">
              <h2 id="subject-heading" className="text-base font-semibold">
                {subject ?? "Descripción"}
              </h2>
              {description && (
                <p className="max-w-prose text-sm whitespace-pre-wrap">{description}</p>
              )}
            </section>
          )}
          <CaseClassification item={item} />
          <CaseProducts item={item} />
          {showsDocuments && <CaseItems item={item} catalog={catalog.data} />}
          {request && <IntakeRequestSection caseId={item.id} request={request} />}
          <CaseFiles caseId={item.id} />
          <CaseTimeline item={item} events={events} />
        </div>
      </div>
    </div>
  );
}

function CaseHeader({
  area,
  item,
  request,
  catalog,
}: {
  area: string;
  item: PqrsfCase;
  request: IntakeRequest | null;
  catalog: TrackingCatalog;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    "status" | "assign" | "edit" | "delete" | "supplier" | null
  >(null);
  const [statusTarget, setStatusTarget] = useState<string | undefined>();
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
            <StatusMenu
              item={item}
              catalog={catalog}
              onNeedsDialog={(statusId) => {
                setStatusTarget(statusId);
                setDialog("status");
              }}
            />
            <NewsBadge newsAt={item.news_at} />
          </div>
          <p className="text-sm text-text-secondary">
            {item.request_type.name} · {originLabel(item.origin)} · Recibido el{" "}
            <span className="tabular">{formatDate(item.received_on)}</span>
            {/* Numbers people may still quote: the code before the per-site
                numbering and, for imported cases, the P.13.F.01 number. */}
            {item.legacy?.previous_code && (
              <>
                {" "}· Antes <span className="font-mono">{item.legacy.previous_code}</span>
              </>
            )}
            {item.legacy?.original_consecutive != null && (
              <>
                {" "}· Consecutivo Excel{" "}
                <span className="tabular">{String(item.legacy.original_consecutive)}</span>
              </>
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
          {canWork && !isClosed && (
            <Button variant="outline" className="max-md:h-11" onClick={() => setDialog("supplier")}>
              <Truck aria-hidden="true" />
              Escribir al proveedor
            </Button>
          )}
          {canAssign && !isClosed && (
            <Button variant="secondary" className="max-md:h-11" onClick={() => setDialog("assign")}>
              <UserRound aria-hidden="true" />
              {item.assignee ? "Reasignar" : "Asignar"}
            </Button>
          )}
          {/* Tinted, not solid: the solid red is saved for the confirmation. */}
          {item.permissions.can_delete && (
            <Button variant="danger" className="max-md:h-11" onClick={() => setDialog("delete")}>
              <Trash2 aria-hidden="true" />
              Eliminar
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
          . El caso queda de solo lectura: se puede comentar
          {canWork ? " o reabrir desde su estado" : ""}.
        </p>
      )}
      {!canWork && !isClosed && (
        <p className="rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          Puedes ver y comentar este caso. Los cambios los hace su responsable o el equipo de
          Calidad.
        </p>
      )}

      {dialog === "status" && (
        <StatusDialog
          item={item}
          catalog={catalog}
          initialStatusId={statusTarget}
          open
          onOpenChange={() => setDialog(null)}
        />
      )}
      {dialog === "assign" && (
        <AssignDialog item={item} open onOpenChange={() => setDialog(null)} />
      )}
      {dialog === "edit" && (
        <EditCaseDialog item={item} catalog={catalog} open onOpenChange={() => setDialog(null)} />
      )}
      {dialog === "supplier" && (
        <SupplierMessageDialog item={item} request={request} onClose={() => setDialog(null)} />
      )}
      {dialog === "delete" && (
        <DeleteCaseDialog
          item={item}
          open
          onOpenChange={() => setDialog(null)}
          onDeleted={() => router.replace(inboxHref(area))}
        />
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
    ["Ejecutivo comercial", <SalesExecutiveFact key="se" item={item} />],
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

const SALES_EXECUTIVE_SOURCES: Record<NonNullable<SalesExecutive["source"]>, string> = {
  invoice: "De la factura",
  internal: "Del comercial",
  manual: "Escrito a mano",
};

/**
 * Who sold the invoice: the name, the seller code to look them up in the ERP,
 * and where it came from, because a typed name is not the sales record.
 */
function SalesExecutiveFact({ item }: { item: PqrsfCase }) {
  const executive = item.sales_executive;
  const name = executive?.name ?? item.sales_executive_name;
  if (!name) return null;
  const details = [
    executive?.code ? `Código ${executive.code}` : null,
    executive?.source ? SALES_EXECUTIVE_SOURCES[executive.source] : null,
  ].filter(Boolean);
  return (
    <>
      <span className="block">{name}</span>
      {details.length > 0 && (
        <span className="block text-[13px] text-text-secondary">{details.join(" · ")}</span>
      )}
      {executive?.email && (
        <span className="block text-[13px] break-all text-text-secondary">{executive.email}</span>
      )}
    </>
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

