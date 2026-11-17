"use client";

import { useId, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

// Pieces every catalog of the PQRSF settings shares: the edit dialog, the
// table chrome and the row actions.

// ── Generic edit dialog ──

export interface FormField {
  key: string;
  label: string;
  /** `select` picks one of `options`; `multi` marks any of them. */
  kind: "text" | "number" | "checkbox" | "select" | "multi";
  optional?: boolean;
  hint?: string;
  /** Codes are identifiers the automations use: set once, never edited. */
  createOnly?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: { value: string; label: string }[];
}

export type Values = Record<string, string | boolean | string[]>;

const sameValue = (a: Values[string] | undefined, b: Values[string] | undefined) =>
  Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify([...((a as string[]) ?? [])].sort()) ===
      JSON.stringify([...((b as string[]) ?? [])].sort())
    : a === b;

export function EditDialog({
  title,
  fields,
  initial,
  isCreate,
  onSubmit,
  onClose,
}: {
  title: string;
  fields: FormField[];
  initial: Values;
  isCreate: boolean;
  onSubmit: (values: Values, changed: string[]) => Promise<unknown>;
  onClose: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);
  const visible = fields.filter((field) => isCreate || !field.createOnly);
  const changed = visible
    .map((field) => field.key)
    .filter((key) => !sameValue(values[key], initial[key]));

  const set = (key: string, value: Values[string]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} isForm title={title}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!isCreate && changed.length === 0) return onClose();
          // Checkbox groups have no `required` of their own.
          const emptyGroup = visible.find(
            (field) =>
              field.kind === "multi" && !field.optional && ((values[field.key] as string[]) ?? []).length === 0
          );
          if (emptyGroup) {
            setError(`Marca al menos una opción en «${emptyGroup.label}».`);
            return;
          }
          setPending(true);
          setError(null);
          try {
            await onSubmit(values, changed);
            onClose();
          } catch (caught) {
            setError(errorMessage(caught));
          } finally {
            setPending(false);
          }
        }}
      >
        {visible.map((field) => {
          const fieldId = `${id}-${field.key}`;
          const hintId = field.hint ? `${fieldId}-hint` : undefined;

          if (field.kind === "checkbox") {
            return (
              <label key={field.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => set(field.key, event.target.checked)}
                />
                <span>
                  <span className="block font-medium">{field.label}</span>
                  {field.hint && (
                    <span className="block text-[13px] text-text-secondary">{field.hint}</span>
                  )}
                </span>
              </label>
            );
          }

          if (field.kind === "multi") {
            const selected = (values[field.key] as string[] | undefined) ?? [];
            return (
              <fieldset key={field.key} aria-describedby={hintId} className="space-y-1.5">
                <legend className="mb-1.5 text-[13px] font-medium leading-[1.4]">
                  {field.label}
                  {field.optional && <span className="font-normal text-text-secondary"> (opcional)</span>}
                </legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {(field.options ?? []).map((option) => (
                    <label key={option.value} className="flex min-h-9 items-center gap-2 text-sm max-md:min-h-11">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        checked={selected.includes(option.value)}
                        onChange={(event) =>
                          set(
                            field.key,
                            event.target.checked
                              ? [...selected, option.value]
                              : selected.filter((value) => value !== option.value)
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {field.hint && (
                  <p id={hintId} className="text-[13px] text-text-secondary">
                    {field.hint}
                  </p>
                )}
              </fieldset>
            );
          }

          return (
            <Field
              key={field.key}
              label={field.label}
              htmlFor={fieldId}
              optional={field.optional}
              hint={field.hint}
            >
              {field.kind === "select" ? (
                <Dropdown
                  id={fieldId}
                  options={field.options ?? []}
                  value={String(values[field.key] ?? "")}
                  onValueChange={(value) => set(field.key, value)}
                  aria-label={field.label}
                  aria-describedby={hintId}
                />
              ) : (
                <Input
                  id={fieldId}
                  type={field.kind}
                  required={!field.optional}
                  min={field.min}
                  max={field.max}
                  maxLength={field.maxLength}
                  inputMode={field.kind === "number" ? "numeric" : undefined}
                  className={field.kind === "number" ? "tabular w-32" : undefined}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                  aria-describedby={hintId}
                />
              )}
            </Field>
          );
        })}
        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || (!isCreate && changed.length === 0)}>
            {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isCreate ? "Crear" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export const pick = (values: Values, keys: string[], numeric: string[] = []) =>
  Object.fromEntries(
    keys.map((key) => [key, numeric.includes(key) ? Number(values[key]) : values[key]])
  );

// ── Shared table chrome ──

export function SettingsTable({
  caption,
  headers,
  action,
  children,
}: {
  caption: React.ReactNode;
  headers: { label: string; align?: "right" }[];
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-prose text-[13px] text-text-secondary">{caption}</div>
        {action}
      </div>
      {/* `relative` keeps the header's sr-only «Acciones» (absolute) inside the scroller:
          without it, it sits at the table's far edge and makes the whole page scroll sideways on a phone. */}
      <div className="relative overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.label}
                  scope="col"
                  className={cn("px-3 py-2 whitespace-nowrap", header.align === "right" && "text-right")}
                >
                  {header.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>;
}

export function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="max-md:size-11"
      aria-label={`Editar ${label}`}
      title="Editar"
      onClick={onClick}
    >
      <Pencil aria-hidden="true" />
    </Button>
  );
}

export function ToggleActive({
  name,
  active,
  onToggle,
}: {
  name: string;
  active: boolean;
  onToggle: () => Promise<unknown>;
}) {
  const [isPending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="max-md:h-11"
      disabled={isPending}
      onClick={async () => {
        setPending(true);
        try {
          await onToggle();
          toast.success(`«${name}» ${active ? "desactivado" : "activado"}.`);
        } catch (error) {
          toast.error(errorMessage(error), { duration: Infinity });
        } finally {
          setPending(false);
        }
      }}
    >
      {active ? "Desactivar" : "Activar"}
    </Button>
  );
}

export function Actions({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1.5"><div className="flex items-center justify-end gap-1">{children}</div></td>;
}
