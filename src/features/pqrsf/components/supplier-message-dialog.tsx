"use client";

import { useId, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import { useSendSupplierMessage, useSupplierContacts } from "../hooks/use-pqrsf";
import type {
  IntakeRequest,
  Person,
  PqrsfCase,
  SupplierMessageKind,
} from "../types/pqrsf.types";
import CcPicker from "./cc-picker";

const KINDS: { value: SupplierMessageKind; label: string }[] = [
  { value: "request", label: "Solicitud de información" },
  { value: "response", label: "Respuesta" },
  { value: "improvement", label: "Oportunidad de mejora" },
  { value: "notice", label: "Mensaje informativo" },
];

// The API's limits (docs/pqrsf-proveedor.md): the same per-file rule as the
// comments, and 25 MB for everything attached, the client's evidence included.
const MAX_RECIPIENTS = 5;
const MAX_FILES = 10;
const MB = 1024 * 1024;
const MAX_FILE_BYTES = 10 * MB;
const MAX_TOTAL_BYTES = 25 * MB;
const BODY_LIMIT = 5000;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp";
const OTHER_SUPPLIER = "__other__";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What sending an OM fixes in the dialog: the OM, its supplier and a suggested text. */
export interface OmPreset {
  omId: string;
  /** «1181BOG»: the PDF goes attached as «OM 1181BOG.pdf». */
  omCode: string;
  supplierCode: string | null;
  supplierName: string | null;
  body: string;
}

export interface SupplierOption {
  key: string;
  code: string | null;
  name: string;
}

/** The suppliers of the case are the ones of its products, each once. */
export function suppliersOf(request: IntakeRequest | null): SupplierOption[] {
  const seen = new Map<string, SupplierOption>();
  for (const product of request?.products ?? []) {
    const name = product.supplier_name ?? product.supplier_code;
    if (!name) continue;
    const key = product.supplier_code ?? name;
    if (!seen.has(key)) seen.set(key, { key, code: product.supplier_code, name });
  }
  return [...seen.values()];
}

/**
 * Writes to the supplier from the case, without going to Outlook. It leaves
 * pqrsf@ as one email per recipient with the case code in the subject, so the
 * supplier's answer comes back to this case on its own. The client never sees
 * these messages.
 */
export default function SupplierMessageDialog({
  item,
  request,
  onClose,
  preset,
}: {
  item: PqrsfCase;
  request: IntakeRequest | null;
  onClose: () => void;
  /** Sending an improvement opportunity: the message is its cover, and its PDF goes attached. */
  preset?: OmPreset;
}) {
  const id = useId();
  const send = useSendSupplierMessage(item.id);
  const suppliers = suppliersOf(request);
  const evidence = request?.attachments ?? [];
  const evidenceBytes = evidence.reduce((sum, file) => sum + file.size_bytes, 0);

  const presetSupplier = preset
    ? suppliers.find((option) => (preset.supplierCode ? option.code === preset.supplierCode : option.name === preset.supplierName))
    : undefined;
  const [kind, setKind] = useState<SupplierMessageKind>(preset ? "improvement" : "request");
  const [supplierKey, setSupplierKey] = useState(
    presetSupplier?.key ?? (preset ? OTHER_SUPPLIER : (suppliers[0]?.key ?? OTHER_SUPPLIER))
  );
  const [otherName, setOtherName] = useState(preset && !presetSupplier ? (preset.supplierName ?? "") : "");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [cc, setCc] = useState<Person[]>([]);
  const [body, setBody] = useState(preset?.body ?? "");
  const [includeCaseData, setIncludeCaseData] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const supplier = suppliers.find((option) => option.key === supplierKey) ?? null;
  const query = useDebouncedValue(draft.trim());
  const contacts = useSupplierContacts(supplier?.code ?? null, query);
  const suggestions = (contacts.data ?? []).filter(
    (contact) => !recipients.includes(contact.email.toLowerCase())
  );

  const filesBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalBytes = filesBytes + (includeEvidence ? evidenceBytes : 0);
  const sizeProblem = files.some((file) => file.size > MAX_FILE_BYTES)
    ? "Un archivo pesa más de 10 MB."
    : totalBytes > MAX_TOTAL_BYTES
      ? `Los adjuntos suman ${formatBytes(totalBytes)}; el máximo es 25 MB.`
      : null;

  const addRecipient = (raw: string) => {
    const email = raw.trim().replace(/[;,]$/, "").toLowerCase();
    if (!email) return;
    if (!EMAIL.test(email)) {
      setProblem(`«${email}» no es un correo válido.`);
      return;
    }
    if (recipients.length >= MAX_RECIPIENTS) {
      setProblem(`Puedes escribir a máximo ${MAX_RECIPIENTS} correos.`);
      return;
    }
    if (!recipients.includes(email)) setRecipients((current) => [...current, email]);
    setDraft("");
    setProblem(null);
  };

  const submit = () => {
    // A typed address not yet turned into a chip still counts.
    const pending = draft.trim() && EMAIL.test(draft.trim()) ? [draft.trim().toLowerCase()] : [];
    const to = [...new Set([...recipients, ...pending])];
    if (to.length === 0) return setProblem("Agrega al menos un correo del proveedor.");
    if (to.length > MAX_RECIPIENTS) return setProblem(`Puedes escribir a máximo ${MAX_RECIPIENTS} correos.`);
    if (!body.trim()) return setProblem("Escribe el mensaje.");
    if (sizeProblem) return setProblem(sizeProblem);
    setProblem(null);
    send.mutate(
      {
        kind,
        to,
        cc: cc.flatMap((person) => (person.email ? [person.email.toLowerCase()] : [])),
        body: body.trim(),
        omId: preset?.omId,
        supplierCode: supplier?.code ?? preset?.supplierCode ?? null,
        supplierName: supplier?.name ?? (otherName.trim() || preset?.supplierName || null),
        includeCaseData,
        includeEvidence,
        files,
      },
      {
        onSuccess: (result) => {
          toast.success(
            to.length === 1 ? "Mensaje en cola para el proveedor." : `Mensaje en cola para ${to.length} correos.`
          );
          if (result.rejected_files.length > 0) {
            toast.warning(
              `No se adjuntó: ${result.rejected_files.map((file) => `${file.name} (${file.reason})`).join("; ")}`,
              { duration: Infinity }
            );
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
      onOpenChange={(open) => !open && !send.isPending && onClose()}
      title={preset ? `Enviar la OM ${preset.omCode} al proveedor` : "Escribir al proveedor"}
      description={
        preset
          ? `Sale desde pqrsf@jdh.com.co con «OM ${preset.omCode}.pdf» adjunto y el consecutivo en el asunto. Al enviarlo, la OM queda como enviada y el caso lleva la marca «OM enviada». El cliente no lo ve.`
          : "Sale desde pqrsf@jdh.com.co, un correo por destinatario (con copia a quien elijas), con el consecutivo en el asunto para que la respuesta vuelva a este caso. El cliente no lo ve."
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {!preset && (
            <Field label="Tipo de mensaje" htmlFor={`${id}-kind`}>
              <Dropdown
                id={`${id}-kind`}
                aria-label="Tipo de mensaje"
                value={kind}
                onValueChange={(value) => setKind(value as SupplierMessageKind)}
                options={KINDS}
              />
            </Field>
          )}
          {suppliers.length > 0 ? (
            <Field label="Proveedor" htmlFor={`${id}-supplier`} hint="Sale de los productos del caso.">
              <Dropdown
                id={`${id}-supplier`}
                aria-label="Proveedor"
                value={supplierKey}
                onValueChange={(value) => {
                  setSupplierKey(value);
                  setRecipients([]);
                }}
                options={[
                  ...suppliers.map((option) => ({ value: option.key, label: option.name })),
                  { value: OTHER_SUPPLIER, label: "Otro proveedor" },
                ]}
              />
            </Field>
          ) : null}
          {supplierKey === OTHER_SUPPLIER && (
            <Field
              label="Nombre del proveedor"
              htmlFor={`${id}-supplier-name`}
              optional
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
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-to`} className="block text-[13px] font-medium">
            Para
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-control px-2 py-1.5 focus-within:border-ring">
            {recipients.map((email) => (
              <span
                key={email}
                className="flex max-w-full items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]"
              >
                <span className="min-w-0 truncate">{email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 max-md:size-11"
                  aria-label={`Quitar ${email}`}
                  onClick={() => setRecipients((current) => current.filter((value) => value !== email))}
                >
                  <X aria-hidden="true" />
                </Button>
              </span>
            ))}
            {recipients.length < MAX_RECIPIENTS && (
              <input
                id={`${id}-to`}
                type="email"
                value={draft}
                autoComplete="off"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "," || event.key === ";") {
                    event.preventDefault();
                    addRecipient(draft);
                  } else if (event.key === "Backspace" && !draft && recipients.length > 0) {
                    setRecipients((current) => current.slice(0, -1));
                  }
                }}
                onBlur={() => draft.trim() && addRecipient(draft)}
                aria-describedby={`${id}-to-hint`}
                className="min-h-8 min-w-48 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-text-secondary max-md:min-h-11"
                placeholder={recipients.length === 0 ? "correo@proveedor.com" : "Otro correo"}
              />
            )}
          </div>
          <p id={`${id}-to-hint`} className="text-[13px] text-text-secondary">
            De 1 a {MAX_RECIPIENTS} correos. Enter o coma para agregar cada uno.
          </p>
          {suggestions.length > 0 && recipients.length < MAX_RECIPIENTS && (
            <div className="space-y-1">
              <p className="text-[13px] text-text-secondary">Usados antes con este proveedor:</p>
              <ul className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 6).map((contact) => (
                  <li key={contact.id}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="max-md:h-11"
                      onClick={() => addRecipient(contact.email)}
                    >
                      {contact.contact_name ? `${contact.contact_name} · ${contact.email}` : contact.email}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <CcPicker id={`${id}-cc`} value={cc} onChange={setCc} />

        <Field label="Mensaje" htmlFor={`${id}-body`}>
          <Textarea
            id={`${id}-body`}
            value={body}
            maxLength={BODY_LIMIT}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-32 resize-y"
          />
        </Field>

        <div className="space-y-2">
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm sm:min-h-0">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
              checked={includeCaseData}
              onChange={(event) => setIncludeCaseData(event.target.checked)}
            />
            <span>
              <span className="block font-medium">Incluir los datos del caso</span>
              <span className="block text-[13px] text-text-secondary">
                Cliente, sede, fecha y productos con lote, vencimiento, cantidad y factura.
              </span>
            </span>
          </label>
          {evidence.length > 0 && (
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm sm:min-h-0">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                checked={includeEvidence}
                onChange={(event) => setIncludeEvidence(event.target.checked)}
              />
              <span>
                <span className="block font-medium">Adjuntar las evidencias del cliente</span>
                <span className="block text-[13px] text-text-secondary">
                  {evidence.length} {evidence.length === 1 ? "archivo" : "archivos"} ·{" "}
                  <span className="tabular">{formatBytes(evidenceBytes)}</span>
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              setFiles((current) => [...current, ...picked].slice(0, MAX_FILES));
              event.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={files.length >= MAX_FILES}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip aria-hidden="true" />
              Adjuntar archivos
            </Button>
            <span className="tabular text-[13px] text-text-secondary">
              {totalBytes > 0 ? `${formatBytes(totalBytes)} de 25 MB` : "PDF, Office, imágenes · 10 MB por archivo"}
            </span>
          </div>
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex max-w-full items-center gap-1.5 rounded-md bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]"
                >
                  <FileText className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
                  <span className="min-w-0 truncate">{file.name}</span>
                  <span className="tabular shrink-0 text-text-secondary">{formatBytes(file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 max-md:size-11"
                    aria-label={`Quitar ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogError message={problem ?? sizeProblem ?? (send.error ? errorMessage(send.error) : null)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={send.isPending}>
            {send.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Enviar al proveedor
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
