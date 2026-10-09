import { AlertTriangle, GitCompareArrows } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";

import { humanize, STATUS_LABELS, VALIDITY_LABELS } from "../lib/format";
import type { SupplierSupport, SupportStatus, SupportValidity } from "../types/support.types";

const VALIDITY_TONE: Record<SupportValidity, BadgeTone> = {
  vigente: "success",
  vencido: "neutral",
  programado: "info",
};

const STATUS_TONE: Record<SupportStatus, BadgeTone> = {
  activo: "success",
  pendiente_revision: "warning",
  anulado: "danger",
};

export function ValidityBadge({ value }: { value: SupportValidity }) {
  return <Badge tone={VALIDITY_TONE[value] ?? "neutral"}>{VALIDITY_LABELS[value] ?? humanize(value)}</Badge>;
}

export function StatusBadge({ value }: { value: SupportStatus }) {
  return <Badge tone={STATUS_TONE[value] ?? "neutral"}>{STATUS_LABELS[value] ?? humanize(value)}</Badge>;
}

/** Conflicts and issues only render when present: a clean row stays quiet. */
export function FlagBadges({ support }: { support: SupplierSupport }) {
  const issueCount = support.issues.length;
  if (!support.has_conflicts && issueCount === 0) return null;
  return (
    <>
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
