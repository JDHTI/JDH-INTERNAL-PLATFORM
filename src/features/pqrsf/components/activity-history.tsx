"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CloudOff, History, Loader2, Lock } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useActivity, useLastSeen } from "../hooks/use-pqrsf";
import { formatDateTime, formatRelativeTime, PQRSF_TIME_ZONE, personName } from "../lib/format";
import { inboxHref } from "../lib/inbox-state";
import { ACCESS_EVENT_TYPES, accessSentence, groupAccess, type TimelineEntry } from "../lib/timeline";
import type { ActivityEvent, ActivityFilters, Person } from "../types/pqrsf.types";
import { EventSentence, RailIcon, eventIcon } from "./event-line";
import { AssigneeSelect } from "./pickers";

type Scope = "all" | "changes" | "access";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "changes", label: "Solo cambios" },
  { value: "access", label: "Solo accesos" },
];

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: PQRSF_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("es-CO", {
  timeZone: PQRSF_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeLabel = new Intl.DateTimeFormat("es-CO", {
  timeZone: PQRSF_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function groupByDay(events: ActivityEvent[]): { key: string; label: string; items: ActivityEvent[] }[] {
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86_400_000));
  const groups: { key: string; label: string; items: ActivityEvent[] }[] = [];
  for (const event of events) {
    const date = new Date(event.created_at);
    const key = dayKey.format(date);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label = key === today ? "Hoy" : key === yesterday ? "Ayer" : dayLabel.format(date);
      group = { key, label: label.replace(/^./, (c) => c.toUpperCase()), items: [] };
      groups.push(group);
    }
    group.items.push(event);
  }
  return groups;
}

/**
 * Everything that happened in PQRSF, newest first: changes to cases, who
 * opened each one and who entered the inbox. It keeps what a deleted case
 * went through, so "I never saw it" can be checked. Managers only.
 */
export default function ActivityHistory({ area }: { area: string }) {
  const id = useId();
  const [scope, setScope] = useState<Scope>("all");
  const [code, setCode] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const caseCode = useDebouncedValue(code.trim());

  const filters: ActivityFilters = {
    case_code: caseCode || undefined,
    actor_user_id: person?.id,
    include_access: scope !== "changes",
    event_type: scope === "access" ? [...ACCESS_EVENT_TYPES] : undefined,
  };
  const activity = useActivity(filters);

  const back = (
    <Link
      href={inboxHref(area)}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a la bandeja
    </Link>
  );

  const forbidden = activity.error instanceof ApiError && activity.error.status === 403;

  return (
    <div className="space-y-6">
      {back}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Historial de PQRSF</h1>
        <p className="text-sm text-text-secondary">
          Quién hizo qué y cuándo en todos los casos, incluidos los eliminados, y quién entró a la
          bandeja. Los accesos se guardan 90 días; los cambios, siempre.
        </p>
      </div>

      {forbidden ? (
        <StatePanel icon={Lock} title="El historial es para quienes gestionan PQRSF">
          Pide acceso al área de Calidad si necesitas revisar la actividad del módulo.
        </StatePanel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-labelledby={`${id}-feed`} className="min-w-0 space-y-4">
            <h2 id={`${id}-feed`} className="sr-only">
              Actividad
            </h2>
            <form
              role="search"
              aria-label="Filtros del historial"
              onSubmit={(event) => event.preventDefault()}
              className="grid gap-3 sm:grid-cols-3"
            >
              <div className="space-y-1.5">
                <label htmlFor={`${id}-code`} className="block text-[13px] font-medium">
                  Consecutivo
                </label>
                <Input
                  id={`${id}-code`}
                  type="search"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="P26MD0001"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-person`} className="block text-[13px] font-medium">
                  Persona
                </label>
                <AssigneeSelect id={`${id}-person`} value={person} onChange={setPerson} placeholder="Todas" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${id}-scope`} className="block text-[13px] font-medium">
                  Mostrar
                </label>
                <Dropdown
                  id={`${id}-scope`}
                  aria-label="Qué mostrar"
                  value={scope}
                  onValueChange={(value) => setScope(value as Scope)}
                  options={SCOPES}
                />
              </div>
            </form>

            <Feed query={activity} area={area} />
          </section>

          <LastSeenPanel />
        </div>
      )}
    </div>
  );
}

