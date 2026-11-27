"use client";

import { useId, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCreateReason, useServiceLevelReasons, useUpdateReason } from "../hooks/use-service-level";
import type { ServiceLevelReason } from "../types/service-level.types";

/**
 * The reasons' catalog: add one with who answers for it, rename it, change
 * its responsible or switch it off. Reasons are never deleted, so the lines
 * that have one keep it.
 */
export default function ReasonsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} wide title="Motivos de pendientes" description="Un motivo desactivado sigue en las líneas que ya lo tienen, pero no se puede asignar.">
      {open && <Catalog />}
    </Dialog>
  );
}

function Catalog() {
  const reasons = useServiceLevelReasons();
  const [editing, setEditing] = useState<string | null>(null);
  const responsibles = useMemo(() => [...new Set((reasons.data ?? []).map((reason) => reason.responsible))].sort(), [reasons.data]);
  const listId = useId();

  return (
    <div className="space-y-4">
      <datalist id={listId}>
        {responsibles.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <NewReason listId={listId} />
      {reasons.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando los motivos" />
      ) : reasons.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(reasons.error)}
        </p>
      ) : (
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Motivos de pendientes</caption>
            <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-2">Motivo</th>
                <th scope="col" className="px-3 py-2">Responsable</th>
                <th scope="col" className="px-3 py-2">Activo</th>
                <th scope="col" className="w-12 px-3 py-2">
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reasons.data.map((reason) =>
                editing === reason.id ? (
                  <EditRow key={reason.id} reason={reason} listId={listId} onDone={() => setEditing(null)} />
                ) : (
                  <ReasonRow key={reason.id} reason={reason} onEdit={() => setEditing(reason.id)} />
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewReason({ listId }: { listId: string }) {
  const nameId = useId();
  const responsibleId = useId();
  const [name, setName] = useState("");
  const [responsible, setResponsible] = useState("");
  const create = useCreateReason();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate(
      { name: name.trim(), responsible: responsible.trim().toUpperCase() },
      {
        onSuccess: (reason) => {
          toast.success(`Motivo «${reason.name}» creado.`);
          setName("");
          setResponsible("");
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor={nameId} className="block text-[13px] font-medium">
            Motivo nuevo
          </label>
          <Input id={nameId} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Agotado en bodega" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={responsibleId} className="block text-[13px] font-medium">
            Responsable
          </label>
          <Input id={responsibleId} list={listId} value={responsible} onChange={(event) => setResponsible(event.target.value)} maxLength={60} placeholder="PROVEEDOR" />
        </div>
        <Button type="submit" disabled={!name.trim() || !responsible.trim() || create.isPending}>
          <Plus aria-hidden="true" /> {create.isPending ? "Creando…" : "Agregar"}
        </Button>
      </div>
      <DialogError message={create.isError ? errorMessage(create.error) : null} />
    </form>
  );
}

function ReasonRow({ reason, onEdit }: { reason: ServiceLevelReason; onEdit: () => void }) {
  const update = useUpdateReason();
  return (
    <tr className={cn(!reason.is_active && "text-text-secondary")}>
      <td className="px-3 py-1.5">{reason.name}</td>
      <td className="px-3 py-1.5">{reason.responsible}</td>
      <td className="px-3 py-1.5">
        <Switch
          checked={reason.is_active}
          disabled={update.isPending}
          aria-label={`${reason.is_active ? "Desactivar" : "Activar"} «${reason.name}»`}
          onCheckedChange={(next) =>
            update.mutate(
              { id: reason.id, patch: { is_active: next } },
              { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
            )
          }
        />
      </td>
      <td className="px-3 py-1.5">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Editar «${reason.name}»`}>
          <Pencil aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}

function EditRow({ reason, listId, onDone }: { reason: ServiceLevelReason; listId: string; onDone: () => void }) {
  const [name, setName] = useState(reason.name);
  const [responsible, setResponsible] = useState(reason.responsible);
  const update = useUpdateReason();
  const save = () =>
    update.mutate(
      { id: reason.id, patch: { name: name.trim(), responsible: responsible.trim().toUpperCase() } },
      { onSuccess: onDone }
    );
  return (
    <tr className="bg-canvas-subtle">
      <td className="px-3 py-1.5">
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} aria-label="Nombre del motivo" autoFocus />
      </td>
      <td className="px-3 py-1.5">
        <Input list={listId} value={responsible} onChange={(event) => setResponsible(event.target.value)} maxLength={60} aria-label="Responsable" />
        {update.isError && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {errorMessage(update.error)}
          </p>
        )}
      </td>
      <td colSpan={2} className="px-3 py-1.5">
        <div className="flex gap-1">
          <Button size="sm" onClick={save} disabled={!name.trim() || !responsible.trim() || update.isPending}>
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  );
}
