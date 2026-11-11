"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Modal per docs/DESIGN.md §7.4, on Base UI for the focus trap, Escape and
 * focus return. A form modal passes `isForm`: it never closes on an outside
 * click, because losing a half-filled form to a stray click is unacceptable.
 * Confirmations may.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  isForm = false,
  wide = false,
  narrow = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  isForm?: boolean;
  /** For content that needs room, such as a file preview. */
  wide?: boolean;
  /** A form with little in it (one file, a few counts): confirmation width, form behavior. */
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      disablePointerDismissal={isForm}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-backdrop transition-opacity duration-300",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
          )}
        />
        <BaseDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "rounded-xl border border-border bg-surface p-6 text-text-primary shadow-modal",
            "transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "data-[ending-style]:opacity-0 data-[starting-style]:translate-y-[calc(-50%+8px)] data-[starting-style]:opacity-0",
            "outline-none",
            wide ? "max-w-4xl" : isForm && !narrow ? "max-w-2xl" : "max-w-md"
          )}
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <BaseDialog.Title className="text-xl font-semibold tracking-tight">
                {title}
              </BaseDialog.Title>
              {description && (
                <BaseDialog.Description className="text-sm text-text-secondary">
                  {description}
                </BaseDialog.Description>
              )}
            </div>
            <BaseDialog.Close
              aria-label="Cerrar"
              className={cn(
                "-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary",
                "transition-colors duration-150 hover:bg-canvas-subtle hover:text-text-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              )}
            >
              <X className="size-4" aria-hidden="true" />
            </BaseDialog.Close>
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/**
 * Right-aligned on desktop: cancel, then confirm. Stacked in reverse on
 * mobile so the main action sits at the bottom, under the thumb.
 */
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

/** Server `detail` shown inside the dialog that caused it. */
export function DialogError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-4 rounded-md bg-danger-surface px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}
