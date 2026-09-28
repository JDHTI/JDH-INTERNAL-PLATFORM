"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";

import { useAddComment } from "../hooks/use-pqrsf";
import { formatDate, formatDateTime, formatRelativeTime, personName } from "../lib/format";
import type { CaseEvent, PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/** One sentence per event, in the words a coordinator would use. */
function describe(event: CaseEvent, item: PqrsfCase, catalog: TrackingCatalog): string {
  const status = (id: string | null) =>
    catalog.statuses.find((entry) => entry.id === id)?.name ?? "otro estado";
  const document = text(event.data, "document") ?? "un documento";

  switch (event.event_type) {
    case "created":
      return event.data.origin === "import"
        ? "Importó el caso desde el Excel P.13.F.01"
        : event.data.origin === "public_form"
          ? "Recibió la solicitud del formulario público"
          : "Creó el caso";
    case "assigned": {
      const to = text(event.data, "to_user_id");
      if (!to) return "Quitó el responsable";
      // The event stores ids only; the current assignee is the one name known here.
      return item.assignee?.id === to ? `Asignó a ${personName(item.assignee)}` : "Cambió el responsable";
    }
    case "status_changed":
      return `Cambió el estado de ${status(event.from_status_id)} a ${status(event.to_status_id)}`;
    case "read":
      return event.to_status_id ? `Leyó el caso y quedó en ${status(event.to_status_id)}` : "Leyó el caso";
    case "comment":
      return "Comentó";
    case "item_added":
      return `Agregó el documento «${document}»`;
    case "item_updated": {
      const responded = text(event.data, "responded_on");
      return responded
        ? `Registró la respuesta de «${document}» con fecha ${formatDate(responded)}`
        : `Editó el documento «${document}»`;
    }
    case "item_removed":
      return `Quitó el documento «${document}»`;
    case "updated":
      return "Editó los datos del caso";
    default:
      return "Registró un cambio";
  }
}

/**
 * The audit trail the spreadsheet never had: who did what and when, oldest
 * first so it reads as the story of the case. Anyone who sees the case can
 * comment, including whoever raised it.
 */
export default function CaseTimeline({
  item,
  events,
  catalog,
}: {
  item: PqrsfCase;
  events: CaseEvent[];
  catalog: TrackingCatalog;
}) {
  const id = useId();
  const comment = useAddComment(item.id);
  const [body, setBody] = useState("");
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Línea de tiempo
      </h2>

      {ordered.length === 0 ? (
        <p className="text-sm text-text-secondary">Todavía no hay movimientos registrados.</p>
      ) : (
        <ol className="space-y-0 border-l border-border">
          {ordered.map((event) => (
            <li key={event.id} className="relative pb-4 pl-4 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute top-2 -left-[3px] size-[5px] rounded-full bg-border-control"
              />
              <p className="text-sm">
                <span className="font-medium">{event.actor ? personName(event.actor) : "Sistema"}</span>{" "}
                {describe(event, item, catalog).replace(/^./, (first) => first.toLowerCase())}
              </p>
              {event.note && (
                <p
                  className={
                    event.event_type === "comment"
                      ? "mt-1 rounded-md bg-canvas-subtle px-3 py-2 text-sm whitespace-pre-wrap"
                      : "mt-0.5 text-[13px] whitespace-pre-wrap text-text-secondary"
                  }
                >
                  {event.note}
                </p>
              )}
              <time
                dateTime={event.created_at}
                title={formatDateTime(event.created_at)}
                className="text-[13px] text-text-secondary"
              >
                {formatRelativeTime(event.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}

      <form
        className="space-y-2 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          comment.mutate(body.trim(), { onSuccess: () => setBody("") });
        }}
      >
        <label htmlFor={`${id}-comment`} className="block text-[13px] font-medium">
          Comentario
        </label>
        <Textarea
          id={`${id}-comment`}
          value={body}
          maxLength={5000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Queda en la línea de tiempo, visible para quien ve el caso"
          aria-invalid={comment.error ? true : undefined}
          aria-describedby={comment.error ? `${id}-comment-error` : undefined}
        />
        {comment.error && (
          <p id={`${id}-comment-error`} role="alert" className="text-[13px] text-danger">
            {errorMessage(comment.error)}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={comment.isPending || !body.trim()}>
            {comment.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Comentar
          </Button>
        </div>
      </form>
    </section>
  );
}
