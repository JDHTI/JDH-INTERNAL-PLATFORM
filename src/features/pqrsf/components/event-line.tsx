import {
  ArrowRightLeft,
  AtSign,
  Dot,
  Eye,
  FilePlus2,
  FileText,
  Mail,
  MessageSquare,
  Tags,
  Truck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";

import type { CaseEvent } from "../types/pqrsf.types";

// Who spoke matters more than what kind of entry it is when it came from
// outside: a client's or a supplier's email reads apart from the team's work.
const ACTOR_ICONS: Partial<Record<string, LucideIcon>> = {
  client: Mail,
  supplier: Truck,
  external: AtSign,
};

const CATEGORY_ICONS: Partial<Record<string, LucideIcon>> = {
  lifecycle: FilePlus2,
  access: Eye,
  assignment: UserCheck,
  status: ArrowRightLeft,
  communication: MessageSquare,
  documents: FileText,
  classification: Tags,
};

export function eventIcon(event: Pick<CaseEvent, "actor_kind" | "category">): LucideIcon {
  return ACTOR_ICONS[event.actor_kind] ?? CATEGORY_ICONS[event.category] ?? Dot;
}

/** The icon on the timeline's rail, centered on the line. */
export function RailIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary",
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

/** «Recibida → Leída». Text, not color: the names carry the change. */
export function StatusChip({ change }: { change: NonNullable<CaseEvent["status_change"]> }) {
  if (!change.from && !change.to) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-canvas-subtle px-1.5 py-0.5 text-[13px] whitespace-nowrap text-text-primary">
      {change.from ?? "Sin estado"}
      <span aria-hidden="true" className="text-text-secondary">
        →
      </span>
      <span className="sr-only">a</span>
      {change.to ?? "Sin estado"}
    </span>
  );
}

/** «actor · title», then the status change when there is one. */
export function EventSentence({
  actor,
  title,
  statusChange,
  muted = false,
  children,
}: {
  actor: string | null;
  title: string;
  statusChange?: CaseEvent["status_change"];
  /** Access lines read quieter than the work. */
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm", muted && "text-text-secondary")}>
      <span>
        {actor && (
          <>
            <span className={muted ? undefined : "font-medium text-text-primary"}>{actor}</span>
            <span className="text-text-secondary"> · </span>
          </>
        )}
        {title}
      </span>
      {statusChange && <StatusChip change={statusChange} />}
      {children}
    </p>
  );
}
