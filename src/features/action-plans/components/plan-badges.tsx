"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { usePlanLabels } from "../hooks/use-plan-labels";
import { effectivenessTone, statusTone } from "../lib/labels";

export function PlanStatusBadge({ status }: { status: string }) {
  const labels = usePlanLabels();
  return <Badge tone={statusTone(status)}>{labels.statuses(status)}</Badge>;
}

/** «Eficaz: sí / no / pendiente»; the word carries it, the tone only helps. */
export function PlanEffectivenessBadge({ effectiveness }: { effectiveness: string }) {
  const labels = usePlanLabels();
  return (
    <Badge tone={effectivenessTone(effectiveness)}>
      {effectiveness === "si" ? "Eficaz" : effectiveness === "no" ? "No eficaz" : "Eficacia pendiente"}
      <span className="sr-only">: {labels.effectiveness(effectiveness)}</span>
    </Badge>
  );
}

/** Activities past their date and not done: icon, number and word, never color alone. */
export function OverdueBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <Badge tone="danger" className={cn(className)}>
      <AlertTriangle aria-hidden="true" />
      {count === 1 ? "1 vencida" : `${count} vencidas`}
    </Badge>
  );
}
