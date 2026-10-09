"use client";

import Link from "next/link";
import { CloudOff, FileQuestion, Loader2, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useDeliveryDetail, useRetryDelivery } from "../hooks/use-pqrsf";
import { formatDateTime, personName } from "../lib/format";

const STATUS_BADGE = {
  pending: { label: "Envío pendiente", tone: "neutral" },
  sent: { label: "Documentos enviados", tone: "success" },
  failed: { label: "Envío fallido", tone: "danger" },
} as const;

export default function DeliveryDetailScreen({
  area,
  deliveryId,
}: {
  area: string;
  deliveryId: string;
}) {
  const detail = useDeliveryDetail(deliveryId);
  const retry = useRetryDelivery(deliveryId);
  const item = detail.data;
  useBreadcrumbLabel(`/${area}/pqrsf/solicitudes-documentos/${deliveryId}`, item?.full_name);

  if (detail.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Cargando</span>
        <div className="h-8 w-1/2 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-40 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }

  if (detail.error || !item) {
    const raw = detail.error instanceof ApiError ? detail.error.status : 0;
    const status = raw === 422 ? 404 : raw;
    return status === 404 ? (
      <StatePanel icon={FileQuestion} title="Esta solicitud no existe">
        El enlace puede estar incompleto. Búscala desde el listado.
      </StatePanel>
    ) : status === 403 ? (
      <StatePanel icon={Lock} title="Esta vista es para quienes gestionan PQRSF">
        Pide acceso al área de Calidad si necesitas revisarla.
      </StatePanel>
    ) : (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="La plataforma no respondió"
        action={
          <Button variant="outline" onClick={() => detail.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(detail.error)}
      </StatePanel>
    );
  }

  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;

  const fields: [string, string | null][] = [
    ["Nombre", item.full_name],
    ["Empresa", item.business_name],
    ["NIT", item.nit],
    ["Correo", item.email],
    ["Sede", item.site?.name ?? null],
    ["Recibido", formatDateTime(item.created_at)],
    ["Enviado", item.sent_at ? formatDateTime(item.sent_at) : null],
    [
      "Leído",
      item.read_at
        ? `${formatDateTime(item.read_at)}${item.read_by ? ` por ${personName(item.read_by)}` : ""}`
        : null,
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitud de {item.full_name}</h1>
      </div>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[13px] text-text-secondary">{label}</dt>
              <dd className="text-sm break-words">{value}</dd>
            </div>
          ))}
      </dl>

      {item.status === "failed" && (
        <section aria-labelledby="delivery-error" className="space-y-2">
          <h2 id="delivery-error" className="text-base font-semibold">
            El envío falló
          </h2>
          {item.error && (
            <p role="alert" className="text-sm text-danger">
              {item.error}
            </p>
          )}
          <Button
            variant="outline"
            disabled={retry.isPending}
            onClick={() =>
              retry
                .mutateAsync()
                .then(() => toast.success("Reintento enviado."))
                .catch((error) => toast.error(errorMessage(error), { duration: Infinity }))
            }
          >
            {retry.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            Reintentar envío
          </Button>
        </section>
      )}

      {item.documents.length > 0 && (
        <section aria-labelledby="delivery-sent" className="space-y-2">
          <h2 id="delivery-sent" className="text-base font-semibold">
            Documentos enviados por correo ({item.documents.length})
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {item.documents.map((document) => (
              <li key={document.document_type_id} className="px-3 py-2.5">
                <p className="text-sm font-medium">{document.name}</p>
                <p className="tabular text-[13px] text-text-secondary">
                  {document.filename} · {formatBytes(document.size_bytes)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.manual_documents.length > 0 && (
        <section aria-labelledby="delivery-manual" className="space-y-2">
          <h2 id="delivery-manual" className="text-base font-semibold">
            Documentos que pasaron a un caso
          </h2>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {item.manual_documents.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          {item.case_code && (
            <p className="text-sm">
              Caso{" "}
              <Link
                href={`/${area}/pqrsf?q=${encodeURIComponent(item.case_code)}`}
                className="rounded-sm font-mono text-[13px] font-medium underline-offset-2 hover:underline"
              >
                {item.case_code}
              </Link>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
