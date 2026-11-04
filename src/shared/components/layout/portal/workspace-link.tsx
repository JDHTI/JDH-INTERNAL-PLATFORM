"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { useAreas } from "@/features/areas/hooks/use-areas";
import { LAST_AREA_STORAGE_KEY } from "@/shared/config/general.config";
import { cn } from "@/shared/lib/utils";

function readLastArea(): string | null {
  try {
    return window.localStorage.getItem(LAST_AREA_STORAGE_KEY);
  } catch {
    return null;
  }
}

const noSubscription = () => () => {};

/** Back to the last area opened, or the first. Someone without areas gets nothing. */
export default function WorkspaceLink({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { data: areas } = useAreas();
  // Read after hydration: the server has no storage and renders the default.
  const lastSlug = useSyncExternalStore(noSubscription, readLastArea, () => null);

  if (!areas || areas.length === 0) return null;
  const target = areas.find((area) => area.slug === lastSlug) ?? areas[0]!;

  return (
    <Link
      href={target.path}
      onClick={onNavigate}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border border-sidebar-border px-3 text-sm font-medium",
        "text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-hover",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        className
      )}
    >
      <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Espacio de trabajo<span className="sr-only">, {target.name}</span>
      </span>
    </Link>
  );
}
