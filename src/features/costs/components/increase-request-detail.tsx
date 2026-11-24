"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CloudOff, Download, Loader2, Pencil, RefreshCw, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { INCREASE_STATUS } from "@/features/commercial-masters/components/increase-format";
import { formatWhen } from "@/features/supports/lib/format";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import {
  useApproveIncreaseRequest,
  useDownloadRequestFile,
  useIncreaseRequest,
  useRejectIncreaseRequest,
  useUpdateRequestLine,
} from "../hooks/use-increase-requests";
import { REQUEST_STATUS } from "../lib/format";
import type { CostPermissions } from "../types/costs.types";
import type { IncreaseChange, IncreaseRequestDetail, RequestLine } from "../types/increase-requests.types";
import IncreaseLinesTable from "./increase-lines-table";
import LineEditDialog from "./line-edit-dialog";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * One request and its lines. While it is in review, a manager corrects a line
 * or leaves it out, then approves (the accepted lines reach the increase
 * ledger, pending in SIESA) or rejects with a reason (nothing reaches it).
 */
export default function IncreaseRequestDetailView({
  requestId,
  permissions,
  basePath,
}: {
  requestId: string;
  permissions: CostPermissions;
  basePath: string;
}) {
  const query = useIncreaseRequest(requestId);
  const back = (
    <Link
      href={basePath}
      className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Solicitudes de alza
    </Link>
  );

  if (query.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la solicitud" />
      </div>
    );
  }
  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        <StatePanel
          icon={CloudOff}
          tone={missing ? "neutral" : "danger"}
          title={missing ? "Esta solicitud no existe" : "No se pudo cargar la solicitud"}
          action={
            missing ? undefined : (
              <Button variant="outline" onClick={() => query.refetch()}>
                <RefreshCw aria-hidden="true" /> Reintentar
              </Button>
            )
          }
        >
          {missing ? "Vuelve a la lista de solicitudes." : errorMessage(query.error)}
        </StatePanel>
      </div>
    );
  }
  return <Detail request={query.data} manages={permissions.modules["alzas-proveedor"]?.can_manage === true} back={back} />;
}

