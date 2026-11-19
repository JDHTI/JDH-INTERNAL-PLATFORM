"use client";

import { Popover } from "@base-ui/react/popover";
import { SlidersHorizontal } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * The secondary filters of the lines (categories, suppliers, inactive, the
 * last import), out of the toolbar so it stays one row. The trigger counts how
 * many of them are on, so a filtered table never hides why.
 */
export default function MoreFilters({ active, children }: { active: number; children: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger className={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}>
        <SlidersHorizontal aria-hidden="true" /> Más filtros
        {active > 0 && (
          <span className="rounded-sm bg-primary px-1.5 text-xs tabular-nums text-text-on-primary">
            {active}
            <span className="sr-only"> activos</span>
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-primary shadow-modal outline-none">
            <Popover.Title className="text-sm font-semibold">Más filtros</Popover.Title>
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
