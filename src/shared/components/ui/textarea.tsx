import * as React from "react";

import { cn } from "@/shared/lib/utils";

/** Multi-line twin of Input: same border, focus ring and invalid state. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 rounded-md border border-border-control bg-transparent px-2.5 py-2",
        "text-sm text-text-primary placeholder:text-text-secondary",
        "transition-colors duration-150 outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
