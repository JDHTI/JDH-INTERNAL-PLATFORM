import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

/**
 * Button grammar per docs/DESIGN.md §7.1.
 *
 * `danger` uses a tinted surface rather than solid red: a solid red button
 * sitting in a table shouts before the user has done anything wrong. Solid
 * danger is reserved for the confirm action inside a delete dialog.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent " +
    "font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
    "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-text-on-primary hover:bg-primary-hover",
        secondary:
          "bg-canvas-subtle text-text-primary hover:bg-primary-subtle",
        outline:
          "border-border-control bg-transparent text-text-primary hover:bg-canvas-subtle",
        ghost:
          "text-text-secondary hover:bg-canvas-subtle hover:text-text-primary",
        danger: "bg-danger-surface text-danger hover:bg-danger-surface",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        default: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
