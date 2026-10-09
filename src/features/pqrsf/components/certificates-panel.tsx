"use client";

import { useId, useState } from "react";
import { AlertTriangle, CloudOff, FileText, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import {
  useCertificateDocuments,
  useCertificates,
  useRemoveCertificate,
  useSaveCertificate,
} from "../hooks/use-pqrsf";
import type { CertificateDocument, CertificateItem } from "../types/pqrsf.types";

const PUBLIC_WARNING =
  "El formulario es público: este archivo se enviará, sin que nadie lo revise, a cualquier correo que lo pida.";

/**
 * Documents a customer receives by email the moment they ask for them in the
 * public form. Only what has a certificate here skips the case; the rest, and
 * «Otro», still open one.
 */
export default function CertificatesPanel() {
  const certificates = useCertificates();
  const [picking, setPicking] = useState<CertificateItem | null>(null);

  if (certificates.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="sr-only">Cargando certificados</span>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-md bg-canvas-subtle" />
        ))}
      </div>
    );
  }
  if (certificates.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los certificados"
        action={
          <Button variant="outline" onClick={() => certificates.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(certificates.error)}
      </StatePanel>
    );
  }

  const groups: { code: string; name: string; items: CertificateItem[] }[] = [];
  for (const item of certificates.data) {
    let group = groups.find((entry) => entry.code === item.category_code);
    if (!group) {
      group = { code: item.category_code, name: item.category_name, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  // Look the item up again so the dialog follows the cache after a save.
  const current = picking
    ? (certificates.data.find((item) => item.document_type_id === picking.document_type_id) ??
      picking)
    : null;

  return (
    <div className="space-y-6">
      <p className="max-w-prose text-[13px] text-text-secondary">
        Un cliente que pide estos documentos por el formulario recibe por correo, al instante, el
        archivo del gestor documental de Calidad que elijas aquí. Lo que no tenga certificado, y
        «Otro», abre un caso como siempre.
      </p>
      {groups.map((group) => (
        <section key={group.code} aria-label={group.name} className="space-y-2">
          <h2 className="text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            {group.name}
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {group.items.map((item) => (
              <CertificateRow key={item.document_type_id} item={item} onPick={() => setPicking(item)} />
            ))}
          </ul>
        </section>
      ))}
      {current && <PickDialog item={current} onClose={() => setPicking(null)} />}
    </div>
  );
}

function CertificateRow({ item, onPick }: { item: CertificateItem; onPick: () => void }) {
  const save = useSaveCertificate();
  const remove = useRemoveCertificate();
  const [confirming, setConfirming] = useState<"activate" | "remove" | null>(null);
  const config = item.certificate;

  const setActive = (isActive: boolean) =>
    config &&
    save
      .mutateAsync({
        documentTypeId: item.document_type_id,
        input: { document_id: config.document.id, is_active: isActive },
      })
      .then(() =>
        toast.success(isActive ? "Envío automático activado." : "Envío automático desactivado.")
      )
      .catch((error) => toast.error(errorMessage(error), { duration: Infinity }));

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-56 space-y-0.5">
        <p className="text-sm font-medium">{item.name}</p>
        {config ? (
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-secondary">
            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words" title={config.document.path}>
              {config.document.path}
            </span>
            <span className="tabular">· {formatBytes(config.document.size_bytes)}</span>
          </p>
        ) : (
          <p className="text-[13px] text-text-secondary">Sin certificado: abre un caso.</p>
        )}
        {config && !config.has_file && (
          <p className="flex items-center gap-1.5 text-[13px] text-danger" role="alert">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            El archivo se borró del gestor documental: no se envía nada hasta elegir otro.
          </p>
        )}
      </div>

      {config && (
        <label className="flex items-center gap-2 text-sm max-md:min-h-11">
          <input
            type="checkbox"
            role="switch"
            className="size-4 accent-[var(--primary)]"
            checked={config.is_active}
            disabled={save.isPending}
            onChange={(event) =>
              event.target.checked ? setConfirming("activate") : void setActive(false)
            }
          />
          Envío automático
          {config.automatic && <Badge tone="success">Activo</Badge>}
        </label>
      )}

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={onPick}>
          {config ? "Cambiar archivo" : "Elegir archivo"}
        </Button>
        {config && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="max-md:size-11"
            aria-label={`Quitar el certificado de ${item.name}`}
            title="Quitar"
            onClick={() => setConfirming("remove")}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>

      {confirming === "activate" && (
        <ConfirmDialog
          title={`Activar el envío de ${item.name}`}
          confirmLabel="Activar envío"
          pending={save.isPending}
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            await setActive(true);
            setConfirming(null);
          }}
        >
          <p>{PUBLIC_WARNING}</p>
          <p className="mt-2 text-text-secondary">Actívalo solo si el documento puede ser público.</p>
        </ConfirmDialog>
      )}
      {confirming === "remove" && (
        <ConfirmDialog
          title={`Quitar el certificado de ${item.name}`}
          confirmLabel="Quitar certificado"
          pending={remove.isPending}
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(item.document_type_id);
              toast.success("Certificado quitado: este documento vuelve a abrir casos.");
            } catch (error) {
              toast.error(errorMessage(error), { duration: Infinity });
            }
            setConfirming(null);
          }}
        >
          <p>Este documento vuelve a abrir un caso cuando alguien lo pida. El archivo no se borra del gestor documental.</p>
        </ConfirmDialog>
      )}
    </li>
  );
}

function ConfirmDialog({
  title,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={title}>
      <div className="space-y-4 text-sm">
        <div>{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending} onClick={() => void onConfirm()}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

/** Pick the file from Calidad's document manager and say whether it goes out on its own. */
function PickDialog({ item, onClose }: { item: CertificateItem; onClose: () => void }) {
  const id = useId();
  const save = useSaveCertificate();
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim());
  const documents = useCertificateDocuments(q, true);
  const [selected, setSelected] = useState<CertificateDocument | null>(
    item.certificate?.document ?? null
  );
  const [active, setActive] = useState(item.certificate?.is_active ?? false);
  const [error, setError] = useState<string | null>(null);

  const unchanged =
    selected?.id === item.certificate?.document.id && active === item.certificate?.is_active;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} isForm title={`Certificado de ${item.name}`}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!selected) return;
          setError(null);
          try {
            await save.mutateAsync({
              documentTypeId: item.document_type_id,
              input: { document_id: selected.id, is_active: active },
            });
            toast.success("Certificado guardado.");
            onClose();
          } catch (caught) {
            setError(errorMessage(caught));
          }
        }}
      >
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
          className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border"
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
                  selected?.id === document.id && "bg-primary-subtle"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-document`}
                  className="mt-1 size-4 accent-[var(--primary)]"
                  checked={selected?.id === document.id}
                  onChange={() => setSelected(document)}
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

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>
            <span className="block font-medium">Envío automático</span>
            <span className="block text-[13px] text-text-secondary">
              {active ? PUBLIC_WARNING : "Desactivado: el documento sigue abriendo un caso."}
            </span>
          </span>
        </label>

        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending || !selected || unchanged}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
