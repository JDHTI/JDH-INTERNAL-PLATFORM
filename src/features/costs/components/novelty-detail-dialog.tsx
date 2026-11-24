"use client";

import { useState } from "react";
import { Eye, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { formatCop, formatDay, formatNumber, formatPct, formatWhen } from "@/features/supports/lib/format";

import { useCostReasons, useDetachCreditNote, useNovelty, useSetNoveltyReason } from "../hooks/use-costs";
import { ENTRY_STATUS, NOVELTY_STATUS, formatCo, formatSignedCop, formatSignedPct } from "../lib/format";
import type { CostPermissions, NoveltyDetail, NoveltyEvent, NoveltyKind } from "../types/costs.types";
import CreditNotePreview from "./credit-note-preview";
import ReasonPicker from "./reason-picker";

const KIND_LABELS: Record<NoveltyKind, string> = {
  diferencia: "diferencia con la cotización",
  sin_cotizacion: "sin cotización",
  sin_novedad: "ya no es novedad",
};

const kindText = (value: unknown) => (typeof value === "string" && value in KIND_LABELS ? KIND_LABELS[value as NoveltyKind] : null);
const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

/** One history line in words; the data keys are the ones the API writes with each event. */
function describeEvent(event: NoveltyEvent): string {
  const data = event.data;
  switch (event.event_type) {
    case "detectada":
      return kindText(data.kind) ? `Detectada: ${kindText(data.kind)}` : "Detectada";
    case "motivo":
      return text(data.reason) ? `Motivo: ${text(data.reason)}` : "Quitó el motivo";
    case "nota_credito":
      return `Nota crédito ${text(data.number) ?? ""} por ${formatCop(data.amount as string | null)}${data.reused ? ", con el soporte que ya tenía el proveedor" : ""}`;
    case "nota_credito_quitada":
      return `Quitó la nota crédito ${text(data.number) ?? ""}`.trim();
    case "anulada":
      return "Anulada: el documento ya no está en el DWH";
    case "reactivada":
      return "Volvió: la línea reapareció en el DWH";
    case "releida":
      return kindText(data.kind) ? `Releída del DWH: ${kindText(data.kind)}` : "Releída del DWH";
    default:
      return event.event_type;
  }
}

/**
 * A novelty whole: the entry line, its status (which follows from the reason
 * and the credit note, never set by hand), the credit note and the history.
 */
export default function NoveltyDetailDialog({
  noveltyId,
  permissions,
  onRegisterNote,
  onClose,
}: {
  noveltyId: string | null;
  permissions: CostPermissions;
  onRegisterNote: (novelty: NoveltyDetail) => void;
  onClose: () => void;
}) {
  const query = useNovelty(noveltyId);
  const novelty = query.data;
  return (
    <Dialog
      open={noveltyId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={novelty ? ["Novedad", novelty.line.document, `referencia ${novelty.line.sku}`].filter(Boolean).join(" · ") : "Novedad"}
      description={novelty?.line.description ?? undefined}
      wide
    >
      {query.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la novedad" />
      ) : query.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-danger">
            {errorMessage(query.error)}
          </p>
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        </div>
      ) : (
        <NoveltyBody novelty={query.data} permissions={permissions} onRegisterNote={onRegisterNote} />
      )}
    </Dialog>
  );
}

