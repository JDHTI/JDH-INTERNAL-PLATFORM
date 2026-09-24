"use client";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";

/**
 * Deletion is the one place solid red is allowed (DESIGN.md §7.1). `blocked`
 * replaces the confirm button with an explanation when the delete cannot
 * happen, e.g. a folder that still holds documents.
 */
export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  isPending,
  error,
  blocked = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
  blocked?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={children}>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {blocked ? "Entendido" : "Cancelar"}
        </Button>
        {!blocked && (
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-danger text-text-on-primary hover:bg-danger/90"
          >
            {confirmLabel}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
