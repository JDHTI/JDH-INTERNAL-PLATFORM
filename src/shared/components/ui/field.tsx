import * as React from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Label above the control, 13px/500 (DESIGN.md §7.2). What is optional says
 * so; what is required carries no mark, because almost everything is.
 */
export function Field({
  label,
  htmlFor,
  optional = false,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium">
        {label}
        {optional && (
          <span className="font-normal text-text-secondary"> (opcional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-[13px] text-text-secondary">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full min-w-0 rounded-md border border-border-control bg-transparent px-2.5 py-2",
        "text-sm text-text-primary placeholder:text-text-secondary",
        "transition-colors duration-150 outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  );
}
