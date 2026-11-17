"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, FileText, Loader2, Pencil, Plus, RotateCw, Send, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  useCaseOms,
  useGenerateOm,
  useRetryOmPdf,
  useUploadEditedOm,
} from "../hooks/use-pqrsf";
import { formatDate, formatDateTime } from "../lib/format";
import { downloadOm, getAttachmentBlob, getOmPdfBlob } from "../services/pqrsf.service";
import type {
  ImprovementOpportunity,
  IntakeAttachment,
  IntakeRequest,
  PqrsfCase,
} from "../types/pqrsf.types";
import SupplierMessageDialog, { suppliersOf, type OmPreset } from "./supplier-message-dialog";

const MAX_PHOTOS = 6;
const OTHER_SUPPLIER = "__other__";
const ACTIONS_LIMIT = 2000;
const NOTE_LIMIT = 1000;

function suggestedMessage(item: PqrsfCase, om: ImprovementOpportunity): string {
  return `Buen día,\n\nAdjuntamos la oportunidad de mejora ${om.code} del caso ${item.code}, para su revisión y respuesta.\n\nQuedamos atentos.`;
}

/**
 * The improvement opportunity (OM, P.06.F.04) of the case: one per supplier,
 * filled from the case, previewed as PDF and sent to the supplier from here.
 * It shows to whoever sees the case once it exists; creating and changing it is
 * work on the open case.
 */
