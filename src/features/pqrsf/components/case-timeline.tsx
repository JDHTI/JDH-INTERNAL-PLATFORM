"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";

import { useAddComment } from "../hooks/use-pqrsf";
import { actorName, describeEvent, isAccessEvent } from "../lib/event-text";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import type { CaseEvent, PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";

/**
 * The audit trail the spreadsheet never had: who did what and when, oldest
 * first so it reads as the story of the case. Openings («abrió el caso») are
 * part of it, lighter, so nobody can say they never saw the request. Anyone
 * who sees the case can comment, including whoever raised it.
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
              <p className={isAccessEvent(event) ? "text-[13px] text-text-secondary" : "text-sm"}>
                <span className={isAccessEvent(event) ? undefined : "font-medium"}>
                  {actorName(event)}
                </span>{" "}
                {describeEvent(event, catalog, item.assignee)}
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
