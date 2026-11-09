import { AlertTriangle, CheckCircle2, CircleSlash, FileCheck2, Hourglass, PencilLine, TrendingDown } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";

import { COMPLIANCE_LABELS } from "../lib/format";
import type { Compliance, QuotationStatus } from "../types/quotations.types";

const STATUS_LOOK: Record<QuotationStatus, { tone: BadgeTone; icon: typeof CheckCircle2 }> = {
  // Nothing wrong with a draft: neutral.
  borrador: { tone: "neutral", icon: PencilLine },
  // Waiting on someone else: amber, like the validator's pending orders.
  pendiente_validacion: { tone: "warning", icon: Hourglass },
  // Validated, files out: green either way; the label says which.
  creada: { tone: "success", icon: FileCheck2 },
  actualizada: { tone: "success", icon: FileCheck2 },
};

/** The quotation's state with the API's own label; the icon carries it too, not only the color. */
export function QuotationStatusBadge({ status, label }: { status: QuotationStatus; label: string }) {
  const look = STATUS_LOOK[status] ?? { tone: "neutral" as BadgeTone, icon: PencilLine };
  const Icon = look.icon;
  return (
    <Badge tone={look.tone}>
      <Icon aria-hidden="true" /> {label}
    </Badge>
  );
}

const COMPLIANCE_LOOK: Record<Compliance, { tone: BadgeTone; icon: typeof CheckCircle2 }> = {
  cumple: { tone: "success", icon: CheckCircle2 },
  bajo_minimo: { tone: "danger", icon: TrendingDown },
  sin_objetivo: { tone: "warning", icon: CircleSlash },
  sin_costo: { tone: "warning", icon: AlertTriangle },
};

/**
 * Whether a new price passes the rule, with its word: the row tint alone never
 * carries it (DESIGN.md §3.6). The badge background is opaque, so it stays AA
 * on a tinted row (§3.5).
 */
export function ComplianceBadge({ compliance, label, className }: { compliance: Compliance; label?: string | null; className?: string }) {
  const look = COMPLIANCE_LOOK[compliance] ?? { tone: "neutral" as BadgeTone, icon: AlertTriangle };
  const Icon = look.icon;
  return (
    <Badge tone={look.tone} className={className}>
      <Icon aria-hidden="true" /> {label || COMPLIANCE_LABELS[compliance] || compliance}
    </Badge>
  );
}
