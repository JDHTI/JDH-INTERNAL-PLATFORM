"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

interface SidebarRowProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  /** False renders a disabled "Próximamente" row instead of a link. */
  available?: boolean;
  onNavigate: () => void;
  labelClassName?: string;
  className?: string;
  /** Pending count shown after the label; hidden at 0. */
  badge?: number;
}

/**
 * One navigation row. Shared by the module list and the footer utilities so
 * both keep the same height, spacing and states.
 */
export default function SidebarRow({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed,
  available = true,
  onNavigate,
  labelClassName,
  className,
  badge,
}: SidebarRowProps) {
  const base = cn(
    "flex h-9 items-center rounded-md text-sm font-medium transition-colors duration-150",
    isCollapsed ? "w-full justify-center" : "gap-2.5 px-2",
    className
  );

  const icon = <Icon className="size-4 shrink-0" aria-hidden="true" />;

  // A destination that does not exist yet is rendered as a labelled,
  // non-focusable row. Shipping it as a link would send the user to a 404.
  if (!available) {
    return (
      <div
        className={cn(base, "cursor-not-allowed text-sidebar-muted opacity-60")}
        title={isCollapsed ? `${label} · Próximamente` : undefined}
      >
        {icon}
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 rounded-sm border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium">
              Próximamente
            </span>
          </>
        )}
        <span className="sr-only">{label}: próximamente</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? label : undefined}
      className={cn(
        base,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      {icon}
      {!isCollapsed && (
        <span className={cn("min-w-0 flex-1 truncate", labelClassName)}>{label}</span>
      )}
      {!isCollapsed && badge ? (
        <span className="tabular shrink-0 rounded-full bg-sidebar-foreground px-1.5 text-[11px] font-semibold text-sidebar">
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> sin leer</span>
        </span>
      ) : null}
    </Link>
  );
}
