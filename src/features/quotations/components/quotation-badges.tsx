import { AlertTriangle, CheckCircle2, CircleSlash, Clock, FileCheck2, FileUp, Hourglass, PencilLine, TrendingDown } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { DELETE_SOON_DAYS, daysUntil, deletionText } from "../lib/auto-delete";
import { COMPLIANCE_LABELS, formatDay } from "../lib/format";
import type { Compliance, QuotationStatus } from "../types/quotations.types";

const STATUS_LOOK: Record<QuotationStatus, { tone: BadgeTone; icon: typeof CheckCircle2 }> = {
  // Nothing wrong with a draft: neutral.
  borrador: { tone: "neutral", icon: PencilLine },
  // Waiting on someone else: amber, like the validator's pending orders.
  pendiente_validacion: { tone: "warning", icon: Hourglass },
  // Validated, the files have to go into SIESA: still a step left, so not green yet.
  pendiente_carga: { tone: "info", icon: FileUp },
  // Loaded in SIESA: done.
  cargada: { tone: "success", icon: FileCheck2 },
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

/**
 * When a draft never sent to validation is deleted by itself (`deleted_on`), and why. In a row it
 * is one short line, the reason a hover away and read in full by screen readers; on the detail, the
 * whole sentence. Amber from DELETE_SOON_DAYS days left.
 */
export function DeletionNotice({ deletedOn, inline = false }: { deletedOn: string | null | undefined; inline?: boolean }) {
  if (!deletedOn) return null;
  const left = daysUntil(deletedOn);
  const soon = left <= DELETE_SOON_DAYS;
  const text = deletionText(deletedOn);
  if (inline) {
    return (
      <span title={text} className={cn("inline-flex items-center gap-1 text-xs", soon ? "font-medium text-warning" : "text-text-secondary")}>
        <Clock className="size-3.5" aria-hidden="true" />
        <span aria-hidden="true">
          {left <= 0 ? "Se elimina hoy" : left === 1 ? "Se elimina mañana" : `Se elimina el ${formatDay(deletedOn)}`}
        </span>
        <span className="sr-only">{text}</span>
      </span>
    );
  }
  return (
    <p role="note" className={cn("flex items-start gap-2 rounded-lg px-4 py-3 text-sm", soon ? "bg-warning-surface" : "bg-canvas-subtle")}>
      <Clock className={cn("mt-0.5 size-4 shrink-0", soon ? "text-warning" : "text-text-secondary")} aria-hidden="true" />
      <span>{text}</span>
    </p>
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