export default function CaseImprovement({
  item,
  request,
}: {
  item: PqrsfCase;
  request: IntakeRequest | null;
}) {
  const id = useId();
  const oms = useCaseOms(item.id);
  const [form, setForm] = useState<ImprovementOpportunity | "new" | null>(null);
  const [previewing, setPreviewing] = useState<ImprovementOpportunity | null>(null);
  const [sending, setSending] = useState<ImprovementOpportunity | null>(null);
  const canWork = item.permissions.can_work && item.closed_at === null;
  const list = oms.data ?? [];

  // Nothing to say about an OM that does not exist, to someone who cannot make it.
  if (!canWork && (oms.isPending || list.length === 0)) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-heading`} className="text-base font-semibold">
          Oportunidad de mejora
        </h2>
        {canWork && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setForm("new")}>
            <Plus aria-hidden="true" />
            {list.length === 0 ? "Generar la OM" : "OM para otro proveedor"}
          </Button>
        )}
      </div>

      {oms.isPending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando
        </p>
      ) : oms.isError ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-danger">
            {errorMessage(oms.error)}
          </p>
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => oms.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : list.length === 0 ? (
        <p className="max-w-prose text-sm text-text-secondary">
          Todavía no hay una OM. Se llena con los datos del caso y sale como PDF y Word; desde aquí
          se envía al proveedor.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((om) => (
            <OmCard
              key={om.id}
              item={item}
              om={om}
              canWork={canWork}
              onPreview={() => setPreviewing(om)}
              onEdit={() => setForm(om)}
              onSend={() => setSending(om)}
            />
          ))}
        </ul>
      )}

      {form && (
        <OmFormDialog
          key={form === "new" ? "new" : form.id}
          item={item}
          request={request}
          editing={form === "new" ? null : form}
          onClose={() => setForm(null)}
        />
      )}
      {previewing && <OmPdfDialog caseId={item.id} om={previewing} onClose={() => setPreviewing(null)} />}
      {sending && (
        <SupplierMessageDialog
          item={item}
          request={request}
          preset={
            {
              omId: sending.id,
              omCode: sending.code,
              supplierCode: sending.supplier_code,
              supplierName: sending.supplier_name,
              body: suggestedMessage(item, sending),
            } satisfies OmPreset
          }
          onClose={() => setSending(null)}
        />
      )}
    </section>
  );
}

// ── One OM ──

function OmCard({
  item,
  om,
  canWork,
  onPreview,
  onEdit,
  onSend,
}: {
  item: PqrsfCase;
  om: ImprovementOpportunity;
  canWork: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onSend: () => void;
}) {
  const retry = useRetryOmPdf(item.id);
  const upload = useUploadEditedOm(item.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const isSent = om.status === "sent";

  const download = (format: "pdf" | "docx") =>
    downloadOm(item.id, om.id, format, `OM ${om.code}.${format}`).catch((error) =>
      toast.error(errorMessage(error), { duration: Infinity })
    );

  return (
    <li className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold">{om.code}</span>
        {isSent ? (
          <Badge tone="success">
            Enviada
            {om.sent_at && <span className="tabular font-normal">· {formatDate(om.sent_at.slice(0, 10))}</span>}
          </Badge>
        ) : (
          <Badge tone="neutral">Borrador</Badge>
        )}
        {om.edited && <Badge tone="info">Word editado a mano</Badge>}
        <span className="min-w-0 text-sm break-words text-text-secondary">
          {om.supplier_name ?? om.supplier_code ?? "Sin proveedor"}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {om.document_number && <OmFact label="Número del documento" value={om.document_number} />}
        {om.document_date && <OmFact label="Fecha del documento" value={formatDate(om.document_date)} />}
        {om.generated_at && <OmFact label="Generada" value={formatDateTime(om.generated_at)} />}
        {om.signer?.name && (
          <OmFact label="Firma" value={[om.signer.name, om.signer.position].filter(Boolean).join(", ")} />
        )}
        {om.immediate_actions && (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-[13px] text-text-secondary">Acciones inmediatas</dt>
            <dd className="whitespace-pre-wrap">{om.immediate_actions}</dd>
          </div>
        )}
      </dl>

      {!om.has_pdf && (
        <p role="status" className="rounded-md bg-warning-badge px-3 py-2 text-sm text-warning">
          El PDF no se pudo generar (el convertidor no respondió). El Word sí está: reintenta el PDF.
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          upload.mutate(
            { omId: om.id, file },
            {
              onSuccess: () => toast.success("Word subido. El PDF se rehízo a partir de él."),
              onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
            }
          );
        }}
      />
      <div className="flex flex-wrap gap-2">
        {om.has_pdf && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={onPreview}>
            <FileText aria-hidden="true" />
            Vista previa
          </Button>
        )}
        {om.has_pdf && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => download("pdf")}>
            <Download aria-hidden="true" />
            Descargar PDF
          </Button>
        )}
        {om.has_docx && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => download("docx")}>
            <Download aria-hidden="true" />
            Descargar Word
          </Button>
        )}
        {canWork && !isSent && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {upload.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              Subir Word editado
            </Button>
            {!om.has_pdf && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-11"
                disabled={retry.isPending}
                onClick={() =>
                  retry.mutate(om.id, {
                    onSuccess: () => toast.success("PDF generado."),
                    onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
                  })
                }
              >
                {retry.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
                Reintentar PDF
              </Button>
            )}
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Regenerar
            </Button>
            {om.has_pdf && (
              <Button size="sm" className="max-md:h-11" onClick={onSend}>
                <Send aria-hidden="true" />
                Enviar al proveedor
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function OmFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

// ── PDF preview ──

function OmPdfDialog({
  caseId,
  om,
  onClose,
}: {
  caseId: string;
  om: ImprovementOpportunity;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // The PDF sits behind the session, so it is fetched with credentials and shown from a local URL.
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getOmPdfBlob(caseId, om.id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch((error) => !cancelled && setProblem(errorMessage(error)));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [caseId, om.id, om.generated_at, om.edited]);

  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={`OM ${om.code}`} description="Vista previa del PDF que recibe el proveedor.">
      {problem ? (
        <DialogError message={problem} />
      ) : !src ? (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando el PDF
        </p>
      ) : (
        <iframe title={`Vista previa de la OM ${om.code}`} src={src} className="h-[min(70dvh,48rem)] w-full rounded-md border border-border-control bg-white" />
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── The form that fills it ──

function OmFormDialog({
  item,
  request,
  editing,
  onClose,
}: {
  item: PqrsfCase;
  request: IntakeRequest | null;
  /** The OM being filled again; its supplier does not change. */
  editing: ImprovementOpportunity | null;
  onClose: () => void;
}) {
  const id = useId();
  const generate = useGenerateOm(item.id);
  const suppliers = suppliersOf(request);
  const photos = (request?.attachments ?? []).filter((file) => file.content_type.startsWith("image/"));

  const editingSupplier = editing
    ? suppliers.find((option) => (editing.supplier_code ? option.code === editing.supplier_code : option.name === editing.supplier_name))
    : undefined;
  const [supplierKey, setSupplierKey] = useState(
    editing ? (editingSupplier?.key ?? OTHER_SUPPLIER) : (suppliers[0]?.key ?? OTHER_SUPPLIER)
  );
  const [otherName, setOtherName] = useState(editing && !editingSupplier ? (editing.supplier_name ?? "") : "");
  const [actions, setActions] = useState(editing?.immediate_actions ?? "");
  const [note, setNote] = useState(editing?.request_note ?? "");
  const [chosen, setChosen] = useState<string[]>(editing?.evidence_ids ?? []);
  const [documentNumber, setDocumentNumber] = useState(editing?.document_number ?? "");
  const [documentDate, setDocumentDate] = useState(editing?.document_date ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const supplier = suppliers.find((option) => option.key === supplierKey) ?? null;

  const submit = () => {
    const name = supplier?.name ?? otherName.trim();
    if (!supplier && !name) return setProblem("Escribe el nombre del proveedor.");
    setProblem(null);
    generate.mutate(
      {
        supplier_code: supplier?.code ?? editing?.supplier_code ?? null,
        supplier_name: name || null,
        immediate_actions: actions.trim() || null,
        request_note: note.trim() || null,
        evidence_ids: chosen,
        document_number: documentNumber.trim() || null,
        document_date: documentDate || null,
      },
      {
        onSuccess: (result) => {
          toast.success(editing ? `OM ${result.code} generada de nuevo.` : `OM ${result.code} generada.`);
          if (!result.has_pdf) {
            toast.warning("El Word se generó, pero el PDF no: reintenta el PDF desde la OM.", { duration: Infinity });
          }
          onClose();
        },
      }
    );
  };

  return (
    <Dialog
      open
      isForm
      onOpenChange={(open) => !open && !generate.isPending && onClose()}
      title={editing ? `Regenerar la OM ${editing.code}` : "Generar la OM"}
      description={
        editing
          ? "Se llena de nuevo con estos datos y conserva su número. Si subiste un Word editado, se reemplaza."
          : "Se llena con los datos del caso: sede, cliente, productos y quién firma. Aquí va lo que escribe el equipo."
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {editing ? (
          <p className="text-sm">
            <span className="text-text-secondary">Proveedor </span>
            <span className="font-medium">{editing.supplier_name ?? editing.supplier_code}</span>
          </p>
        ) : (
          <>
            {suppliers.length > 0 && (
              <Field label="Proveedor" htmlFor={`${id}-supplier`} hint="Sale de los productos del caso.">
                <Dropdown
                  id={`${id}-supplier`}
                  aria-label="Proveedor"
                  value={supplierKey}
                  onValueChange={setSupplierKey}
                  options={[
                    ...suppliers.map((option) => ({ value: option.key, label: option.name })),
                    { value: OTHER_SUPPLIER, label: "Otro proveedor" },
                  ]}
                />
              </Field>
            )}
            {supplierKey === OTHER_SUPPLIER && (
              <Field
                label="Nombre del proveedor"
                htmlFor={`${id}-supplier-name`}
                hint={suppliers.length === 0 ? "El caso no tiene productos con proveedor." : undefined}
              >
                <Input
                  id={`${id}-supplier-name`}
                  value={otherName}
                  maxLength={200}
                  onChange={(event) => setOtherName(event.target.value)}
                />
              </Field>
            )}
          </>
        )}

        <Field label="Acciones inmediatas" htmlFor={`${id}-actions`} optional hint="Lo que ya se hizo para atender el caso.">
          <Textarea
            id={`${id}-actions`}
            value={actions}
            maxLength={ACTIONS_LIMIT}
            onChange={(event) => setActions(event.target.value)}
            className="min-h-24 resize-y"
          />
        </Field>

        <Field
          label="Nota final"
          htmlFor={`${id}-note`}
          optional
          hint="Si la dejas vacía, el documento lleva el texto que define la API."
        >
          <Textarea
            id={`${id}-note`}
            value={note}
            maxLength={NOTE_LIMIT}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-20 resize-y"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número del documento" htmlFor={`${id}-number`} optional>
            <Input
              id={`${id}-number`}
              value={documentNumber}
              maxLength={200}
              onChange={(event) => setDocumentNumber(event.target.value)}
            />
          </Field>
          <Field label="Fecha del documento" htmlFor={`${id}-date`} optional>
            <DatePicker
              id={`${id}-date`}
              value={documentDate}
              onChange={setDocumentDate}
              placeholder="Elige la fecha"
              clearable
            />
          </Field>
        </div>

        <PhotoPicker caseId={item.id} photos={photos} value={chosen} onChange={setChosen} />

        <DialogError message={problem ?? (generate.error ? errorMessage(generate.error) : null)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generate.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={generate.isPending}>
            {generate.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {editing ? "Regenerar" : "Generar"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Photos of the client's request ──

/** Up to six photos the client sent; the OM prints them. Only images, nothing else is offered. */
function PhotoPicker({
  caseId,
  photos,
  value,
  onChange,
}: {
  caseId: string;
  photos: IntakeAttachment[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const id = useId();
  if (photos.length === 0) {
    return (
      <p className="text-[13px] text-text-secondary">
        La solicitud del cliente no trae fotos para imprimir en la OM.
      </p>
    );
  }
  const full = value.length >= MAX_PHOTOS;
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">
        Fotos de la solicitud <span className="font-normal text-text-secondary">(opcional)</span>
      </legend>
      <p id={`${id}-hint`} className="text-[13px] text-text-secondary">
        <span className="tabular">{value.length}</span> de {MAX_PHOTOS}. Se imprimen en la OM.
      </p>
      <ul aria-describedby={`${id}-hint`} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const checked = value.includes(photo.id);
          return (
            <li key={photo.id}>
              <PhotoChoice
                caseId={caseId}
                photo={photo}
                checked={checked}
                disabled={!checked && full}
                onChange={(next) =>
                  onChange(next ? [...value, photo.id] : value.filter((current) => current !== photo.id))
                }
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function PhotoChoice({
  caseId,
  photo,
  checked,
  disabled,
  onChange,
}: {
  caseId: string;
  photo: IntakeAttachment;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getAttachmentBlob(caseId, photo.id)
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
  }, [caseId, photo.id]);

  return (
    <label
      className={cn(
        "relative block cursor-pointer overflow-hidden rounded-md border text-left",
        checked ? "border-primary ring-2 ring-primary" : "border-border hover:border-border-control",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex aspect-[4/3] items-center justify-center bg-canvas-subtle">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL of a session-protected file
          <img src={src} alt="" className="size-full object-cover" />
        ) : failed ? (
          <span className="px-2 text-center text-[13px] text-text-secondary">No se pudo cargar</span>
        ) : (
          <Loader2 className="size-4 animate-spin text-text-secondary" aria-hidden="true" />
        )}
      </span>
      <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-[13px]">
        <span className="min-w-0 truncate">{photo.original_filename}</span>
        <span className={cn("shrink-0 font-medium", checked ? "text-text-primary" : "text-text-secondary")}>
          {checked ? "Incluida" : "Incluir"}
        </span>
      </span>
    </label>
  );
}
