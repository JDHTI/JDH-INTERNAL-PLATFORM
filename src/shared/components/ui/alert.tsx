import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type AlertSeverity = "success" | "danger" | "info";
const styles: Record<AlertSeverity, string> = {
  success: "bg-success-surface text-success",
  danger: "bg-danger-surface text-danger",
  info: "bg-info-surface text-info",
};

/** Semantic feedback using the design tokens in both themes. */
export function Alert({ severity = "info", children, onDismiss, className }: { severity?: AlertSeverity; children: ReactNode; onDismiss?: () => void; className?: string }) {
  const Icon = severity === "success" ? CircleCheck : severity === "danger" ? CircleAlert : Info;
  return <div role={severity === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md px-3 py-2 text-sm", styles[severity], className)}>
    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1">{children}</div>
    {onDismiss && <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X className="size-4" aria-hidden="true" /></button>}
  </div>;
}
