"use client";

import { useId, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { usePeople } from "@/features/pqrsf/hooks/use-pqrsf";
import type { Person } from "@/features/pqrsf/types/pqrsf.types";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { PersonSelect, personLabel, usePersonSearchState } from "@/shared/components/ui/person-select";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import {
  useCreatePlan,
  usePlanCatalog,
  useMarkDone,
  useRateActivity,
  useReplaceActivities,
  useReplaceCauses,
  useReplaceCorrections,
  useUpdatePlan,
  useUploadEvidence,
} from "../hooks/use-action-plans";
import { usePlanLabels } from "../hooks/use-plan-labels";
import { RATING_FOR_TYPE, hasAnalysis } from "../lib/labels";
import type {
  Activity,
  ActivityInput,
  Cause,
  CauseCategory,
  CauseInput,
  Correction,
  CorrectionInput,
  Effective,
  Plan,
  PlanHeaderInput,
} from "../types/action-plans.types";

const MB = 1024 * 1024;
const MAX_FILE_BYTES = 10 * MB;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp";
const MAX_RESPONSIBLES = 10;
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}

// ── Header: a new action, or the registration of an existing one ──

interface HeaderValues {
  origin: string;
  process_id: string;
  action_type: string;
  reported_on: string;
  rating: string;
  reporter_nit: string;
  reporter_name: string;
  reporter_company_role: string;
  city: string;
  registered_on: string;
  unmet_requirement: string;
  finding: string;
  has_photos: boolean;
  has_history: boolean;
  analysis_method: string;
}

function headerOf(plan: Plan | null): HeaderValues {
  return {
    origin: plan?.origin ?? "",
    process_id: plan?.process.id ?? "",
    action_type: plan?.action_type ?? "",
    reported_on: plan?.reported_on ?? todayIso(),
    rating: plan?.rating ?? "",
    reporter_nit: plan?.reporter_nit ?? "",
    reporter_name: plan?.reporter_name ?? "",
    reporter_company_role: plan?.reporter_company_role ?? "",
    city: plan?.city ?? "",
    registered_on: plan?.registered_on ?? "",
    unmet_requirement: plan?.unmet_requirement ?? "",
    finding: plan?.finding ?? "",
    has_photos: plan?.has_photos ?? false,
    has_history: plan?.has_history ?? false,
    analysis_method: plan?.analysis_method ?? "",
  };
}

const TEXT_KEYS = [
  "reporter_nit",
  "reporter_name",
  "reporter_company_role",
  "city",
  "unmet_requirement",
  "finding",
] as const;