function NoveltyBody({
  novelty,
  permissions,
  onRegisterNote,
}: {
  novelty: NoveltyDetail;
  permissions: CostPermissions;
  onRegisterNote: (novelty: NoveltyDetail) => void;
}) {
  const [previewing, setPreviewing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const reasons = useCostReasons();
  const saveReason = useSetNoveltyReason();
  const detach = useDetachCreditNote();
  const line = novelty.line;
  const status = NOVELTY_STATUS[novelty.status];
  const manages = permissions.modules["novedades-compras"]?.can_manage === true;
  const note = novelty.credit_note;

  const facts: [string, React.ReactNode][] = [
    ["Fecha de entrada", formatDay(line.entry_date)],
    ["C.O. y bodega", `${formatCo(line.co)}${line.regional_name ? ` (${line.regional_name})` : ""} · ${line.warehouse ?? "—"}`],
    ["Documento", [line.document, line.purchase_order && `OC ${line.purchase_order}`, line.invoice_ref && `Factura ${line.invoice_ref}`].filter(Boolean).join(" · ") || "—"],
    ["Proveedor", `${line.supplier_name ?? "—"}${line.supplier_nit ? ` · NIT ${line.supplier_nit}` : ""}`],
    ["Cantidad", `${formatNumber(line.quantity)}${line.unit ? ` ${line.unit}` : ""}`],
    ["Precio de compra: actual", formatCop(line.unit_price)],
    ["Anterior y antepenúltimo", `${formatCop(line.previous_price)} · ${formatCop(line.antepenultimate_price)}`],
    ["Cotización (menos Tasa 1)", `${formatCop(line.quotation)}${line.quotation_since ? `, vigente desde el ${formatDay(line.quotation_since)}` : ""}`],
    ["Lista y Tasa 1", `${formatCop(line.quotation_list_price)} · ${formatPct(line.discount_pct)}`],
    ["Diferencia", `${formatSignedCop(line.difference)} (${formatSignedPct(line.difference_pct)})`],
    ["Diferencia por la cantidad", formatSignedCop(line.amount)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{novelty.status_label}</Badge>
        <Badge tone={ENTRY_STATUS[line.status].tone}>{novelty.kind_label}</Badge>
        <span className="text-[13px] text-text-secondary">{status.help}</span>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="novelty-reason" className="space-y-2">
        <h3 id="novelty-reason" className="text-sm font-semibold">
          Motivo
        </h3>
        {permissions.can_set_reasons && !novelty.voided ? (
          <div className="max-w-sm">
            <ReasonPicker
              reasons={reasons.data}
              value={novelty.reason?.id ?? null}
              valueName={novelty.reason?.name}
              saving={saveReason.isPending}
              label="Motivo de la novedad"
              className="h-9 px-2 text-sm"
              onChange={(reasonId) =>
                saveReason.mutate(
                  { id: novelty.id, reasonId },
                  { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
                )
              }
            />
          </div>
        ) : (
          <p className="text-sm">{novelty.reason?.name ?? <span className="text-text-secondary">Sin motivo</span>}</p>
        )}
        {novelty.reason_by && (
          <p className="text-xs text-text-secondary">
            Lo puso {novelty.reason_by} el {formatWhen(novelty.reason_at)}
          </p>
        )}
      </section>

      <section aria-labelledby="novelty-note" className="space-y-2">
        <h3 id="novelty-note" className="text-sm font-semibold">
          Nota crédito
        </h3>
        {note ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <p className="font-medium tabular-nums">
                  {note.number} · {formatCop(note.amount)}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {note.original_filename} · {formatBytes(note.size_bytes)} · {note.registered_by}, {formatWhen(note.registered_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setPreviewing(true)}>
                <Eye aria-hidden="true" /> Ver soporte
              </Button>
              {manages && (
                <Button variant="danger" size="sm" className="max-md:h-11" onClick={() => setRemoving(true)}>
                  <Trash2 aria-hidden="true" /> Quitar
                </Button>
              )}
            </div>
          </div>
        ) : manages && !novelty.voided ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => onRegisterNote(novelty)}>
              <Plus aria-hidden="true" /> Registrar nota crédito
            </Button>
            {novelty.reason?.requires_credit_note && (
              <span className="text-[13px] text-text-secondary">Su motivo la pide para quedar resuelta.</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Sin nota crédito.</p>
        )}
      </section>

      <section aria-labelledby="novelty-history" className="space-y-2">
        <h3 id="novelty-history" className="text-sm font-semibold">
          Historial
        </h3>
        {novelty.events.length === 0 ? (
          <p className="text-sm text-text-secondary">Sin movimientos.</p>
        ) : (
          <ol className="divide-y divide-border rounded-md border border-border">
            {novelty.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2 text-sm">
                <span>{describeEvent(event)}</span>
                <span className="text-xs tabular-nums text-text-secondary">
                  {event.actor ?? "Sincronización del DWH"} · {formatWhen(event.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {previewing && note && <CreditNotePreview noveltyId={novelty.id} note={note} onClose={() => setPreviewing(false)} />}
      <ConfirmDeleteDialog
        open={removing}
        onOpenChange={(open) => {
          setRemoving(open);
          if (!open) detach.reset();
        }}
        title={`¿Quitar la nota crédito ${note?.number ?? ""}?`}
        confirmLabel={detach.isPending ? "Quitando…" : "Quitar nota crédito"}
        isPending={detach.isPending}
        error={detach.isError ? errorMessage(detach.error) : null}
        onConfirm={() => detach.mutate(novelty.id, { onSuccess: () => setRemoving(false) })}
      >
        El estado de la novedad se recalcula con su motivo. Si ninguna otra línea usa esta nota, su soporte se borra.
      </ConfirmDeleteDialog>
    </div>
  );
}
