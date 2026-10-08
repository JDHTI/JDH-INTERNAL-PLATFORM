"use client";

import { useId, useState } from "react";
import { CalendarClock, CloudOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useNotificationSettings, useUpdateNotificationSettings } from "../hooks/use-pqrsf";
import type { NotificationJob, NotificationSettings } from "../types/pqrsf.types";

type JobKey = "daily_summary" | "overdue_reminder";

const JOBS: { key: JobKey; title: string; summary: string; recipients: string }[] = [
  {
    key: "overdue_reminder",
    title: "Recordatorio de casos vencidos",
    summary:
      "Un correo por persona que agrupa todos sus casos vencidos, con «dale seguimiento». Los vencidos sin responsable llegan a todo Calidad.",
    recipients: "Cada responsable con casos vencidos y el área de Calidad",
  },
  {
    key: "daily_summary",
    title: "Resumen de fin de jornada",
    summary:
      "«Quedaron N casos abiertos sin resolver el día de hoy», con cuántos están vencidos y la lista.",
    recipients: "Todos los miembros del área de Calidad",
  },
];

const sameJob = (a: NotificationJob, b: NotificationJob) =>
  a.enabled === b.enabled && a.time === b.time;

function JobCard({
  job,
  value,
  onChange,
  timezone,
}: {
  job: (typeof JOBS)[number];
  value: NotificationJob;
  onChange: (next: NotificationJob) => void;
  timezone: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id={`${id}-title`} className="text-base font-semibold">
            {job.title}
          </h2>
          <p className="max-w-prose text-sm text-text-secondary">{job.summary}</p>
          <p className="text-[13px] text-text-secondary">Se envía a: {job.recipients}.</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium max-md:min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={value.enabled}
            onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
          />
          Activo
        </label>
      </div>
      <div className="max-w-xs">
        <Field
          label="Hora de envío"
          htmlFor={`${id}-time`}
          hint={`Hora local (${timezone}), solo días hábiles.`}
        >
          <Input
            id={`${id}-time`}
            type="time"
            required
            step={60}
            value={value.time}
            disabled={!value.enabled}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
            aria-describedby={`${id}-time-hint`}
            className="tabular w-32"
          />
        </Field>
      </div>
    </section>
  );
}

function Form({ saved }: { saved: NotificationSettings }) {
  const update = useUpdateNotificationSettings();
  const [draft, setDraft] = useState({
    daily_summary: saved.daily_summary,
    overdue_reminder: saved.overdue_reminder,
  });
  const [error, setError] = useState<string | null>(null);
  const dirty = JOBS.some(({ key }) => !sameJob(draft[key], saved[key]));
  const invalid = JOBS.some(({ key }) => !/^\d{2}:\d{2}$/.test(draft[key].time));

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await update.mutateAsync(draft);
          toast.success("Temporizadores guardados.");
        } catch (cause) {
          setError(errorMessage(cause));
        }
      }}
    >
      {JOBS.map((job) => (
        <JobCard
          key={job.key}
          job={job}
          value={draft[job.key]}
          timezone={saved.timezone}
          onChange={(next) => setDraft((current) => ({ ...current, [job.key]: next }))}
        />
      ))}
      <p className="text-[13px] text-text-secondary">
        Valen para toda la organización y no se envían en fines de semana ni festivos. Por ahora
        cualquier gestor de PQRSF puede cambiarlos.
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!dirty || invalid || update.isPending} className="max-md:h-11">
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!dirty || update.isPending}
          className="max-md:h-11"
          onClick={() =>
            setDraft({ daily_summary: saved.daily_summary, overdue_reminder: saved.overdue_reminder })
          }
        >
          Descartar
        </Button>
      </div>
    </form>
  );
}

/** Settings tab: the two organization-wide timers that email the Calidad team. */
export default function NotificationSettingsPanel() {
  const settings = useNotificationSettings();

  if (settings.isPending) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Cargando temporizadores</span>
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }
  if (settings.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los temporizadores"
        action={
          <Button variant="outline" onClick={() => settings.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(settings.error)}
      </StatePanel>
    );
  }
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <CalendarClock className="size-4" aria-hidden="true" />
        Correos automáticos desde el buzón de PQRSF.
      </p>
      <Form saved={settings.data} />
    </div>
  );
}
