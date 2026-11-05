"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Secondary facts kept out of the way: hovering the trigger shows them, and a
 * click or a tap opens them too, so keyboard and touch reach what a `title`
 * attribute would hide from them.
 */
export function InfoPopover({
  label,
  title,
  children,
  className,
}: {
  /** Visible text of the trigger, also its accessible name. */
  label: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-[13px] text-text-secondary underline decoration-dotted underline-offset-4",
          "hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "max-md:min-h-11",
          className
        )}
      >
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-primary shadow-modal outline-none">
            {title && <Popover.Title className="mb-2 text-sm font-semibold">{title}</Popover.Title>}
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
