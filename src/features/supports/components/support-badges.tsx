import { AlertTriangle, CircleSlash, ClipboardCheck, GitCompareArrows, Paperclip } from "lucide-react";

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

const isoDay = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

/** Today plus one calendar month, as `YYYY-MM-DD`; the 31st lands on the next month's last day. */
function inOneMonth(today = new Date()): string {
  const lastOfNext = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
  return isoDay(new Date(today.getFullYear(), today.getMonth() + 1, Math.min(today.getDate(), lastOfNext)));
}

/**
 * A tactical support in force that ends within a month (today 20 Nov: ends by 20 Dec). Only the
 * tactical ones: the temporary activities are short by nature (decided 2026-11-20).
 */
export function expiresSoon(support: SupplierSupport): boolean {
  if (support.kind !== "tactico_cliente" || support.state !== "vigente") return false;
  // The API says it (`expiring`, with Bogotá's date); an older build leaves it to the browser's date.
  return support.expiring ?? (support.valid_to !== null && support.valid_to <= inOneMonth());
}

export const EXPIRES_SOON_TEXT = "Vence pronto";

/** The alert beside the dates of a tactical support about to end; its words are its tooltip. */
export function ExpiringMark({ support }: { support: SupplierSupport }) {
  if (!expiresSoon(support)) return null;
  return (
    <span className="inline-flex text-warning" title={EXPIRES_SOON_TEXT}>
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{EXPIRES_SOON_TEXT}</span>
    </span>
  );
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

/** Why a support shows «Sin efecto»: the API counts it as 0. */
export const NO_EFFECT_HELP = "El costo apoyado supera el costo actual: el apoyo no aporta.";

/** Review, conflicts, issues and a support without effect only render when present: a clean row stays quiet. */
export function FlagBadges({ support }: { support: SupplierSupport }) {
  const issueCount = support.issues.length;
  return (
    <>
      {support.derived?.support_above_cost && (
        <Badge tone="warning" title={NO_EFFECT_HELP}>
          <CircleSlash aria-hidden="true" /> Sin efecto<span className="sr-only">: {NO_EFFECT_HELP}</span>
        </Badge>
      )}
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
