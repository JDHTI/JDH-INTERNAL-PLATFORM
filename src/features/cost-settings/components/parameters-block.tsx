"use client";

import { useId, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUpdateParameters } from "../hooks/use-cost-settings";
import { formatDay, formatParameter, fromInputText, parameterError, toInputText } from "../lib/format";
import type { CostParameter } from "../types/cost-settings.types";

/**
 * The cost's parameters, one card each. Whoever manages edits them in place and saves them
 * together: only the values that changed go to the API, with one optional note.
 */
export default function ParametersBlock({ parameters, canManage }: { parameters: CostParameter[]; canManage: boolean }) {
  const noteId = useId();
  const update = useUpdateParameters();
  // What is typed in each card; a card left untouched shows the saved value.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const errors = Object.fromEntries(
    parameters.flatMap((parameter) => {
      const text = drafts[parameter.key];
      const problem = text === undefined ? null : parameterError(text, parameter);
      return problem ? [[parameter.key, problem]] : [];
    })
  );
  const changed = Object.fromEntries(
    parameters.flatMap((parameter) => {
      const text = drafts[parameter.key];
      if (text === undefined || errors[parameter.key]) return [];
      const value = fromInputText(text, parameter.unit);
      return value !== null && value !== Number(parameter.value) ? [[parameter.key, value]] : [];
    })
  ) as Record<string, number>;
  const changedCount = Object.keys(changed).length;
  const hasErrors = Object.keys(errors).length > 0;

  const discard = () => {
    setDrafts({});
    setNote("");
    setError(null);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (changedCount === 0 || hasErrors) return;
    setError(null);
    update.mutate(
      { values: changed, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(changedCount === 1 ? "Se guardó el parámetro." : `Se guardaron ${changedCount} parámetros.`);
          discard();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <section aria-labelledby="cost-parameters" className="space-y-3">
      <div className="space-y-1">
        <h2 id="cost-parameters" className="text-base font-semibold">
          Parámetros del costo
        </h2>
        <p className="text-[13px] text-text-secondary">Aplica a las cotizaciones que se armen o refresquen desde ahora.</p>
      </div>

      <form onSubmit={save} noValidate className="space-y-3">
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {parameters.map((parameter) => (
            <ParameterCard
              key={parameter.key}
              parameter={parameter}
              canManage={canManage}
              text={drafts[parameter.key]}
              error={errors[parameter.key] ?? null}
              disabled={update.isPending}
              onChange={(text) => setDrafts((current) => ({ ...current, [parameter.key]: text }))}
            />
          ))}
        </ul>

        {canManage && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor={noteId} className="block text-[13px] font-medium">
                Nota del cambio <span className="font-normal text-text-secondary">(opcional)</span>
              </label>
              <Input
                id={noteId}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Por qué se ajusta"
                disabled={update.isPending}
                className="max-md:h-11"
              />
            </div>
            <div className="flex gap-2">
              {(changedCount > 0 || hasErrors) && (
                <Button variant="ghost" onClick={discard} disabled={update.isPending} className="max-md:h-11">
                  Descartar
                </Button>
              )}
              <Button type="submit" disabled={changedCount === 0 || hasErrors || update.isPending} className="max-md:h-11">
                {update.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {changedCount > 1 ? `Guardar ${changedCount} cambios` : "Guardar cambios"}
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

function ParameterCard({
  parameter,
  canManage,
  text,
  error,
  disabled,
  onChange,
}: {
  parameter: CostParameter;
  canManage: boolean;
  /** Undefined while untouched. */
  text: string | undefined;
  error: string | null;
  disabled: boolean;
  onChange: (text: string) => void;
}) {
  const inputId = useId();
  const typed = text !== undefined ? fromInputText(text, parameter.unit) : null;
  const edited = typed !== null && !error && typed !== Number(parameter.value);
  const range = `Entre ${formatParameter(parameter.minimum, parameter.unit)} y ${formatParameter(parameter.maximum, parameter.unit)}.`;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{parameter.label}</h3>
        <p className="text-[13px] text-text-secondary">{parameter.description}</p>
      </div>
      <div className="mt-auto space-y-1.5">
        <p className="text-lg font-semibold tabular-nums">{formatParameter(parameter.value, parameter.unit)}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          {parameter.is_default ? (
            <Badge tone="neutral" className="px-1.5 py-0 text-xs">Por defecto</Badge>
          ) : (
            <span>
              Ajustado{parameter.updated_by ? ` por ${parameter.updated_by}` : ""}
              {parameter.updated_at ? ` el ${formatDay(parameter.updated_at)}` : ""}
            </span>
          )}
          {!parameter.is_default && <span>· por defecto {formatParameter(parameter.default, parameter.unit)}</span>}
        </p>
        {canManage && (
          <div className="space-y-1">
            <label htmlFor={inputId} className="block text-[13px] font-medium">
              {parameter.unit === "factor" ? "Nuevo factor" : "Nuevo margen, en puntos"}
            </label>
            <Input
              id={inputId}
              inputMode="decimal"
              value={text ?? toInputText(parameter.value, parameter.unit)}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${inputId}-help`}
              className="tabular-nums max-md:h-11"
            />
            <p id={`${inputId}-help`} className={error ? "text-[13px] text-danger" : "text-[13px] text-text-secondary"}>
              {error ?? (edited ? `Quedará en ${formatParameter(typed, parameter.unit)}. ${range}` : range)}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
