import type { CaseEvent } from "../types/pqrsf.types";

/** The access records, for the history's «Solo accesos» filter (an API query). */
export const ACCESS_EVENT_TYPES = ["viewed", "inbox_opened"] as const;

/**
 * Access says who looked, not what changed. The first read is an access that
 * also moves the case (Recibida → Leída): that one stays an entry of its own.
 */
export const isAccess = (event: Pick<CaseEvent, "category" | "status_change">) =>
  event.category === "access" && !event.status_change;

export type TimelineEntry<T extends CaseEvent> =
  | { kind: "event"; event: T }
  /** Consecutive accesses folded into one line, so they do not bury the story. */
  | { kind: "access"; key: string; events: T[]; names: string[] };

/**
 * Folds runs of consecutive access events that share a `groupKey` (the case,
 * in the module history) into one entry with the people who looked, each
 * named once. Everything else passes through in order.
 */
export function groupAccess<T extends CaseEvent>(
  events: T[],
  groupKey: (event: T) => string = (event) => event.event_type
): TimelineEntry<T>[] {
  const entries: TimelineEntry<T>[] = [];
  for (const event of events) {
    const last = entries.at(-1);
    if (isAccess(event) && last?.kind === "access" && groupKey(last.events[0]) === groupKey(event)) {
      last.events.push(event);
      if (!last.names.includes(event.actor_name)) last.names.push(event.actor_name);
      continue;
    }
    entries.push(
      isAccess(event)
        ? { kind: "access", key: event.id, events: [event], names: [event.actor_name] }
        : { kind: "event", event }
    );
  }
  return entries;
}

// Only the folded line needs a plural the API does not send: «Abrieron el caso».
const ACCESS_PLURAL: Record<string, string> = {
  viewed: "Abrieron el caso",
  inbox_opened: "Entraron a la bandeja",
};

/** «Ana Pérez · Abrió el caso», or «Abrieron el caso: Ana, Juan» for several people. */
export function accessSentence<T extends CaseEvent>(
  entry: Extract<TimelineEntry<T>, { kind: "access" }>
): { actor: string | null; title: string } {
  const first = entry.events[0];
  if (entry.names.length === 1) {
    const times = entry.events.length;
    return { actor: entry.names[0], title: times > 1 ? `${first.title} (${times} veces)` : first.title };
  }
  const plural = ACCESS_PLURAL[first.event_type];
  return plural
    ? { actor: null, title: `${plural}: ${entry.names.join(", ")}` }
    : { actor: entry.names.join(", "), title: first.title };
}
