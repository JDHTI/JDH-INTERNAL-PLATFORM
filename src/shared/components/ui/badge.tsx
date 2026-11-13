import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

/**
 * Status badge per docs/DESIGN.md §7.5. Always carries its text label: a
 * colored dot alone tells nothing to whoever does not know the convention.
 * The backgrounds are the opaque `--*-badge` tokens so a hovered row does not
 * darken them below AA (§3.5).
 */
const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-0.5 text-[13px] leading-5 font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-canvas-subtle text-text-primary",
        info: "bg-info-badge text-info",
        warning: "bg-warning-badge text-warning",
        success: "bg-success-badge text-success",
        danger: "bg-danger-badge text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

/** The badge's look, for a control that must read as one (a status that opens a menu). */
export { badgeVariants };

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
