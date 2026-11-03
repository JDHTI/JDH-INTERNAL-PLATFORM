import { AlertTriangle, CheckCircle2, CircleSlash, FileCheck2, PencilLine, TrendingDown } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";

import { COMPLIANCE_LABELS } from "../lib/format";
import type { Compliance, QuotationStatus } from "../types/quotations.types";

/** Draft is neutral: there is nothing wrong with it. Generated is green: its files can be downloaded. */
export function QuotationStatusBadge({ status, label }: { status: QuotationStatus; label: string }) {
  const generated = status === "generado";
  const Icon = generated ? FileCheck2 : PencilLine;
  return (
    <Badge tone={generated ? "success" : "neutral"}>
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
export function ComplianceBadge({ compliance }: { compliance: Compliance }) {
  const look = COMPLIANCE_LOOK[compliance] ?? { tone: "neutral" as BadgeTone, icon: AlertTriangle };
  const Icon = look.icon;
  return (
    <Badge tone={look.tone}>
      <Icon aria-hidden="true" /> {COMPLIANCE_LABELS[compliance] ?? compliance}
    </Badge>
  );
}

/** Row tint per compliance. Only text-primary, text-secondary and badges sit on it (§3.5). */
export const COMPLIANCE_ROW: Partial<Record<Compliance, string>> = {
  bajo_minimo: "bg-danger-surface",
  sin_objetivo: "bg-warning-surface",
  sin_costo: "bg-warning-surface",
};
