"use client";

import { useId, useRef, useState } from "react";
import { FileUp, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { useFolders, useUploadDocument } from "@/features/documents/hooks/use-documents";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useCaseDocumentSearch, useDeliverItem } from "../hooks/use-pqrsf";
import { documentName } from "../lib/format";
import type { CaseItem, CertificateDocument, PqrsfCase } from "../types/pqrsf.types";

const VAULT_AREA = "calidad";
const SENDER = "pqrsf@jdh.com.co";
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp";

type Source = "vault" | "upload";

/**
 * Answers a requested document by hand, for the ones with no certificate: link a
 * file from Calidad's document manager (or add a new one there first), or attach
 * a file for one time only when the document type allows it. Either way the file
 * can go out to the customer; that step asks for a review first, because it is
 * a real email.
 */
export default function DeliverItemDialog({
  item,
  document,
  onOpenChange,
}: {
  item: PqrsfCase;
  document: CaseItem;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useDeliverItem(item.id);
  const name = documentName(document);
  // Free-text documents have no type and always allow it; a typed one says so.
  const allowsUpload = document.document_type === null || document.document_type.allows_direct_upload === true;
  const email = item.requester_email;

  const [source, setSource] = useState<Source>("vault");
  const [linked, setLinked] = useState<CertificateDocument | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sendToClient, setSendToClient] = useState(Boolean(email));
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [reviewed, setReviewed] = useState(false);
  const [askCause, setAskCause] = useState(false);
  const [cause, setCause] = useState("");
  const [detail, setDetail] = useState("");
  const [causeError, setCauseError] = useState<string | null>(null);

  const ready = source === "vault" ? linked !== null : file !== null;
  const fileName = source === "vault" ? (linked?.filename ?? "") : (file?.name ?? "");

  const submit = () => {
    if (askCause && !cause.trim()) {
      setCauseError("Escribe la causal del retraso, por ejemplo «Proveedor no envió el certificado».");
      setStep("form");
      return;
    }
    const common = {
      sendToClient,
      delayCause: askCause ? cause.trim() : null,
      delayDetail: askCause ? detail.trim() || null : null,
    };
    const input =
      source === "vault" && linked
        ? ({ source: "vault", documentId: linked.id, ...common } as const)
        : file
          ? ({ source: "upload", file, ...common } as const)
          : null;
    if (!input) return;
    mutation.mutate(
      { itemId: document.id, input },
      {
        onSuccess: ({ delivery }) => {
          toast.success(
            delivery.email.status === "not_sent"
              ? `Respuesta de «${name}» registrada.`
              : `Respuesta de «${name}» registrada. El correo sale en unos segundos.`
          );
          onOpenChange(false);
        },
        onError: (error) => {
          // The API asks for the cause of a late answer; it opens here and the send is retried.
          if (error instanceof ApiError && /causal/i.test(error.detail) && !askCause) {
            setAskCause(true);
            setStep("form");
            mutation.reset();
          }
        },
      }
    );
  };

  const error = mutation.error && !(askCause && !cause.trim()) ? errorMessage(mutation.error) : null;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) mutation.reset();
        onOpenChange(next);
      }}
      isForm
      title={step === "confirm" ? "Revisa antes de enviar" : "Responder con un documento"}
      description={`${name} · ${item.code}`}
    >
      {step === "confirm" ? (
        <div className="space-y-4">
          <dl className="space-y-2 rounded-md border border-border p-4 text-sm">
            <Row label="Para" value={email ?? ""} />
            <Row label="Desde" value={SENDER} />
            <Row label="Documento" value={name} />
            <Row label="Adjunto" value={fileName} />
          </dl>
          <p className="text-[13px] text-text-secondary">
            Es un correo real: sale al instante y no se puede deshacer.
            {source === "upload" && " El archivo queda guardado solo en este caso, no en el gestor documental."}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            <span className="font-medium">Revisé el destinatario y el adjunto.</span>
          </label>
          <DialogError message={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("form")}>
              Volver a editar
            </Button>
            <Button disabled={!reviewed || mutation.isPending} onClick={submit}>
              {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Enviar al cliente
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            if (askCause && !cause.trim()) {
              setCauseError("Escribe la causal del retraso, por ejemplo «Proveedor no envió el certificado».");
              return;
            }
            setCauseError(null);
            if (sendToClient) {
              setReviewed(false);
              setStep("confirm");
            } else {
              submit();
            }
          }}
        >
          {allowsUpload && (
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium">¿De dónde sale el documento?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["vault", "Del gestor documental", "Buscarlo o subirlo al gestor de Calidad."],
                    ["upload", "Subir una sola vez", "Queda solo en este caso, sin pasar por el gestor."],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm max-md:min-h-11",
                      source === value && "border-ring bg-primary-subtle"
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-source`}
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      checked={source === value}
                      onChange={() => setSource(value)}
                    />
                    <span>
                      <span className="block font-medium">{label}</span>
                      <span className="block text-[13px] text-text-secondary">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {source === "vault" ? (
            <VaultPicker caseId={item.id} linked={linked} onLink={setLinked} />
          ) : (
            <OnceUpload file={file} onFile={setFile} />
          )}

          <div className="space-y-1">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={sendToClient && Boolean(email)}
                disabled={!email}
                onChange={(event) => setSendToClient(event.target.checked)}
              />
              <span className="font-medium">
                Enviar al cliente{email ? ` (${email})` : ""}
              </span>
            </label>
            {!email && (
              <p className="pl-6 text-[13px] text-text-secondary">
                El caso no tiene correo del solicitante: se registra sin enviar.
              </p>
            )}
          </div>

          {askCause && (
            <div className="space-y-4 rounded-md border border-border p-4">
              <p role="alert" className="text-sm text-warning">
                Este documento se responde tarde: la causal es obligatoria.
              </p>
              <Field label="Causal del retraso" htmlFor={`${id}-cause`} error={causeError}>
                <Input
                  id={`${id}-cause`}
                  value={cause}
                  maxLength={300}
                  autoFocus
                  onChange={(event) => setCause(event.target.value)}
                  aria-invalid={causeError ? true : undefined}
                />
              </Field>
              <Field label="Detalle" htmlFor={`${id}-detail`} optional>
                <Textarea
                  id={`${id}-detail`}
                  value={detail}
                  maxLength={2000}
                  onChange={(event) => setDetail(event.target.value)}
                />
              </Field>
            </div>
          )}

          <DialogError message={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!ready || mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {sendToClient && email ? "Continuar" : "Registrar respuesta"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{value}</dd>
    </div>
  );
}

/** Search Calidad's manager, or add a new file there and link it at once. */
function VaultPicker({
  caseId,
  linked,
  onLink,
}: {
  caseId: string;
  linked: CertificateDocument | null;
  onLink: (document: CertificateDocument) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim());
  const documents = useCaseDocumentSearch(caseId, q, true);
  const [isAdding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`${id}-q`} className="block text-[13px] font-medium">
          Buscar en el gestor documental de Calidad
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            id={`${id}-q`}
            type="search"
            className="pl-9"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Nombre del archivo"
          />
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Archivos de Calidad"
        className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border"
      >
        {documents.isPending ? (
          <p className="p-3 text-sm text-text-secondary">Cargando archivos…</p>
        ) : documents.error ? (
          <p role="alert" className="p-3 text-sm text-danger">
            {errorMessage(documents.error)}
          </p>
        ) : documents.data.length === 0 ? (
          <p className="p-3 text-sm text-text-secondary">No hay archivos con ese nombre.</p>
        ) : (
          documents.data.map((document) => (
            <label
              key={document.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-canvas-subtle max-md:min-h-11",
                linked?.id === document.id && "bg-primary-subtle"
              )}
            >
              <input
                type="radio"
                name={`${id}-document`}
                className="mt-1 size-4 accent-[var(--primary)]"
                checked={linked?.id === document.id}
                onChange={() => onLink(document)}
              />
              <span className="min-w-0 text-sm">
                <span className="block font-medium break-words">{document.name}</span>
                <span className="block text-[13px] break-words text-text-secondary">
                  {document.path} · {formatBytes(document.size_bytes)}
                </span>
              </span>
            </label>
          ))
        )}
      </div>

      {/* A linked file that the search does not list (just uploaded) still shows as chosen. */}
      {linked && !documents.data?.some((document) => document.id === linked.id) && (
        <p className="text-[13px] text-text-secondary">
          Elegido: <span className="font-medium text-text-primary">{linked.path}</span>
        </p>
      )}

      {isAdding ? (
        <AddToVault
          onDone={(document) => {
            onLink(document);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setAdding(true)}>
          <FileUp aria-hidden="true" />
          Subir un archivo nuevo al gestor
        </Button>
      )}
    </div>
  );
}

function AddToVault({
  onDone,
  onCancel,
}: {
  onDone: (document: CertificateDocument) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const folders = useFolders(VAULT_AREA);
  const upload = useUploadDocument(VAULT_AREA);
  const [folderId, setFolderId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");

  const folder = folders.data?.find((entry) => entry.id === folderId);

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-[13px] text-text-secondary">
        Queda guardado en el gestor documental de Calidad y se vincula a esta respuesta.
      </p>
      <Field label="Carpeta" htmlFor={`${id}-folder`}>
        <Dropdown
          id={`${id}-folder`}
          aria-label="Carpeta"
          value={folderId}
          onValueChange={setFolderId}
          placeholder={folders.isPending ? "Cargando carpetas…" : "Elige una carpeta"}
          options={(folders.data ?? []).map((entry) => ({ value: entry.id, label: entry.name }))}
        />
      </Field>
      <FilePick id={`${id}-file`} file={file} onFile={setFile} />
      <Field label="Nombre en el gestor" htmlFor={`${id}-name`} optional>
        <Input
          id={`${id}-name`}
          value={label}
          maxLength={200}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={file?.name}
        />
      </Field>
      {upload.error && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(upload.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          className="max-md:h-11"
          disabled={!folder || !file || upload.isPending}
          onClick={() =>
            folder &&
            file &&
            upload.mutate(
              { folderId: folder.id, input: { file, name: label.trim() || undefined } },
              {
                onSuccess: (document) =>
                  onDone({
                    id: document.id,
                    name: document.name,
                    filename: document.original_filename,
                    content_type: document.content_type,
                    size_bytes: document.size_bytes,
                    folder_id: folder.id,
                    folder_name: folder.name,
                    area_slug: VAULT_AREA,
                    path: `Calidad / ${folder.name} / ${document.name}`,
                  }),
              }
            )
          }
        >
          {upload.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Subir y vincular
        </Button>
      </div>
    </div>
  );
}

function OnceUpload({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FilePick id={`${id}-file`} file={file} onFile={onFile} />
      <p className="text-[13px] text-text-secondary">
        El archivo se adjunta a este caso y al correo. No se guarda en el gestor documental.
      </p>
    </div>
  );
}

function FilePick({
  id,
  file,
  onFile,
}: {
  id: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        Archivo
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => input.current?.click()}
        >
          <FileUp aria-hidden="true" />
          {file ? "Cambiar archivo" : "Elegir archivo"}
        </Button>
        <span className="min-w-0 text-sm break-words">
          {file ? (
            <>
              {file.name} <span className="tabular text-text-secondary">· {formatBytes(file.size)}</span>
            </>
          ) : (
            <span className="text-text-secondary">Ninguno elegido</span>
          )}
        </span>
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </div>
  );
}
