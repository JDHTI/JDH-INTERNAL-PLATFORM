import { CheckCircle2, Clock } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";

import { OUTCOME_LABELS } from "../lib/format";
import type { CheckOutcome, ValidationStatus } from "../types/order-validator.types";

const STATUS_TONE: Record<ValidationStatus, BadgeTone> = {
  listo_para_liberar: "success",
  pendiente_validacion: "warning",
};

/**
 * Green ready, amber pending. The icon and the label carry the state as well
 * as the color (DESIGN.md §3.6); `label` is the API's own wording.
 */
export function StatusBadge({ status, label }: { status: ValidationStatus; label: string }) {
  const Icon = status === "listo_para_liberar" ? CheckCircle2 : Clock;
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <Icon aria-hidden="true" /> {label}
    </Badge>
  );
}

const OUTCOME_TONE: Record<CheckOutcome, BadgeTone> = {
  cumple: "success",
  no_cumple: "danger",
  no_evaluable: "neutral",
};

export function OutcomeBadge({ outcome }: { outcome: CheckOutcome }) {
  return <Badge tone={OUTCOME_TONE[outcome] ?? "neutral"}>{OUTCOME_LABELS[outcome] ?? outcome}</Badge>;
}
