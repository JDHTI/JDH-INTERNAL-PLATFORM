import { AlertTriangle, Clock } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { dueInfo, statusTone } from "../lib/format";
import type { CaseStatus, PqrsfCase } from "../types/pqrsf.types";

export function StatusBadge({ status }: { status: Pick<CaseStatus, "code" | "name"> }) {
  return <Badge tone={statusTone(status.code)}>{status.name}</Badge>;
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
