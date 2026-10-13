import { CheckCircle2, Clock, Scale, SlidersHorizontal, UserCheck, Wine } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { formatCop } from "@/features/supports/lib/format";

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

/**
 * Marks an order a person moved to ready. It sits beside the green status, not
 * in place of it, so the order still reads as ready and also says who made it so.
 */
export function ManualApprovalBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge tone="info" title={compact ? "Aprobado manualmente" : undefined}>
      <UserCheck aria-hidden="true" />
      {compact ? (
        <>
          Manual<span className="sr-only">: aprobado manualmente</span>
        </>
      ) : (
        "Aprobado manualmente"
      )}
    </Badge>
  );
}

/**
 * The order is ready only because the threshold was added to its margin: the
 * margin alone would not release it. A small icon on the same line as the
 * status and "Por margen", with the explanation as its tooltip, so it adds a
 * mark without adding a badge.
 */
export function ThresholdReleaseIcon() {
  const text = "Liberado por el umbral: pasa a listo solo por sumar el umbral al margen del pedido.";
  return (
    <span
      role="img"
      aria-label={text}
      title={text}
      tabIndex={0}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-info focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
    </span>
  );
}

/**
 * The order is ready because its margin, with the file's threshold, reaches its
 * target, not because its lines all are. Its lines keep their own reasons.
 */
export function MarginReleaseBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge tone="info" title="El margen del pedido, con el umbral, alcanza el objetivo.">
      <Scale aria-hidden="true" />
      {compact ? (
        <>
          Por margen<span className="sr-only">: liberado por el margen del pedido con el umbral</span>
        </>
      ) : (
        "Liberado por margen"
      )}
    </Badge>
  );
}

/**
 * The liquor consumption tax is missing: the product has it in the master and
 * the line came without it. It only shows then; a line that carries its tax has
 * nothing to flag. `amount` is what the line should carry per unit. It is a
 * warning, not a decision: the status does not change.
 */
export function LiquorTaxBadge({
  className,
  compact = false,
  amount,
}: {
  className?: string;
  compact?: boolean;
  amount?: Decimal | null;
}) {
  const expected = toNumber(amount);
  const title =
    expected !== null && expected > 0
      ? `Falta el impuesto al licor: el producto lo tiene y la línea no lo trae (debería traer ${formatCop(expected)} por unidad).`
      : "Falta el impuesto al licor: el producto lo tiene y la línea no lo trae.";
  return (
    <Badge tone="warning" className={className} title={title}>
      <Wine aria-hidden="true" />
      {compact ? (
        <>
          Licor<span className="sr-only">: {title}</span>
        </>
      ) : (
        <>
          Impuesto licor<span className="sr-only">: {title}</span>
        </>
      )}
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