function Feed({
  query,
  area,
}: {
  query: ReturnType<typeof useActivity>;
  area: string;
}) {
  if (query.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="sr-only">Cargando historial</span>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-md bg-canvas-subtle" />
        ))}
      </div>
    );
  }
  if (query.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargó el historial"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }

  const events = query.data.pages.flatMap((page) => page.items);
  if (events.length === 0) {
    return (
      <StatePanel icon={History} title="Nada registrado con estos filtros">
        Cambia el consecutivo, la persona o lo que se muestra.
      </StatePanel>
    );
  }

  return (
    <div className="space-y-5">
      {groupByDay(events).map((group) => (
        <section key={group.key} aria-label={group.label} className="space-y-1">
          <h3 className="text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            {group.label}
          </h3>
          <ol className="divide-y divide-border rounded-lg border border-border">
            {/* Accesses fold only within the same case (or the inbox): «Abrieron
                el caso: Ana, Juan» next to its code. */}
            {groupAccess(group.items, (event) => `${event.event_type}:${event.case_id ?? event.case_code ?? ""}`).map(
              (entry) => (
                <Entry
                  key={entry.kind === "access" ? entry.key : entry.event.id}
                  entry={entry}
                  area={area}
                />
              )
            )}
          </ol>
        </section>
      ))}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="max-md:h-11"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden="true" />}
            Cargar más antiguos
          </Button>
        </div>
      )}
    </div>
  );
}

function Entry({ entry, area }: { entry: TimelineEntry<ActivityEvent>; area: string }) {
  // A folded access line takes the time of its latest access.
  const event = entry.kind === "access" ? entry.events.at(-1)! : entry.event;
  const sentence =
    entry.kind === "access"
      ? accessSentence(entry)
      : { actor: event.actor_name, title: event.title };
  const isMessage = event.event_type === "comment" || event.event_type === "supplier_message";
  return (
    <li className="flex gap-3 px-3 py-2.5">
      <time
        dateTime={event.created_at}
        title={formatDateTime(event.created_at)}
        className="tabular w-12 shrink-0 pt-0.5 text-[13px] text-text-secondary"
      >
        {timeLabel.format(new Date(event.created_at))}
      </time>
      <RailIcon icon={eventIcon(event)} />
      <div className="min-w-0 flex-1 pt-0.5">
        <EventSentence
          actor={sentence.actor}
          title={sentence.title}
          statusChange={entry.kind === "event" ? event.status_change : null}
          muted={entry.kind === "access"}
        >
          {event.case_code && <CaseCode event={event} area={area} />}
        </EventSentence>
        {entry.kind === "event" && event.note && (
          <p
            className={cn(
              "mt-1 text-[13px] whitespace-pre-wrap",
              isMessage
                ? "rounded-md bg-canvas-subtle px-3 py-2 text-text-primary"
                : "text-text-secondary"
            )}
          >
            {event.event_type === "deleted" ? `Motivo: ${event.note}` : event.note}
          </p>
        )}
      </div>
    </li>
  );
}

/** A live case links to itself; a deleted one keeps its code, marked as gone. */
function CaseCode({ event, area }: { event: ActivityEvent; area: string }) {
  if (event.case_id) {
    return (
      <Link
        href={`/${area}/pqrsf/${event.case_id}`}
        className="rounded-sm font-mono text-[13px] font-medium text-text-primary underline-offset-2 hover:underline"
      >
        {event.case_code}
      </Link>
    );
  }
  return (
    <span className="font-mono text-[13px]">
      {event.case_code} <span className="font-sans text-text-secondary">(eliminado)</span>
    </span>
  );
}

/** Who entered the inbox and when: the «last connection» of each person. */
function LastSeenPanel() {
  const id = useId();
  const lastSeen = useLastSeen();

  return (
    <aside aria-labelledby={`${id}-heading`} className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <div className="space-y-0.5">
        <h2 id={`${id}-heading`} className="text-base font-semibold">
          Últimas conexiones
        </h2>
        <p className="text-[13px] text-text-secondary">Última entrada a la bandeja, en 90 días.</p>
      </div>
      {lastSeen.isPending ? (
        <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" />
      ) : lastSeen.error ? (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(lastSeen.error)}
        </p>
      ) : lastSeen.data.length === 0 ? (
        <p className="text-sm text-text-secondary">Nadie ha entrado a la bandeja todavía.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {lastSeen.data.map((row) => (
            <li key={row.user.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">{personName(row.user)}</span>
                {row.user.email && row.user.display_name && (
                  <span className="block truncate text-[13px] text-text-secondary">
                    {row.user.email}
                  </span>
                )}
              </span>
              <time
                dateTime={row.last_seen_at}
                title={formatDateTime(row.last_seen_at)}
                className="shrink-0 text-[13px] whitespace-nowrap text-text-secondary"
              >
                {formatRelativeTime(row.last_seen_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
