"use client";

import { useId, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useRetireSupports } from "../hooks/use-supports";
import { todayInBogota } from "../lib/internal-requests";
import type { RetireAction, RetireResult, SupportSearchFilters } from "../types/support.types";

/** The API retires up to this many at once. */
export const RETIRE_LIMIT = 2000;

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;

/** Yesterday in Bogotá: the API's default last day of an expiry. */
function yesterdayInBogota(): string {
  const day = new Date(`${todayInBogota()}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/**
 * Voids or expires many supports at once: the ones ticked in the table, or
 * every one the list's filter finds. All or nothing, with the observation the
 * supports keep. Managers only; the API checks it again.
 */
export default function RetireDialog({
  open,
  onClose,
  selection,
  filter,
  onDone,
  onForbidden,
}: {
  open: boolean;
  onClose: () => void;
  /** The ticked supports, at the version the person saw when it is known. */
  selection: { id: string; version?: number }[];
  /** What the filter would reach, or why it cannot be used; null without a filter. */
  filter: { body: SupportSearchFilters; total: number } | { blocked: string } | null;
  onDone: (result: RetireResult) => void;
  onForbidden: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Anular o vencer apoyos"
      description="Nada se borra: los apoyos quedan anulados o vencidos con la observación, y su historia se conserva."
      isForm
    >
      {open && <RetireForm selection={selection} filter={filter} onClose={onClose} onDone={onDone} onForbidden={onForbidden} />}
    </Dialog>
  );
}

function RetireForm({
  selection,
  filter,
  onClose,
  onDone,
  onForbidden,
}: {
  selection: { id: string; version?: number }[];
  filter: { body: SupportSearchFilters; total: number } | { blocked: string } | null;
  onClose: () => void;
  onDone: (result: RetireResult) => void;
  onForbidden: () => void;
}) {
  const id = useId();
  const retire = useRetireSupports();
  const usableFilter = filter && "body" in filter ? filter : null;
  const [scope, setScope] = useState<"seleccion" | "filtro">(selection.length > 0 ? "seleccion" : "filtro");
  const [action, setAction] = useState<RetireAction>("vencer");
  const [lastDay, setLastDay] = useState(yesterdayInBogota());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = scope === "seleccion" ? selection.length : (usableFilter?.total ?? 0);
  const overLimit = total > RETIRE_LIMIT;
  const problem =
    total === 0
      ? scope === "seleccion"
        ? "Marca apoyos en la tabla o usa el filtro."
        : "El filtro no trae apoyos."
      : overLimit
        ? `Son ${plural(total, "apoyo", "apoyos")}; el máximo por vez es ${RETIRE_LIMIT.toLocaleString("es-CO")}. Acota el filtro.`
        : action === "vencer" && !lastDay
          ? "Elige el último día vigente."
          : reason.trim().length < 3
            ? "Escribe la observación (al menos 3 caracteres)."
            : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (problem || retire.isPending) return;
    setError(null);
    retire.mutate(
      {
        action,
        reason: reason.trim(),
        last_day: action === "vencer" ? lastDay : undefined,
        items: scope === "seleccion" ? selection : [],
        filter: scope === "filtro" ? usableFilter?.body : undefined,
      },
      {
        onSuccess: onDone,
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 403) {
            onForbidden();
            onClose();
          } else if (failure instanceof ApiError && failure.status === 409) {
            setError(`${failure.detail} No se cambió ninguno: la lista se actualizó, revisa la selección y vuelve a intentar.`);
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
      <fieldset className="space-y-2" disabled={retire.isPending}>
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
          <input type="radio" name={`${id}-scope`} checked={scope === "filtro"} disabled={!usableFilter} onChange={() => setScope("filtro")} className={radio} />
          <span>
            <span className="block font-medium">
              {usableFilter ? `Todos los del filtro (${plural(usableFilter.total, "apoyo", "apoyos")})` : "Todos los del filtro"}
            </span>
            <span className="text-text-secondary">
              {usableFilter
                ? "Todo lo que muestra la lista con los filtros de ahora, no solo esta página."
                : filter && "blocked" in filter
                  ? filter.blocked
                  : "Filtra la lista primero: sin filtro llegaría a todos los apoyos."}
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-2" disabled={retire.isPending}>
        <legend className="mb-2 text-sm font-medium">Qué hacer</legend>
        <label className={option}>
          <input type="radio" name={`${id}-action`} checked={action === "vencer"} onChange={() => setAction("vencer")} className={radio} />
          <span>
            <span className="block font-medium">Vencer</span>
            <span className="text-text-secondary">
              Siguen vigentes hasta el último día que elijas. Uno programado que aún no empieza se anula.
            </span>
          </span>
        </label>
        <label className={option}>
          <input type="radio" name={`${id}-action`} checked={action === "anular"} onChange={() => setAction("anular")} className={radio} />
          <span>
            <span className="block font-medium">Anular</span>
            <span className="text-text-secondary">Dejan de contar desde ya. No se reactivan desde el maestro.</span>
          </span>
        </label>
      </fieldset>

      {action === "vencer" && (
        <Field label="Último día vigente" htmlFor={`${id}-last`} hint="Por defecto, ayer.">
          <DatePicker id={`${id}-last`} value={lastDay} onChange={setLastDay} disabled={retire.isPending} />
        </Field>
      )}

      <Field label="Observación" htmlFor={`${id}-reason`} hint="Queda en cada apoyo.">
        <Textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={retire.isPending}
        />
      </Field>

      {problem && !error && <p className="text-[13px] text-text-secondary">{problem}</p>}
      <DialogError message={error} />

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={retire.isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={problem !== null || retire.isPending}
          className={action === "anular" ? "bg-danger text-text-on-primary hover:bg-danger/90" : undefined}
        >
          {retire.isPending
            ? action === "anular" ? "Anulando" : "Venciendo"
            : `${action === "anular" ? "Anular" : "Vencer"} ${plural(total, "apoyo", "apoyos")}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
