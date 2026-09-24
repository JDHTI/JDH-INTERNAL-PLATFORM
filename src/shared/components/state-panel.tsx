import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Empty, error and no-access screens share one shape (DESIGN.md §8): a 32px
 * icon, a title, what happened in the user's words, and the action that
 * resolves it. Left-aligned, never centred.
 */
export default function StatePanel({
  icon: Icon,
  title,
  children,
  action,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-border p-6",
        className
      )}
    >
      <Icon
        className={cn(
          "size-8",
          tone === "danger" ? "text-danger" : "text-text-secondary"
        )}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {children && (
          <div className="max-w-prose text-sm text-text-secondary">
            {children}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
