"use client";

import { useState } from "react";
import { FilePlus2, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useRemoveItem } from "../hooks/use-pqrsf";
import { documentName, formatDate, pluralDays, signedDays } from "../lib/format";
import type { CaseItem, PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";
import { AddItemDialog } from "./case-dialogs";
import RespondItemDialog from "./respond-item-dialog";

/**
 * The spreadsheet's per-document columns: agreed time, due date, answer,
 * business days taken and the difference against the agreement. The
 * difference is signed and spelled out, never only colored.
 */
export default function CaseItems({
  item,
  catalog,
}: {
  item: PqrsfCase;
  catalog: TrackingCatalog;
}) {
  const [responding, setResponding] = useState<CaseItem | null>(null);
  const [removing, setRemoving] = useState<CaseItem | null>(null);
  const [isAdding, setAdding] = useState(false);
  const remove = useRemoveItem(item.id);
  const canEdit = item.permissions.can_work && item.closed_at === null;

  return (
    <section aria-labelledby="items-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="items-heading" className="text-base font-semibold">
          Documentos solicitados
          <span className="tabular ml-2 text-sm font-normal text-text-secondary">
            {item.responded_count} de {item.item_count} respondidos
          </span>
        </h2>
        {canEdit && item.items.length > 0 && (
          <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Agregar documento
          </Button>
        )}
      </div>

      {item.items.length === 0 ? (
        <StatePanel
          icon={FileText}
          title="El caso no tiene documentos solicitados"
          action={
            canEdit ? (
              <Button variant="secondary" onClick={() => setAdding(true)}>
                <FilePlus2 aria-hidden="true" />
                Agregar el primer documento
              </Button>
            ) : undefined
          }
        >
          {item.due_on
            ? `La fecha límite sale del tiempo por defecto del tipo ${item.request_type.name}.`
            : "Sin documentos ni tiempo por defecto, el caso no tiene fecha límite."}
        </StatePanel>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2">Documento</th>
                  <th scope="col" className="px-3 py-2 text-right">Cant.</th>
                  <th scope="col" className="px-3 py-2 text-right" title="Tiempo establecido en días hábiles">
                    Establecido
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">Vence</th>
                  <th scope="col" className="px-3 py-2 text-right">Respondido</th>
                  <th scope="col" className="px-3 py-2 text-right" title="Días hábiles de respuesta">
                    Días
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">Diferencia</th>
                  <th scope="col" className="px-3 py-2">Causal</th>
                  {item.permissions.can_work && (
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {item.items.map((document) => (
                  <tr key={document.id} className="h-10 align-top">
                    <td className="max-w-64 px-3 py-2">
                      <span className="block truncate font-medium" title={documentName(document)}>
                        {documentName(document)}
                      </span>
                      {document.document_type && document.description && (
                        <span className="block truncate text-[13px] text-text-secondary">
                          {document.description}
                        </span>
                      )}
                    </td>
                    <td className="tabular px-3 py-2 text-right">{document.quantity ?? ""}</td>
                    <td className="tabular px-3 py-2 text-right">
                      {document.sla_days ?? <span className="text-text-secondary">Sin tiempo</span>}
                    </td>
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                      <ItemDue document={document} />
                    </td>
                    <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                      {document.responded_on ? (
                        formatDate(document.responded_on)
                      ) : (
                        <span className="text-text-secondary">Pendiente</span>
                      )}
                    </td>
                    <td className="tabular px-3 py-2 text-right">{document.response_days ?? ""}</td>
                    <td className="px-3 py-2 text-right">
                      <Difference document={document} />
                    </td>
                    <td className="max-w-56 px-3 py-2">
                      <Cause document={document} />
                    </td>
                    {item.permissions.can_work && (
                      <td className="px-2 py-1.5">
                        <RowActions
                          document={document}
                          canEdit={canEdit}
                          onRespond={() => setResponding(document)}
                          onRemove={() => {
                            remove.reset();
                            setRemoving(document);
                          }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
            {item.items.map((document) => (
              <li key={document.id} className="space-y-2 p-3">
                <p className="font-medium">
                  {documentName(document)}
                  {document.quantity !== null && (
                    <span className="tabular font-normal text-text-secondary"> · {document.quantity} und.</span>
                  )}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-text-secondary">Vence</dt>
                  <dd className="tabular text-right">
                    <ItemDue document={document} />
                  </dd>
                  <dt className="text-text-secondary">Respondido</dt>
                  <dd className="tabular text-right">
                    {document.responded_on ? formatDate(document.responded_on) : "Pendiente"}
                  </dd>
                  <dt className="text-text-secondary">Diferencia</dt>
                  <dd className="text-right">
                    <Difference document={document} />
                  </dd>
                </dl>
                {document.delay_cause && <Cause document={document} />}
                {item.permissions.can_work && (
                  <RowActions
                    document={document}
                    canEdit={canEdit}
                    onRespond={() => setResponding(document)}
                    onRemove={() => {
                      remove.reset();
                      setRemoving(document);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {responding && (
        <RespondItemDialog
          item={item}
          document={responding}
          onOpenChange={(open) => !open && setResponding(null)}
        />
      )}
      {isAdding && (
        <AddItemDialog item={item} catalog={catalog} open onOpenChange={setAdding} />
      )}
      <ConfirmDeleteDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Quitar el documento?"
        confirmLabel="Quitar documento"
        isPending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success(`«${documentName(removing)}» quitado del caso.`);
              setRemoving(null);
            },
          })
        }
      >
        Se quita «{removing ? documentName(removing) : ""}» de {item.code} y la fecha límite del
        caso se recalcula. Queda registrado en la línea de tiempo.
      </ConfirmDeleteDialog>
    </section>
  );
}

/*
 * No per-document "overdue" badge: the API flags overdue on the case, not on
 * each document, and recomputing it here would duplicate its rule.
 */
function ItemDue({ document }: { document: CaseItem }) {
  if (!document.due_on) return <span className="text-text-secondary">Sin fecha</span>;
  return <>{formatDate(document.due_on)}</>;
}

function Difference({ document }: { document: CaseItem }) {
  if (document.difference_days === null) return null;
  const days = document.difference_days;
  if (document.is_late) {
    return (
      <Badge tone="danger" className="tabular">
        {signedDays(days)} {pluralDays(days)} tarde
      </Badge>
    );
  }
  return (
    <span className="tabular whitespace-nowrap">
      {signedDays(days)}
      <span className="text-[13px] text-text-secondary">
        {days < 0 ? ` (${-days} ${pluralDays(days)} antes)` : " (en el límite)"}
      </span>
    </span>
  );
}

function Cause({ document }: { document: CaseItem }) {
  if (document.delay_cause) {
    return (
      <span className="block text-[13px]" title={document.delay_detail ?? undefined}>
        <span className="block truncate">{document.delay_cause}</span>
        {document.delay_detail && (
          <span className="block truncate text-text-secondary">{document.delay_detail}</span>
        )}
      </span>
    );
  }
  if (document.is_late) {
    return <span className="text-[13px] text-danger">Falta la causal</span>;
  }
  return null;
}

function RowActions({
  document,
  canEdit,
  onRespond,
  onRemove,
}: {
  document: CaseItem;
  canEdit: boolean;
  onRespond: () => void;
  onRemove: () => void;
}) {
  if (!canEdit) return null;
  const name = documentName(document);
  return (
    <div className="flex items-center gap-1 md:justify-end">
      {document.responded_on ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="max-md:size-11"
          aria-label={`Editar respuesta de ${name}`}
          title="Editar respuesta"
          onClick={onRespond}
        >
          <Pencil aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={onRespond}>
          Registrar respuesta
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="max-md:size-11"
        aria-label={`Quitar ${name}`}
        title="Quitar documento"
        onClick={onRemove}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
