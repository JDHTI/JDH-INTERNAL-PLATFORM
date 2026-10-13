"use client";

import { useId, useState } from "react";

import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError } from "@/shared/lib/api-client";

import { useCreateSpecialCase, useUpdateSpecialCase } from "../hooks/use-supports";
import { CASE_STATUS_LABELS, PRIORITY_LABELS } from "../lib/format";
import type {
  SpecialCase,
  SpecialCaseInput,
  SpecialCasePatch,
  SpecialCasePriority,
  SpecialCaseStatus,
} from "../types/support.types";
import { failureMessage } from "./support-actions";
import BasePicker, { CUSTOMER_PICKER, SUPPLIER_PICKER } from "./base-picker";

const STATUS_OPTIONS = Object.entries(CASE_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

interface Draft {
  title: string;
  request: string;
  rule_to_program: string;
  status: SpecialCaseStatus;
  priority: SpecialCasePriority;
  assignee: string;
  resolution: string;
  customer_name: string;
}

function draftOf(existing: SpecialCase | null): Draft {
  return {
    title: existing?.title ?? "",
    request: existing?.request ?? "",
    rule_to_program: existing?.rule_to_program ?? "",
    status: existing?.status ?? "pendiente",
    priority: existing?.priority ?? "media",
    assignee: existing?.assignee ?? "",
    resolution: existing?.resolution ?? "",
    customer_name: existing?.customer_name ?? "",
  };
}

const orNull = (text: string) => text.trim() || null;

/**
 * Opens a case (no `existing`) or follows one up. The form is keyed by the
 * case's version, so after a 409 it restarts from what the API holds now.
 */
export default function SpecialCaseDialog({
  open,
  existing,
  onClose,
  onForbidden,
}: {
  open: boolean;
  existing: SpecialCase | null;
  onClose: () => void;
  onForbidden: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={existing ? `Seguimiento de ${existing.code}` : "Nuevo caso especial"}
      description={
        existing
          ? undefined
          : "Una petición sobre un cliente puntual, para hacerle seguimiento y programar su regla."
      }
      isForm
      wide
    >
      {open && (
        <CaseForm
          key={existing ? `${existing.id}-${existing.version}` : "new"}
          existing={existing}
          onClose={onClose}
          onForbidden={onForbidden}
        />
      )}
    </Dialog>
  );
}

function CaseForm({
  existing,
  onClose,
  onForbidden,
}: {
  existing: SpecialCase | null;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const id = useId();
  const create = useCreateSpecialCase();
  const update = useUpdateSpecialCase();
  const [initial] = useState(() => draftOf(existing));
  const [draft, setDraft] = useState(initial);
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(
    existing?.supplier_code ? { value: existing.supplier_code, label: existing.supplier_name ?? existing.supplier_code } : null
  );
  const [customer, setCustomer] = useState<AutocompleteOption | null>(
    existing?.customer_nit ? { value: existing.customer_nit, label: existing.customer_name ?? existing.customer_nit } : null
  );
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const changed = <K extends keyof Draft>(key: K) => initial[key] !== draft[key];

  const handleError = (failure: unknown) => {
    if (failure instanceof ApiError && failure.status === 403) {
      onForbidden();
      onClose();
    } else {
      setError(failureMessage(failure));
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!existing) {
      const input: SpecialCaseInput = {
        title: draft.title.trim(),
        request: draft.request.trim(),
        rule_to_program: orNull(draft.rule_to_program),
        supplier_code: supplier?.value ?? null,
        customer_nit: customer?.value ?? null,
        customer_name: orNull(draft.customer_name) ?? customer?.label ?? null,
        status: draft.status,
        priority: draft.priority,
        assignee: orNull(draft.assignee),
      };
      create.mutate(input, { onSuccess: onClose, onError: handleError });
      return;
    }

    const patch: SpecialCasePatch = { version: existing.version };
    if (changed("title")) patch.title = draft.title.trim();
    if (changed("request")) patch.request = draft.request.trim();
    if (changed("rule_to_program")) patch.rule_to_program = orNull(draft.rule_to_program);
    if (changed("status")) patch.status = draft.status;
    if (changed("priority")) patch.priority = draft.priority;
    if (changed("assignee")) patch.assignee = orNull(draft.assignee);
    if (changed("resolution")) patch.resolution = orNull(draft.resolution);
    if (changed("customer_name")) patch.customer_name = orNull(draft.customer_name);
    if ((supplier?.value ?? null) !== existing.supplier_code) patch.supplier_code = supplier?.value ?? null;
    if ((customer?.value ?? null) !== existing.customer_nit) patch.customer_nit = customer?.value ?? null;
    update.mutate({ id: existing.id, patch }, { onSuccess: onClose, onError: handleError });
  };

  const dirty =
    !existing ||
    (Object.keys(initial) as (keyof Draft)[]).some((key) => changed(key)) ||
    (supplier?.value ?? null) !== existing.supplier_code ||
    (customer?.value ?? null) !== existing.customer_nit;
  const valid = draft.title.trim() !== "" && draft.request.trim() !== "";

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Título" htmlFor={`${id}-title`}>
        <Input id={`${id}-title`} value={draft.title} onChange={(e) => set("title", e.target.value)} autoFocus={!existing} />
      </Field>
      <Field label="Petición" htmlFor={`${id}-request`}>
        <Textarea id={`${id}-request`} rows={4} value={draft.request} onChange={(e) => set("request", e.target.value)} />
      </Field>
      <Field label="Regla por programar" htmlFor={`${id}-rule`} hint="Lo que el sistema debe hacer, en palabras." optional>
        <Textarea id={`${id}-rule`} rows={3} value={draft.rule_to_program} onChange={(e) => set("rule_to_program", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <BasePicker config={SUPPLIER_PICKER} selected={supplier} onSelect={setSupplier} onClear={() => setSupplier(null)} />
        <BasePicker
          config={CUSTOMER_PICKER}
          selected={customer}
          onSelect={(option) => {
            setCustomer(option);
            if (draft.customer_name.trim() === "") set("customer_name", option.label);
          }}
          onClear={() => setCustomer(null)}
        />
        <Field label="Nombre del cliente" htmlFor={`${id}-cname`} hint="Para un cliente sin NIT definido." optional>
          <Input id={`${id}-cname`} value={draft.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
        </Field>
        <Field label="Responsable" htmlFor={`${id}-assignee`} optional>
          <Input id={`${id}-assignee`} value={draft.assignee} onChange={(e) => set("assignee", e.target.value)} />
        </Field>
        <Field label="Estado" htmlFor={`${id}-status`}>
          <Dropdown id={`${id}-status`} value={draft.status} options={STATUS_OPTIONS} onValueChange={(v) => set("status", v as SpecialCaseStatus)} />
        </Field>
        <Field label="Prioridad" htmlFor={`${id}-priority`}>
          <Dropdown id={`${id}-priority`} value={draft.priority} options={PRIORITY_OPTIONS} onValueChange={(v) => set("priority", v as SpecialCasePriority)} />
        </Field>
      </div>

      {existing && (
        <Field label="Resolución" htmlFor={`${id}-resolution`} hint="Qué se decidió o se hizo." optional>
          <Textarea id={`${id}-resolution`} rows={3} value={draft.resolution} onChange={(e) => set("resolution", e.target.value)} />
        </Field>
      )}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid || !dirty || pending}>
          {pending ? "Guardando" : existing ? "Guardar seguimiento" : "Abrir caso"}
        </Button>
      </DialogFooter>
    </form>
  );
}