function HeaderForm({
  initial,
  isCreate,
  pending,
  error,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initial: HeaderValues;
  isCreate: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: PlanHeaderInput) => void;
  submitLabel: string;
}) {
  const id = useId();
  const catalog = usePlanCatalog();
  const [values, setValues] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const set = <K extends keyof HeaderValues>(key: K, value: HeaderValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const withAnalysis = !values.action_type || hasAnalysis(values.action_type);

  const submit = () => {
    if (isCreate && (!values.origin || !values.process_id || !values.action_type)) {
      return setProblem("Elige el origen, la procedencia y el tipo de acción.");
    }
    if (!values.reported_on) return setProblem("Elige la fecha.");
    setProblem(null);

    const input: PlanHeaderInput = {};
    const changed = (key: keyof HeaderValues) => isCreate || values[key] !== initial[key];
    if (changed("origin") && values.origin) input.origin = values.origin as PlanHeaderInput["origin"];
    if (changed("process_id") && values.process_id) input.process_id = values.process_id;
    if (changed("action_type") && values.action_type) input.action_type = values.action_type as PlanHeaderInput["action_type"];
    if (changed("reported_on")) input.reported_on = values.reported_on;
    // The rating is proposed from the type; left empty on create, the API keeps its own default.
    if (changed("rating")) input.rating = (values.rating || null) as PlanHeaderInput["rating"];
    if (changed("registered_on")) input.registered_on = values.registered_on || null;
    for (const key of TEXT_KEYS) {
      if (changed(key)) input[key] = values[key].trim() || null;
    }
    if (changed("has_photos")) input.has_photos = values.has_photos;
    if (changed("has_history")) input.has_history = values.has_history;
    if (changed("analysis_method")) input.analysis_method = (values.analysis_method || null) as PlanHeaderInput["analysis_method"];
    onSubmit(input);
  };

  const options = (list: { value: string; label: string }[] | undefined) =>
    (list ?? []).map((option) => ({ value: option.value, label: option.label }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Origen" htmlFor={`${id}-origin`}>
          <Dropdown
            id={`${id}-origin`}
            aria-label="Origen"
            placeholder="Elige el origen"
            value={values.origin}
            onValueChange={(value) => set("origin", value)}
            options={options(catalog.data?.origins)}
          />
        </Field>
        <Field label="Procedencia" htmlFor={`${id}-process`} hint="El proceso del SIG de donde viene.">
          <Dropdown
            id={`${id}-process`}
            aria-label="Procedencia"
            placeholder="Elige el proceso"
            value={values.process_id}
            onValueChange={(value) => set("process_id", value)}
            options={(catalog.data?.processes ?? [])
              .filter((process) => process.is_active || process.id === initial.process_id)
              .map((process) => ({ value: process.id, label: `${process.code} · ${process.name}` }))}
          />
        </Field>
        <Field label="Tipo de acción" htmlFor={`${id}-type`}>
          <Dropdown
            id={`${id}-type`}
            aria-label="Tipo de acción"
            placeholder="Elige el tipo"
            value={values.action_type}
            onValueChange={(value) => {
              setValues((current) => ({
                ...current,
                action_type: value,
                // The rating follows the type until someone picks another one.
                rating: !current.rating || current.rating === RATING_FOR_TYPE[current.action_type] ? (RATING_FOR_TYPE[value] ?? "") : current.rating,
              }));
            }}
            options={options(catalog.data?.action_types)}
          />
        </Field>
        <Field label="Calificación" htmlFor={`${id}-rating`} hint="Se propone según el tipo.">
          <Dropdown
            id={`${id}-rating`}
            aria-label="Calificación"
            placeholder="Según el tipo"
            clearable
            clearLabel="Quitar la calificación"
            value={values.rating}
            onValueChange={(value) => set("rating", value)}
            options={options(catalog.data?.ratings)}
          />
        </Field>
        <Field label="Fecha" htmlFor={`${id}-date`}>
          <DatePicker id={`${id}-date`} value={values.reported_on} onChange={(value) => set("reported_on", value)} placeholder="Elige la fecha" />
        </Field>
        <Field label="Fecha de registro" htmlFor={`${id}-registered`} optional>
          <DatePicker
            id={`${id}-registered`}
            value={values.registered_on}
            onChange={(value) => set("registered_on", value)}
            placeholder="Elige la fecha"
            clearable
          />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-md border border-border p-3">
        <legend className="px-1 text-[13px] font-medium">Quién identifica</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIT" htmlFor={`${id}-nit`} optional>
            <Input id={`${id}-nit`} value={values.reporter_nit} maxLength={30} onChange={(event) => set("reporter_nit", event.target.value)} />
          </Field>
          <Field label="Nombre" htmlFor={`${id}-name`} optional>
            <Input id={`${id}-name`} value={values.reporter_name} maxLength={200} onChange={(event) => set("reporter_name", event.target.value)} />
          </Field>
          <Field label="Empresa y cargo" htmlFor={`${id}-company`} optional>
            <Input id={`${id}-company`} value={values.reporter_company_role} maxLength={300} onChange={(event) => set("reporter_company_role", event.target.value)} />
          </Field>
          <Field label="Ciudad" htmlFor={`${id}-city`} optional>
            <Input id={`${id}-city`} value={values.city} maxLength={80} onChange={(event) => set("city", event.target.value)} />
          </Field>
        </div>
      </fieldset>

      <Field label="Requisito incumplido" htmlFor={`${id}-requirement`} optional>
        <Textarea id={`${id}-requirement`} value={values.unmet_requirement} maxLength={5000} onChange={(event) => set("unmet_requirement", event.target.value)} className="min-h-16 resize-y" />
      </Field>
      <Field label="Hallazgo" htmlFor={`${id}-finding`} optional>
        <Textarea id={`${id}-finding`} value={values.finding} maxLength={5000} onChange={(event) => set("finding", event.target.value)} className="min-h-24 resize-y" />
      </Field>

      <div className="space-y-2">
        <Check label="Tiene registro fotográfico" checked={values.has_photos} onChange={(value) => set("has_photos", value)} />
        <Check label="Tiene antecedentes" checked={values.has_history} onChange={(value) => set("has_history", value)} />
      </div>

      {withAnalysis && (
        <Field label="Método de análisis" htmlFor={`${id}-method`} optional hint="Una acción de mejora no lleva análisis de causas.">
          <Dropdown
            id={`${id}-method`}
            aria-label="Método de análisis"
            placeholder="Sin método"
            clearable
            clearLabel="Quitar el método"
            value={values.analysis_method}
            onValueChange={(value) => set("analysis_method", value)}
            options={options(catalog.data?.methods)}
          />
        </Field>
      )}

      <DialogError message={problem ?? error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Submit pending={pending}>{submitLabel}</Submit>
      </DialogFooter>
    </form>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0">
      <input type="checkbox" className="size-4 shrink-0 accent-[var(--primary)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function NewPlanDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreatePlan();
  return (
    <Dialog open isForm onOpenChange={(open) => !open && !create.isPending && onClose()} title="Nueva acción" description="El código y el número los pone la plataforma. Después se agregan las correcciones, las causas y el plan.">
      <HeaderForm
        initial={headerOf(null)}
        isCreate
        pending={create.isPending}
        error={create.error ? errorMessage(create.error) : null}
        onCancel={onClose}
        submitLabel="Crear acción"
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (detail) => {
              toast.success(`Acción ${detail.plan.code} creada.`);
              onClose();
              onCreated(detail.plan.id);
            },
          })
        }
      />
    </Dialog>
  );
}

export function EditHeaderDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const update = useUpdatePlan(plan.id);
  return (
    <Dialog open isForm onOpenChange={(open) => !open && !update.isPending && onClose()} title={`Registro de ${plan.code}`}>
      <HeaderForm
        initial={headerOf(plan)}
        isCreate={false}
        pending={update.isPending}
        error={update.error ? errorMessage(update.error) : null}
        onCancel={onClose}
        submitLabel="Guardar cambios"
        onSubmit={(input) => {
          if (Object.keys(input).length === 0) return onClose();
          update.mutate(input, { onSuccess: onClose });
        }}
      />
    </Dialog>
  );
}

