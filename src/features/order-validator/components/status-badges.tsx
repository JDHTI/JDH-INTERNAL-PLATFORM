import { Ban, CheckCircle2, Clock, Info, Scale, SlidersHorizontal, TrendingDown, UserCheck, Wine, type LucideIcon } from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { formatCop } from "@/features/supports/lib/format";

import { OUTCOME_LABELS, RULE_EFFECT_LABELS, formatPointsGap } from "../lib/format";
import type { AlertCode, CheckOutcome, OrderAlert, RuleEffect, SupportCheck, ValidationStatus } from "../types/order-validator.types";

const STATUS_TONE: Record<ValidationStatus, BadgeTone> = {
  listo_para_liberar: "success",
  pendiente_validacion: "warning",
  liberado: "info",
};

const STATUS_ICON: Record<ValidationStatus, LucideIcon> = {
  listo_para_liberar: CheckCircle2,
  pendiente_validacion: Clock,
  liberado: UserCheck,
};

/**
 * Green ready, amber pending, blue released by a person. The icon and the label
 * carry the state as well as the color (DESIGN.md §3.6); `label` is the API's own wording.
 */
export function StatusBadge({ status, label }: { status: ValidationStatus; label: string }) {
  const Icon = STATUS_ICON[status] ?? Clock;
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <Icon aria-hidden="true" /> {label}
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
 * Ready by tolerance: the order's margin reaches the minimum and only a few
 * lines fall a little short of their target. The lines keep their reasons.
 */
export function ToleranceReleaseBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge tone="info" title="El margen del pedido alcanza el mínimo de la tolerancia y solo unas pocas líneas quedan cerca de su objetivo.">
      <Scale aria-hidden="true" />
      {compact ? (
        <>
          Tolerancia<span className="sr-only">: liberado por tolerancia</span>
        </>
      ) : (
        "Liberado por tolerancia"
      )}
    </Badge>
  );
}

const ALERT_LOOK: Record<AlertCode, { tone: BadgeTone; icon: LucideIcon; short: string }> = {
  margen_100: { tone: "danger", icon: Ban, short: "Margen 100 %, revisar" },
  bajo_objetivo: { tone: "warning", icon: TrendingDown, short: "Bajo objetivo" },
  falta_impuesto_licor: { tone: "warning", icon: Wine, short: "Licor" },
  // Only informs (API #147): the file's cost is not the warehouse's average; nothing is held for it.
  costo_distinto: { tone: "info", icon: Info, short: "Costo distinto" },
};

/**
 * One alert of an order, with the API's label (or a short form in the dense
 * table) and its message as the tooltip and for screen readers. A 100 %
 * margin is red: nothing releases that order.
 */
export function AlertBadge({
  alert,
  compact = false,
  withMessage = true,
}: {
  alert: OrderAlert;
  compact?: boolean;
  /** False where the message is already written next to the badge. */
  withMessage?: boolean;
}) {
  const look = ALERT_LOOK[alert.code] ?? { tone: "warning" as BadgeTone, icon: TrendingDown, short: alert.label };
  const Icon = look.icon;
  return (
    <Badge tone={look.tone} title={withMessage ? alert.message : undefined}>
      <Icon aria-hidden="true" />
      {compact ? look.short : alert.label}
      {withMessage && <span className="sr-only">: {alert.message}</span>}
    </Badge>
  );
}

/** A line's own alerts, beside its reason. The liquor tax keeps its own badge, so it is left out here. */
export function LineAlertBadges({ codes, pointsBelow }: { codes: AlertCode[]; pointsBelow?: Decimal | null }) {
  return (
    <>
      {codes.includes("margen_100") && (
        <Badge tone="danger" className="py-0 text-xs">
          <Ban aria-hidden="true" /> Margen 100 %, revisar
        </Badge>
      )}
      {codes.includes("bajo_objetivo") && (
        <Badge tone="warning" className="py-0 text-xs" title="Está por debajo de su objetivo más de lo que se tolera.">
          <TrendingDown aria-hidden="true" />
          {toNumber(pointsBelow) !== null ? `${formatPointsGap(pointsBelow)} bajo objetivo` : "Bajo objetivo"}
        </Badge>
      )}
    </>
  );
}

const EFFECT_TONE: Record<RuleEffect, BadgeTone> = {
  libera: "success",
  retiene: "danger",
  alerta: "warning",
  informa: "neutral",
};

/** What a rule does, as a badge with its word: the color is never the only cue. */
export function RuleEffectBadge({ effect }: { effect: RuleEffect }) {
  return <Badge tone={EFFECT_TONE[effect] ?? "neutral"}>{RULE_EFFECT_LABELS[effect] ?? effect}</Badge>;
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

const NO_EFFECT_HELP = "El apoyo aporta $0 en esta línea: no es lo que la libera ni la retiene.";

/** A support evaluated that brings no money here; the line stands on its own margin. */
export function NoEffectBadge({ check }: { check: SupportCheck }) {
  if (!check.no_effect) return null;
  return (
    <Badge tone="neutral" title={NO_EFFECT_HELP}>
      <Ban aria-hidden="true" /> Sin efecto<span className="sr-only">: {NO_EFFECT_HELP}</span>
    </Badge>
  );
}
