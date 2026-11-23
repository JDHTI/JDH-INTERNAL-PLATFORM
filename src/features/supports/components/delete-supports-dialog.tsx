"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useDeleteSupports } from "../hooks/use-supports";
import type { SupportSearchFilters } from "../types/support.types";

/** What has to be typed to delete: a slip of the hand cannot do it. */
const CONFIRM_WORD = "ELIMINAR";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;

/**
 * Deletes supports for good: the ones ticked in the table, or every one the list's filter finds.
 * Unlike «Anular o vencer», nothing stays in the master: the requests and history go too, and the
 * DWH keeps them as voided. All or nothing, with a reason, after typing ELIMINAR. Only for whoever
 * the API grants `can_delete` (BI's leader, superadmins); it checks again.
 */
export default function DeleteSupportsDialog({
  open,
  onClose,
  selection,
  filter,
  onDone,
  onForbidden,
}: {
  open: boolean;
  onClose: () => void;
  selection: { id: string; version?: number }[];
  /** What the filter would reach; null without a filter, so it never reaches every support. */
  filter: { body: SupportSearchFilters; total: number } | null;
  onDone: (deleted: number) => void;
  onForbidden: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Eliminar apoyos"
      description="Se borran para siempre, con sus solicitudes e historial. En el DWH quedan anulados."
      isForm
    >
      {open && <DeleteForm selection={selection} filter={filter} onClose={onClose} onDone={onDone} onForbidden={onForbidden} />}
    </Dialog>
  );
}

function DeleteForm({
  selection,
  filter,
  onClose,
  onDone,
  onForbidden,
}: {
  selection: { id: string; version?: number }[];
  filter: { body: SupportSearchFilters; total: number } | null;
  onClose: () => void;
  onDone: (deleted: number) => void;
  onForbidden: () => void;
}) {
  const id = useId();
  const remove = useDeleteSupports();
  const [scope, setScope] = useState<"seleccion" | "filtro">(selection.length > 0 ? "seleccion" : "filtro");
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = scope === "seleccion" ? selection.length : (filter?.total ?? 0);
  const problem =
    total === 0
      ? scope === "seleccion"
        ? "Marca apoyos en la tabla o usa el filtro."
        : "El filtro no trae apoyos."
      : reason.trim().length < 3
        ? "Escribe el motivo (al menos 3 caracteres)."
        : typed.trim() !== CONFIRM_WORD
          ? `Escribe ${CONFIRM_WORD} para confirmar.`
          : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (problem || remove.isPending) return;
    setError(null);
    remove.mutate(
      {
        reason: reason.trim(),
        items: scope === "seleccion" ? selection : [],
        filter: scope === "filtro" ? filter?.body : undefined,
      },
      {
        onSuccess: (result) => onDone(result.deleted),
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 403) {
            onForbidden();
            onClose();
          } else if (failure instanceof ApiError && failure.status === 409) {
            setError(`${failure.detail} No se borró ninguno: la lista se actualizó, revisa la selección y vuelve a intentar.`);
          } else {
            setError(errorMessage(failure));
          }
        },
      }
    );
  };

  const radio = "mt-0.5 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const option = "flex gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary";

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
        No se puede deshacer. Si solo deben dejar de contar, usa «Anular o vencer»: conserva el apoyo y su historia.
      </p>

      <fieldset className="space-y-2" disabled={remove.isPending}>
        <legend className="mb-2 text-sm font-medium">Cuáles</legend>
        <label className={option}>
          <input type="radio" name={`${id}-scope`} checked={scope === "seleccion"} disabled={selection.length === 0} onChange={() => setScope("seleccion")} className={radio} />
          <span>
            <span className="block font-medium">
              {selection.length === 1
                ? "El seleccionado"
                : selection.length > 1
                  ? `Los ${selection.length.toLocaleString("es-CO")} seleccionados`
                  : "Los seleccionados"}
            </span>
            <span className="text-text-secondary">
              {selection.length > 0 ? "Los que marcaste en la tabla, en cualquier página." : "No hay apoyos marcados en la tabla."}
            </span>
          </span>
        </label>
        <label className={option}>
          <input type="radio" name={`${id}-scope`} checked={scope === "filtro"} disabled={!filter} onChange={() => setScope("filtro")} className={radio} />
          <span>
            <span className="block font-medium">
              {filter ? `Todos los del filtro (${plural(filter.total, "apoyo", "apoyos")})` : "Todos los del filtro"}
            </span>
            <span className="text-text-secondary">
              {filter
                ? "Todo lo que muestra la lista con los filtros de ahora, no solo esta página."
                : "Filtra la lista primero: sin filtro llegaría a todos los apoyos."}
            </span>
          </span>
        </label>
      </fieldset>

      <Field label="Motivo" htmlFor={`${id}-reason`} hint="De 3 a 500 caracteres.">
        <Textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={remove.isPending}
        />
      </Field>

      <Field label={`Escribe ${CONFIRM_WORD} para confirmar`} htmlFor={`${id}-confirm`}>
        <Input
          id={`${id}-confirm`}
          value={typed}
          onChange={(event) => setTyped(event.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck={false}
          disabled={remove.isPending}
          className="font-mono uppercase max-md:h-11"
        />
      </Field>

      {problem && !error && <p className="text-[13px] text-text-secondary">{problem}</p>}
      <DialogError message={error} />

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={remove.isPending}>
          Cancelar
        </Button>
        {/* Solid danger: the one place DESIGN.md §7.1 allows it, the confirm inside a delete dialog. */}
        <Button type="submit" disabled={problem !== null || remove.isPending} className="bg-danger text-text-on-primary hover:bg-danger/90">
          <Trash2 aria-hidden="true" />
          {remove.isPending ? "Eliminando" : `Eliminar ${plural(total, "apoyo", "apoyos")}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
