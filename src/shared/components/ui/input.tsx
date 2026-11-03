import * as React from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Text input per docs/DESIGN.md §7.2.
 *
 * The border is `border-control` (3.17:1), not the decorative `border` (1.41:1):
 * an input boundary carries information, so WCAG 1.4.11 applies to it.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-border-control bg-transparent px-2.5 py-1",
        "text-sm text-text-primary placeholder:text-text-secondary",
        "transition-colors duration-150 outline-none",
        // outline-solid restores the style that outline-none clears; without it the
        // width and color apply to an outline that never draws.
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  );
}

export { Input };
