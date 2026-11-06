import { AlertTriangle, Clock, MailPlus } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { useMinuteClock } from "../hooks/use-minute-clock";
import { dueInfo, formatDateTime, formatRelativeShort, statusTone } from "../lib/format";
import type { CaseStatus, PqrsfCase } from "../types/pqrsf.types";

export function StatusBadge({ status }: { status: Pick<CaseStatus, "code" | "name"> }) {
  return <Badge tone={statusTone(status.code)}>{status.name}</Badge>;
}

/**
 * The client or a supplier answered by email and nobody has opened the case
 * since. It is outlined, not tinted: the status, the due date and the overdue
 * mark already own the colors, and this one says «look here» without taking a
 * hue from them. The word, the icon and the time carry it; there is no color
 * to miss. Renders nothing when the API sends no `news_at`.
 */
export function NewsBadge({
  newsAt,
  className,
}: {
  newsAt: string | null | undefined;
  className?: string;
}) {
  return newsAt ? <NewsBadgeLabel newsAt={newsAt} className={className} /> : null;
}

// Apart from NewsBadge so that only rows with news listen to the clock.
function NewsBadgeLabel({ newsAt, className }: { newsAt: string; className?: string }) {
  const now = useMinuteClock();
  return (
    <Badge
      tone="neutral"
      className={cn("border border-border-control bg-surface", className)}
      title={`Respondieron por correo el ${formatDateTime(newsAt)}`}
    >
      <MailPlus aria-hidden="true" />
      Novedad
      <span className="tabular font-normal text-text-secondary">· {formatRelativeShort(newsAt, now)}</span>
    </Badge>
  );
}

/**
 * The due date has to read without reading: overdue and due-today carry a
 * badge with icon and word, the date and the relative day stay as text.
 * `row` is the table's: one line, so every row keeps the same height, with
 * the relative day in the tooltip.
 */
export function DueLabel({
  item,
  layout = "stacked",
}: {
  item: Pick<PqrsfCase, "due_on" | "is_overdue" | "closed_at">;
  layout?: "stacked" | "inline" | "row";
}) {
  const due = dueInfo(item);
  if (!due) {
    return (
      <span className="whitespace-nowrap text-text-secondary">
        {layout === "row" ? "Sin fecha" : "Sin fecha límite"}
      </span>
    );
  }

  if (layout === "row") {
    const relative = item.closed_at
      ? undefined
      : `${item.is_overdue ? "Venció" : "Vence"} ${due.relative}`;
    return (
      <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap" title={relative}>
        {due.label && (
          <Badge tone={due.tone}>
            {due.tone === "danger" ? <AlertTriangle aria-hidden="true" /> : <Clock aria-hidden="true" />}
            {due.label}
          </Badge>
        )}
        <span className="tabular">{due.date}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex gap-x-2 gap-y-0.5",
        layout === "stacked" ? "flex-col items-end" : "flex-wrap items-center"
      )}
    >
      {due.label && (
        <Badge tone={due.tone}>
          {due.tone === "danger" ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <Clock aria-hidden="true" />
          )}
          {due.label}
        </Badge>
      )}
      <span className="tabular whitespace-nowrap">{due.date}</span>
      {/* Closed cases keep the date for the record; how far it is no longer
          matters. In the table the relative day takes its own line so the
          column stays narrow. */}
      {!item.closed_at && (
        <span className="text-[13px] whitespace-nowrap text-text-secondary">
          {layout === "inline" && "· "}
          {due.relative}
        </span>
      )}
    </span>
  );
}