// ── Responsibles: platform people by id, plus the free text the old Excel only had ──

function Responsibles({
  id,
  ids,
  named,
  onChange,
}: {
  id: string;
  ids: string[];
  /** Names of the people picked in this dialog; the API sends ids only. */
  named: Record<string, Person>;
  onChange: (ids: string[], named: Record<string, Person>) => void;
}) {
  const search = usePersonSearchState();
  const people = usePeople(search.q, search.enabled);
  const results = (people.data ?? []).filter((person) => !ids.includes(person.id));
  const isFull = ids.length >= MAX_RESPONSIBLES;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        Personas de la plataforma <span className="font-normal text-text-secondary">(opcional)</span>
      </label>
      {ids.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {ids.map((personId) => {
            const person = named[personId];
            const label = person ? personLabel(person) : "Persona asignada";
            return (
              <li key={personId} className="flex max-w-full items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]">
                <span className="min-w-0 truncate" title={person?.email ?? undefined}>
                  {label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 max-md:size-11"
                  aria-label={`Quitar a ${label}`}
                  onClick={() => onChange(ids.filter((other) => other !== personId), named)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <PersonSelect<Person>
        id={id}
        value={null}
        onChange={(person) => {
          if (person && !ids.includes(person.id)) onChange([...ids, person.id], { ...named, [person.id]: person });
        }}
        results={results}
        isFetching={people.isFetching}
        onQueryChange={search.onQueryChange}
        onOpenChange={search.onOpenChange}
        placeholder={isFull ? `Máximo ${MAX_RESPONSIBLES} personas` : "Agregar un responsable"}
        clearLabel="Quitar persona"
        popupLabel="Buscar persona de la organización"
        emptyText="Nadie coincide con esa búsqueda."
        disabled={isFull}
      />
      <p className="text-[13px] text-text-secondary">Reciben un aviso y pueden marcar la fila como realizada y subir evidencias.</p>
    </div>
  );
}

// ── Corrections and activities: one editor for both lists ──

interface RowDraft {
  key: string;
  id?: string;
  description: string;
  responsible_text: string;
  responsible_user_ids: string[];
  due_on: string;
  evidence_note: string;
  follow_up_text: string;
  follow_up_due_on: string;
}

let draftSeq = 0;
const newDraft = (): RowDraft => ({
  key: `new-${++draftSeq}`,
  description: "",
  responsible_text: "",
  responsible_user_ids: [],
  due_on: "",
  evidence_note: "",
  follow_up_text: "",
  follow_up_due_on: "",
});

const draftOf = (row: Correction | Activity): RowDraft => ({
  key: row.id,
  id: row.id,
  description: row.description,
  responsible_text: row.responsible_text ?? "",
  responsible_user_ids: row.responsible_user_ids,
  due_on: row.due_on ?? "",
  evidence_note: row.evidence_note ?? "",
  follow_up_text: "follow_up_text" in row ? (row.follow_up_text ?? "") : "",
  follow_up_due_on: "follow_up_due_on" in row ? (row.follow_up_due_on ?? "") : "",
});

function RowsDialog({
  title,
  description,
  noun,
  rows,
  withFollowUp,
  pending,
  error,
  onClose,
  onSave,
}: {
  title: string;
  description: string;
  noun: string;
  rows: (Correction | Activity)[];
  withFollowUp: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (rows: ActivityInput[]) => void;
}) {
  const id = useId();
  const [drafts, setDrafts] = useState<RowDraft[]>(() => (rows.length > 0 ? rows.map(draftOf) : [newDraft()]));
  const [named, setNamed] = useState<Record<string, Person>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const patch = (key: string, change: Partial<RowDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));

  const submit = () => {
    const filled = drafts.filter((draft) => draft.description.trim() || draft.id);
    if (filled.some((draft) => !draft.description.trim())) return setProblem(`Escribe la descripción de cada ${noun}, o quítala.`);
    setProblem(null);
    onSave(
      filled.map((draft) => ({
        ...(draft.id ? { id: draft.id } : {}),
        description: draft.description.trim(),
        responsible_text: draft.responsible_text.trim() || null,
        responsible_user_ids: draft.responsible_user_ids,
        due_on: draft.due_on || null,
        evidence_note: draft.evidence_note.trim() || null,
        ...(withFollowUp
          ? { follow_up_text: draft.follow_up_text.trim() || null, follow_up_due_on: draft.follow_up_due_on || null }
          : {}),
      }))
    );
  };

  return (
    <Dialog open isForm wide onOpenChange={(open) => !open && !pending && onClose()} title={title} description={description}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <ol className="space-y-4">
          {drafts.map((draft, index) => {
            const row = `${id}-${draft.key}`;
            return (
              <li key={draft.key} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium">
                    {noun[0].toUpperCase() + noun.slice(1)} <span className="tabular">{index + 1}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="max-md:h-11"
                    aria-label={`Quitar la ${noun} ${index + 1}`}
                    onClick={() => setDrafts((current) => current.filter((other) => other.key !== draft.key))}
                  >
                    <Trash2 aria-hidden="true" />
                    Quitar
                  </Button>
                </div>
                <Field label="Descripción" htmlFor={`${row}-description`}>
                  <Textarea id={`${row}-description`} value={draft.description} maxLength={2000} onChange={(event) => patch(draft.key, { description: event.target.value })} className="min-h-20 resize-y" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Responsables (texto)" htmlFor={`${row}-responsible`} optional hint="Como los escribía el Excel.">
                    <Input id={`${row}-responsible`} value={draft.responsible_text} maxLength={1000} onChange={(event) => patch(draft.key, { responsible_text: event.target.value })} />
                  </Field>
                  <Field label="Fecha límite" htmlFor={`${row}-due`} optional>
                    <DatePicker id={`${row}-due`} value={draft.due_on} onChange={(value) => patch(draft.key, { due_on: value })} placeholder="Elige la fecha" clearable />
                  </Field>
                </div>
                <Responsibles
                  id={`${row}-people`}
                  ids={draft.responsible_user_ids}
                  named={named}
                  onChange={(ids, nextNamed) => {
                    setNamed(nextNamed);
                    patch(draft.key, { responsible_user_ids: ids });
                  }}
                />
                <Field label="Evidencias (descripción)" htmlFor={`${row}-evidence`} optional hint="Qué evidencia se espera o se entregó. Los archivos se suben desde la acción.">
                  <Input id={`${row}-evidence`} value={draft.evidence_note} maxLength={1000} onChange={(event) => patch(draft.key, { evidence_note: event.target.value })} />
                </Field>
                {withFollowUp && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Seguimiento" htmlFor={`${row}-follow`} optional>
                      <Input id={`${row}-follow`} value={draft.follow_up_text} maxLength={1000} onChange={(event) => patch(draft.key, { follow_up_text: event.target.value })} />
                    </Field>
                    <Field label="Fecha del seguimiento" htmlFor={`${row}-follow-date`} optional>
                      <DatePicker id={`${row}-follow-date`} value={draft.follow_up_due_on} onChange={(value) => patch(draft.key, { follow_up_due_on: value })} placeholder="Elige la fecha" clearable />
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <Button type="button" variant="outline" className="max-md:h-11" onClick={() => setDrafts((current) => [...current, newDraft()])}>
          <Plus aria-hidden="true" />
          Agregar {noun}
        </Button>
        <DialogError message={problem ?? error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Submit pending={pending}>Guardar</Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function CorrectionsDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const save = useReplaceCorrections(plan.id);
  return (
    <RowsDialog
      title="Corrección inmediata"
      description="Lo que se hizo de inmediato para contener el hallazgo. Una fila que ya existía conserva su avance."
      noun="corrección"
      rows={plan.corrections}
      withFollowUp={false}
      pending={save.isPending}
      error={save.error ? errorMessage(save.error) : null}
      onClose={onClose}
      onSave={(rows) => save.mutate(rows as CorrectionInput[], { onSuccess: onClose })}
    />
  );
}

export function ActivitiesDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const save = useReplaceActivities(plan.id);
  return (
    <RowsDialog
      title="Plan de acción"
      description="Las actividades, con su responsable y su fecha límite. Una fila que ya existía conserva su avance y su calificación."
      noun="actividad"
      rows={plan.activities_detail}
      withFollowUp
      pending={save.isPending}
      error={save.error ? errorMessage(save.error) : null}
      onClose={onClose}
      onSave={(rows) => save.mutate(rows, { onSuccess: onClose })}
    />
  );
}

// ── Causes ──

interface CauseDraft {
  key: string;
  id?: string;
  description: string;
  category: CauseCategory;
}

let causeSeq = 0;

export function CausesDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const id = useId();
  const labels = usePlanLabels();
  const catalog = usePlanCatalog();
  const save = useReplaceCauses(plan.id);
  const [drafts, setDrafts] = useState<CauseDraft[]>(() =>
    plan.causes.length > 0
      ? plan.causes.map((cause: Cause) => ({ key: cause.id, id: cause.id, description: cause.description, category: cause.category as CauseCategory }))
      : [{ key: `new-${++causeSeq}`, description: "", category: "otra" }]
  );
  const [problem, setProblem] = useState<string | null>(null);
  const patch = (key: string, change: Partial<CauseDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  const categories = (catalog.data?.cause_categories ?? []).map((option) => ({ value: option.value, label: option.label }));

  const submit = () => {
    const filled = drafts.filter((draft) => draft.description.trim() || draft.id);
    if (filled.some((draft) => !draft.description.trim())) return setProblem("Escribe la descripción de cada causa, o quítala.");
    setProblem(null);
    const rows: CauseInput[] = filled.map((draft) => ({
      ...(draft.id ? { id: draft.id } : {}),
      description: draft.description.trim(),
      category: draft.category,
    }));
    save.mutate(rows, { onSuccess: onClose });
  };

  return (
    <Dialog open isForm onOpenChange={(open) => !open && !save.isPending && onClose()} title="Causas" description={`Método: ${plan.analysis_method ? labels.methods(plan.analysis_method) : "sin elegir"}. Cada causa lleva su categoría de las 5M.`}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <ol className="space-y-3">
          {drafts.map((draft, index) => (
            <li key={draft.key} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium">
                  Causa <span className="tabular">{index + 1}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="max-md:h-11" aria-label={`Quitar la causa ${index + 1}`} onClick={() => setDrafts((current) => current.filter((other) => other.key !== draft.key))}>
                  <Trash2 aria-hidden="true" />
                  Quitar
                </Button>
              </div>
              <Field label="Categoría" htmlFor={`${id}-${draft.key}-category`}>
                <Dropdown id={`${id}-${draft.key}-category`} aria-label="Categoría de la causa" value={draft.category} onValueChange={(value) => patch(draft.key, { category: value as CauseCategory })} options={categories} />
              </Field>
              <Field label="Descripción" htmlFor={`${id}-${draft.key}-description`}>
                <Textarea id={`${id}-${draft.key}-description`} value={draft.description} maxLength={2000} onChange={(event) => patch(draft.key, { description: event.target.value })} className="min-h-16 resize-y" />
              </Field>
            </li>
          ))}
        </ol>
        <Button type="button" variant="outline" className="max-md:h-11" onClick={() => setDrafts((current) => [...current, { key: `new-${++causeSeq}`, description: "", category: "otra" }])}>
          <Plus aria-hidden="true" />
          Agregar causa
        </Button>
        <DialogError message={problem ?? (save.error ? errorMessage(save.error) : null)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Submit pending={save.isPending}>Guardar</Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── A row done (and its evidence) ──

/**
 * Marks a correction or an activity as done, or takes the mark back. The
 * evidence files go with it: they are uploaded first, so a refused file shows
 * before the row changes.
 */
export function DoneDialog({
  plan,
  row,
  kind,
  onClose,
}: {
  plan: Plan;
  row: Correction | Activity;
  kind: "corrección" | "actividad";
  onClose: () => void;
}) {
  const id = useId();
  const done = useMarkDone(plan.id);
  const upload = useUploadEvidence(plan.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(row.evidence_note ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const undoing = row.done;
  const pending = done.isPending || upload.isPending;

  const submit = async () => {
    if (files.some((file) => file.size > MAX_FILE_BYTES)) return setProblem("Un archivo pesa más de 10 MB.");
    setProblem(null);
    try {
      if (!undoing && files.length > 0) {
        const result = await upload.mutateAsync({ files, rowId: row.id });
        if (result.rejected.length > 0) {
          toast.warning(`No se subió: ${result.rejected.map((item) => `${item.filename ?? item.name ?? "archivo"} (${item.reason ?? "rechazado"})`).join("; ")}`, { duration: Infinity });
        }
      }
      await done.mutateAsync({ rowId: row.id, done: !undoing, note: note.trim() || null });
      toast.success(undoing ? `La ${kind} volvió a pendiente.` : `La ${kind} quedó realizada.`);
      onClose();
    } catch (error) {
      setProblem(errorMessage(error));
    }
  };

  return (
    <Dialog open isForm onOpenChange={(open) => !open && !pending && onClose()} title={undoing ? `Quitar la marca de realizada` : `Marcar como realizada`} description={row.description}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label="Evidencias (descripción)" htmlFor={`${id}-note`} optional hint="Qué evidencia se entrega.">
          <Textarea id={`${id}-note`} value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} className="min-h-16 resize-y" />
        </Field>
        {!undoing && (
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
                setFiles((current) => [...current, ...Array.from(event.target.files ?? [])].slice(0, 10));
                event.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" className="max-md:h-11" onClick={() => fileInput.current?.click()}>
              <Paperclip aria-hidden="true" />
              Adjuntar archivos
            </Button>
            <span className="ml-2 text-[13px] text-text-secondary">PDF, Office o imágenes, 10 MB por archivo.</span>
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex max-w-full items-center gap-1.5 rounded-md bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]">
                    <FileText className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
                    <span className="min-w-0 truncate">{file.name}</span>
                    <span className="tabular shrink-0 text-text-secondary">{formatBytes(file.size)}</span>
                    <Button type="button" variant="ghost" size="icon-sm" className="size-6 max-md:size-11" aria-label={`Quitar ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogError message={problem} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Submit pending={pending}>{undoing ? "Quitar la marca" : "Marcar como realizada"}</Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── How effective an activity was ──

export function RateDialog({ plan, activity, onClose }: { plan: Plan; activity: Activity; onClose: () => void }) {
  const id = useId();
  const catalog = usePlanCatalog();
  const rate = useRateActivity(plan.id);
  const [effective, setEffective] = useState<Effective>((activity.effective as Effective) || "pendiente");
  const [note, setNote] = useState(activity.effectiveness_note ?? "");
  return (
    <Dialog open isForm onOpenChange={(open) => !open && !rate.isPending && onClose()} title="Eficacia de la actividad" description={activity.description}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          rate.mutate({ activityId: activity.id, effective, note: note.trim() || null }, { onSuccess: () => { toast.success("Eficacia calificada."); onClose(); } });
        }}
      >
        <Field label="¿Fue eficaz?" htmlFor={`${id}-effective`}>
          <Dropdown
            id={`${id}-effective`}
            aria-label="Eficacia"
            value={effective}
            onValueChange={(value) => setEffective(value as Effective)}
            options={(catalog.data?.effectiveness ?? [{ value: "si", label: "Sí" }, { value: "no", label: "No" }, { value: "pendiente", label: "Pendiente" }]).map((option) => ({ value: option.value, label: option.label }))}
          />
        </Field>
        <Field label="Descripción de la eficacia" htmlFor={`${id}-note`} optional>
          <Textarea id={`${id}-note`} value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} className="min-h-20 resize-y" />
        </Field>
        <DialogError message={rate.error ? errorMessage(rate.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={rate.isPending}>
            Cancelar
          </Button>
          <Submit pending={rate.isPending}>Guardar</Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
