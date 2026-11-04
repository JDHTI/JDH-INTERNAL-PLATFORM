"use client";

import { useEffect, useState } from "react";
import { Download, FileText, ImageOff, Loader2, Video } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import { formatDate, formatDateTime } from "../lib/format";
import { pickupOrderText } from "../lib/pickup-order";
import { downloadAttachment, getAttachmentBlob } from "../services/pqrsf.service";
import type { IntakeAttachment, IntakeRequest } from "../types/pqrsf.types";

/**
 * What the customer filed through the public form, unchanged. It is the
 * evidence of the request, so it is shown read-only and apart from the case
 * data the team edits.
 */
export default function IntakeRequestSection({
  caseId,
  request,
}: {
  caseId: string;
  request: IntakeRequest;
}) {
  const rows: [string, string][] = [
    ["Nombre", request.full_name],
    ["Razón social", request.business_name],
    ["NIT", request.nit],
    ["Correo", request.email],
    ["Dirección", `${request.address}, ${request.city} (${request.department})`],
    ["Sede", request.site.name],
  ];
  if (request.selected_area) rows.push(["Área elegida", request.selected_area.name]);
  if (request.selected_subject) rows.push(["Asunto", request.selected_subject.name]);
  if (request.selected_cause) rows.push(["Causal", request.selected_cause.name]);
  // With a subject from the list, the written one only complements an «Otro».
  if (request.subject) {
    rows.push([request.selected_subject ? "Asunto escrito" : "Asunto", request.subject]);
  }
  if (request.document_request) rows.push(["Tipo de petición", "Solicitud de documentos"]);
  if (request.pickup_order_requested) {
    rows.push([
      "Orden de recogida",
      pickupOrderText(request.pickup_order_requested, request.pickup_order_number),
    ]);
  }
  if (request.delivery_date) rows.push(["Fecha de entrega", formatDate(request.delivery_date)]);
  const products = request.products ?? [];

  return (
    <section aria-labelledby="intake-heading" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="intake-heading" className="text-base font-semibold">
          Solicitud original
        </h2>
        <p className="text-[13px] text-text-secondary">
          Radicada en el formulario público el {formatDateTime(request.created_at)} ·{" "}
          <span className="font-mono">{request.reference}</span>
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-border p-4">
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-text-secondary">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {request.description && (
          <div className="space-y-1">
            <h3 className="text-[13px] font-medium">Descripción del cliente</h3>
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
          </div>
        )}
        {products.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-medium">Productos afectados ({products.length})</h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {products.map((product, index) => (
                <li key={`${product.sku}-${product.lot}-${index}`} className="space-y-2 px-3 py-2.5">
                  <p className="min-w-0 text-sm">
                    <span className="font-mono text-[13px]">{product.sku}</span>
                    {product.description && (
                      <span className="break-words"> · {product.description}</span>
                    )}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-4">
                    <ProductFact label="Factura" value={product.invoice_number} mono />
                    <ProductFact label="Lote" value={product.lot} mono />
                    <ProductFact label="Vence" value={formatDate(product.expiry_date)} />
                    <ProductFact label="Cantidad afectada" value={String(product.affected_quantity)} />
                    <div className="col-span-2 min-w-0 sm:col-span-4">
                      <dt className="text-text-secondary">Proveedor</dt>
                      <dd className="break-words">
                        {product.supplier_name ?? product.supplier_code ?? "Sin proveedor en el maestro"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}
        {request.attachments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-medium">Adjuntos ({request.attachments.length})</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {request.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <Thumbnail caseId={caseId} attachment={attachment} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={mono ? "break-words font-mono" : "tabular"}>{value}</dd>
    </div>
  );
}

export function Thumbnail({ caseId, attachment }: { caseId: string; attachment: IntakeAttachment }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isDownloading, setDownloading] = useState(false);
  const isImage = attachment.content_type.startsWith("image/");

  // Attachments sit behind the session, so the image cannot be a plain URL:
  // it is fetched with credentials and shown from a local object URL.
  useEffect(() => {
    if (!isImage) return;
    let url: string | null = null;
    let cancelled = false;
    getAttachmentBlob(caseId, attachment.id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [caseId, attachment.id, isImage]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(caseId, attachment.id, attachment.original_filename);
    } catch (error) {
      toast.error(errorMessage(error), { duration: Infinity });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={isDownloading}
      aria-label={`Descargar ${attachment.original_filename}`}
      className="group block w-full overflow-hidden rounded-md border border-border text-left hover:border-border-control"
    >
      <span className="flex aspect-[4/3] items-center justify-center bg-canvas-subtle">
        {!isImage ? (
          <span className="flex flex-col items-center gap-1 text-text-secondary">
            {attachment.content_type.startsWith("video/") ? (
              <Video className="size-6" aria-hidden="true" />
            ) : (
              <FileText className="size-6" aria-hidden="true" />
            )}
            <span className="text-[13px] font-medium uppercase">{attachment.extension}</span>
          </span>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL, next/image cannot optimize it
          <img src={src} alt="" className="size-full object-cover" />
        ) : failed ? (
          <ImageOff className="size-6 text-text-secondary" aria-hidden="true" />
        ) : (
          <Loader2 className="size-5 animate-spin text-text-secondary" aria-hidden="true" />
        )}
      </span>
      <span className="flex items-center gap-2 px-2 py-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{attachment.original_filename}</span>
          <span className="tabular block text-[13px] text-text-secondary">
            {formatBytes(attachment.size_bytes)}
          </span>
        </span>
        {isDownloading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4 shrink-0 text-text-secondary group-hover:text-text-primary" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
