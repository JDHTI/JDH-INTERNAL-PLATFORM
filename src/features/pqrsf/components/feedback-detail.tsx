"use client";

import { useState } from "react";
import {
  Clock,
  CloudOff,
  Download,
  Eye,
  FileQuestion,
  Heart,
  Lightbulb,
  Loader2,
  Lock,
  MailCheck,
  MailWarning,
  MailX,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useFeedbackDetail } from "../hooks/use-pqrsf";
import { formatDateTime, originLabel, personName, stripCid } from "../lib/format";
import { downloadFeedbackFile, getFeedbackFileBlob } from "../services/pqrsf.service";
import type { CaseFile, FeedbackReply } from "../types/pqrsf.types";
import { canPreview, FileIcon, Preview } from "./case-files";

const REPLY_TEXT: Record<FeedbackReply["status"], { label: string; tone: "neutral" | "success" | "danger" }> = {
  pending: { label: "Respuesta automática pendiente", tone: "neutral" },
  sent: { label: "Respuesta automática enviada", tone: "success" },
  failed: { label: "Respuesta automática fallida", tone: "danger" },
  skipped: { label: "Sin respuesta automática", tone: "neutral" },
};

const SKIPPED_REASONS: Record<string, string> = {
  recipient_limit: "Ese correo ya recibió demasiadas respuestas automáticas hoy.",
  same_conversation: "Ya se respondió a este correo en la misma conversación.",
  disabled: "Las respuestas automáticas están apagadas.",
};

const REPLY_ICONS: Record<FeedbackReply["status"], { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: "text-text-secondary" },
  sent: { icon: MailCheck, className: "text-success" },
  failed: { icon: MailWarning, className: "text-danger" },
  skipped: { icon: MailX, className: "text-text-secondary" },
};

/**
 * The automatic acknowledgement the sender got, or why they did not get one.
 * `compact` is the list's icon alone; the words stay in the tooltip and for
 * screen readers, so the state never depends on the icon's color.
 */
export function ReplyBadge({
  reply,
  compact = false,
}: {
  reply: FeedbackReply;
  compact?: boolean;
}) {
  const status = REPLY_TEXT[reply.status] ? reply.status : "pending";
  const { label, tone } = REPLY_TEXT[status];
  const title =
    status === "skipped"
      ? (SKIPPED_REASONS[reply.skipped_reason ?? ""] ?? "No se envió respuesta automática.")
      : reply.sent_at
        ? `Enviada el ${formatDateTime(reply.sent_at)}`
        : undefined;

  if (compact) {
    const { icon: Icon, className } = REPLY_ICONS[status];
    return (
      <span className="inline-flex items-center" title={title ? `${label}. ${title}` : label}>
        <Icon className={cn("size-4", className)} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Badge tone={tone} title={title}>
      {label}
    </Badge>
  );
}

/** Compliments and suggestions read apart at a glance: the icon is the kind. */
export function KindIcon({ code, name, unread }: { code: string; name: string; unread: boolean }) {
  const isCompliment = code === "felicitacion";
  const Icon = isCompliment ? Heart : Lightbulb;
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        unread
          ? isCompliment
            ? "bg-success-badge text-success"
            : "bg-info-badge text-info"
          : "text-text-secondary"
      )}
      title={`${name}${unread ? " sin leer" : ""}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">
        {name}
        {unread ? ", sin leer" : ""}
      </span>
    </span>
  );
}

export default function FeedbackDetailScreen({
  area,
  feedbackId,
}: {
  area: string;
  feedbackId: string;
}) {
  const detail = useFeedbackDetail(feedbackId);
  const item = detail.data;
  useBreadcrumbLabel(
    `/${area}/pqrsf/sugerencias/${feedbackId}`,
    item ? (item.subject ? stripCid(item.subject) : item.full_name) : undefined
  );
  const [previewing, setPreviewing] = useState<CaseFile | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

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
    return (
      <div className="space-y-4">
        {status === 404 ? (
          <StatePanel icon={FileQuestion} title="Este mensaje no existe">
            El enlace puede estar incompleto. Búscalo desde el listado.
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
        )}
      </div>
    );
  }

  const download = async (file: CaseFile) => {
    setDownloading(file.id);
    try {
      await downloadFeedbackFile(item.id, file.id, file.filename);
    } catch (error) {
      toast.error(errorMessage(error), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  const fields: [string, string | null][] = [
    ["Nombre", item.full_name],
    ["Empresa", item.business_name],
    ["Correo", item.email],
    ["Sede", item.site?.name ?? null],
    ["Origen", originLabel(item.origin)],
    ["Recibido", formatDateTime(item.created_at)],
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={item.kind.code === "felicitacion" ? "success" : "info"}>{item.kind.name}</Badge>
          <ReplyBadge reply={item.reply} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {item.subject ? stripCid(item.subject) : `${item.kind.name} de ${item.full_name}`}
        </h1>
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

      <section aria-labelledby="feedback-body" className="space-y-2">
        <h2 id="feedback-body" className="text-base font-semibold">
          Mensaje
        </h2>
        <p className="rounded-lg border border-border px-4 py-3 text-sm whitespace-pre-wrap">
          {stripCid(item.body)}
        </p>
      </section>

      {item.files.length > 0 && (
        <section aria-labelledby="feedback-files" className="space-y-3">
          <div className="space-y-0.5">
            <h2 id="feedback-files" className="text-base font-semibold">
              Archivos ({item.files.length})
            </h2>
            <p className="text-[13px] text-text-secondary">
              Las imágenes y los PDF se abren aquí; los demás archivos se descargan.
            </p>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {item.files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileIcon file={file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.filename}>
                    {file.filename}
                  </p>
                  <p className="tabular text-[13px] text-text-secondary">
                    {formatBytes(file.size_bytes)} · {formatDateTime(file.created_at)}
                  </p>
                </div>
                {canPreview(file) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:h-11"
                    onClick={() => setPreviewing(file)}
                    aria-label={`Abrir ${file.filename}`}
                  >
                    <Eye aria-hidden="true" />
                    Abrir
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="max-md:h-11"
                  disabled={downloading === file.id}
                  onClick={() => download(file)}
                  aria-label={`Descargar ${file.filename}`}
                >
                  {downloading === file.id ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  Descargar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {previewing && (
        <Preview
          caseId={item.id}
          file={previewing}
          load={getFeedbackFileBlob}
          onDownload={() => download(previewing)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
