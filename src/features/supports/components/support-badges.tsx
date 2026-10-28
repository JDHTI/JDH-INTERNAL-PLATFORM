import { AlertTriangle, ClipboardCheck, GitCompareArrows, Paperclip } from "lucide-react";

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

/** How many documents back the support; nothing when it has none (the "Sin soporte" filter finds those). */
export function AttachmentBadge({ support }: { support: SupplierSupport }) {
  const total = support.attachment_count ?? 0;
  if (total === 0) return null;
  return (
    <Badge tone="neutral">
      <Paperclip aria-hidden="true" />
      {total === 1 ? "1 soporte" : `${total} soportes`}
    </Badge>
  );
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
