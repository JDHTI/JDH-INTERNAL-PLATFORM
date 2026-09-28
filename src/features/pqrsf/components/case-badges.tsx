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
 */
export function DueLabel({
  item,
  layout = "stacked",
}: {
  item: Pick<PqrsfCase, "due_on" | "is_overdue" | "closed_at">;
  layout?: "stacked" | "inline";
}) {
  const due = dueInfo(item);
  if (!due) return <span className="text-text-secondary">Sin fecha límite</span>;

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
      <span className="tabular whitespace-nowrap">
        {due.date}
        {/* Closed cases keep the date for the record; how far it is no longer matters. */}
        {!item.closed_at && (
          <span className="text-[13px] text-text-secondary"> · {due.relative}</span>
        )}
      </span>
    </span>
  );
}
