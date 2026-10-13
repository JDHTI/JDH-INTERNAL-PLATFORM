import { AlertTriangle, ClipboardCheck, GitCompareArrows } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";

import { humanize, STATE_LABELS } from "../lib/format";
import type { SupplierSupport, SupportState } from "../types/support.types";

const STATE_TONE: Record<SupportState, BadgeTone> = {
  vigente: "success",
  vencido: "neutral",
  programado: "info",
  inactivo: "neutral",
  anulado: "danger",
};

/** The one state a support has; review is a separate flag, never a state. */
export function StateBadge({ value }: { value: SupportState }) {
  return <Badge tone={STATE_TONE[value] ?? "neutral"}>{STATE_LABELS[value] ?? humanize(value)}</Badge>;
}

/** Review, conflicts and issues only render when present: a clean row stays quiet. */
export function FlagBadges({ support }: { support: SupplierSupport }) {
  const issueCount = support.issues.length;
  return (
    <>
      {support.needs_review && (
        <Badge tone="warning">
          <ClipboardCheck aria-hidden="true" /> Por revisar
        </Badge>
      )}
      {support.has_conflicts && (
        <Badge tone="danger">
          <GitCompareArrows aria-hidden="true" /> Conflicto
        </Badge>
      )}
      {issueCount > 0 && (
        <Badge tone="warning">
          <AlertTriangle aria-hidden="true" />
          {issueCount === 1 ? "1 novedad" : `${issueCount} novedades`}
        </Badge>
      )}
    </>
  );
}