function Detail({ request, manages, back }: { request: IncreaseRequestDetail; manages: boolean; back: React.ReactNode }) {
  const [editing, setEditing] = useState<RequestLine | null>(null);
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const toggle = useUpdateRequestLine();
  const file = useDownloadRequestFile();
  const reviewing = request.status === "en_revision" && manages;
  const look = REQUEST_STATUS[request.status];
  const accepted = request.lines.filter((line) => line.accepted);
  const byChange = (change: IncreaseChange) => accepted.filter((line) => line.change === change).length;

  const setAccepted = (line: RequestLine, value: boolean) =>
    toggle.mutate(
      { id: request.id, lineId: line.id, patch: { accepted: value } },
      { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
    );

  return (
    <div className="space-y-4">
      {back}
      <section aria-label="Resumen de la solicitud" className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{request.supplier_name ?? request.supplier_code}</h2>
              <Badge tone={look.tone}>{request.status_label}</Badge>
            </div>
            <p className="text-sm text-text-secondary">
              Código {request.supplier_code} · {request.source === "plantilla" ? "MAESTRA cargada" : "Digitada"} por {request.created_by},{" "}
              {formatWhen(request.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {request.has_file && (
              <Button
                variant="outline"
                className="max-md:h-11"
                disabled={file.isPending}
                onClick={() =>
                  file.mutate(
                    { id: request.id, name: request.file_name ?? "MAESTRA.xlsx" },
                    { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
                  )
                }
              >
                {file.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                Libro del proveedor
              </Button>
            )}
            {reviewing && (
              <>
                <Button variant="danger" className="max-md:h-11" onClick={() => setDeciding("reject")}>
                  <X aria-hidden="true" /> Rechazar
                </Button>
                <Button className="max-md:h-11" onClick={() => setDeciding("approve")} disabled={accepted.length === 0}>
                  <Check aria-hidden="true" /> Aprobar
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm tabular-nums">
          {numberFormat.format(accepted.length)} de {numberFormat.format(request.lines.length)} referencias incluidas ·{" "}
          {(["subio", "bajo", "estable"] as const).map((change, index) => (
            <span key={change}>
              {index > 0 && ", "}
              {numberFormat.format(byChange(change))} {INCREASE_STATUS[change].label.toLowerCase()}
            </span>
          ))}
        </p>
        {request.note && (
          <p className="text-sm">
            <span className="text-text-secondary">Nota: </span>
            {request.note}
          </p>
        )}
        {request.decided_by && (
          <p className="text-sm">
            <span className="text-text-secondary">
              {request.status === "aprobada" ? "Aprobada" : "Rechazada"} por {request.decided_by}, {formatWhen(request.decided_at)}
              {request.decision_note ? ": " : ""}
            </span>
            {request.decision_note}
          </p>
        )}
        {request.status === "aprobada" && (
          <p className="text-[13px] text-text-secondary">
            Las referencias incluidas están en el acumulado de alzas, pendientes en SIESA: el cotizador ya compara su costo nuevo.
          </p>
        )}
      </section>

      <IncreaseLinesTable
        lines={request.lines}
        caption={`Referencias de la solicitud de ${request.supplier_name ?? request.supplier_code}`}
        showRow={request.source === "plantilla"}
        actions={
          reviewing
            ? (line) => (
                <span className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 max-md:size-11"
                    onClick={() => setEditing(line)}
                    aria-label={`Corregir ${line.sku}`}
                    title="Corregir"
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 max-md:h-11"
                    disabled={toggle.isPending && toggle.variables?.lineId === line.id}
                    onClick={() => setAccepted(line, !line.accepted)}
                    aria-label={line.accepted ? `Dejar ${line.sku} por fuera` : `Incluir ${line.sku} de nuevo`}
                  >
                    {line.accepted ? (
                      <>
                        <X aria-hidden="true" /> Dejar por fuera
                      </>
                    ) : (
                      <>
                        <Undo2 aria-hidden="true" /> Incluir
                      </>
                    )}
                  </Button>
                </span>
              )
            : undefined
        }
      />

      <LineEditDialog requestId={request.id} line={editing} onClose={() => setEditing(null)} />
      <DecisionDialog request={request} acceptedCount={accepted.length} kind={deciding} onClose={() => setDeciding(null)} />
    </div>
  );
}

function DecisionDialog({
  request,
  acceptedCount,
  kind,
  onClose,
}: {
  request: IncreaseRequestDetail;
  acceptedCount: number;
  kind: "approve" | "reject" | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      narrow
      title={kind === "reject" ? "Rechazar la solicitud" : "Aprobar la solicitud"}
      description={
        kind === "reject"
          ? "Nada llega al acumulado de alzas. El motivo queda en la solicitud."
          : `${numberFormat.format(acceptedCount)} ${acceptedCount === 1 ? "referencia pasa" : "referencias pasan"} al acumulado de alzas, pendientes en SIESA. Las que dejaste por fuera no.`
      }
    >
      {kind && <DecisionForm key={kind} request={request} kind={kind} onClose={onClose} />}
    </Dialog>
  );
}

function DecisionForm({ request, kind, onClose }: { request: IncreaseRequestDetail; kind: "approve" | "reject"; onClose: () => void }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const approve = useApproveIncreaseRequest();
  const reject = useRejectIncreaseRequest();
  const action = kind === "approve" ? approve : reject;
  const noteError = kind === "reject" && note.trim() === "" ? "Escribe por qué se rechaza; queda escrito en la solicitud." : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (noteError) return;
    action.mutate(
      { id: request.id, note },
      {
        onSuccess: () => {
          toast.success(kind === "approve" ? "Solicitud aprobada: sus alzas están en el acumulado." : "Solicitud rechazada.");
          onClose();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label={kind === "reject" ? "Motivo del rechazo" : "Nota"} htmlFor={id} optional={kind === "approve"} error={touched ? noteError : null}>
        <Textarea
          id={id}
          value={note}
          maxLength={500}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={(touched && noteError !== null) || undefined}
        />
      </Field>
      <DialogError message={action.isError ? errorMessage(action.error) : null} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={action.isPending} variant={kind === "reject" ? "danger" : "primary"}>
          {action.isPending ? (kind === "approve" ? "Aprobando…" : "Rechazando…") : kind === "approve" ? "Aprobar" : "Rechazar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
