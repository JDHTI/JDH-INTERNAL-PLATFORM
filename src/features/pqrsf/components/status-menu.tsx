"use client";

import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useChangeStatus } from "../hooks/use-pqrsf";
import { requiresResolution } from "../lib/resolution";
import type { PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";
import { StatusBadge } from "./case-badges";

/**
 * The status badge is where the status changes: it opens the active statuses
 * with the current one checked. A plain move saves at once; reopening a
 * closed case needs the reason, finalizing a complaint or a claim needs its
 * result, and «Cambiar con nota» leaves a note on any change, so all of them
 * go through the status dialog (`onNeedsDialog`). Without
 * permission to work the case, the badge is just a badge.
 */
export function StatusMenu({
  item,
  catalog,
  onNeedsDialog,
  className,
}: {
  item: PqrsfCase;
  catalog: TrackingCatalog;
  /** Opens the status dialog, with the chosen status when there is one. */
  onNeedsDialog: (statusId?: string) => void;
  className?: string;
}) {
  const mutation = useChangeStatus(item.id);

  if (!item.permissions.can_work) return <StatusBadge status={item.status} />;

  const statuses = catalog.statuses.filter((status) => status.is_active);
  const change = (statusId: string) => {
    const target = statuses.find((status) => status.id === statusId);
    if (!target) return;
    if (item.closed_at && !target.is_terminal) return onNeedsDialog(statusId);
    // A complaint or a claim says how it ended when it is finalized: that is asked in the dialog.
    if (target.is_terminal && requiresResolution(item)) return onNeedsDialog(statusId);
    mutation.mutate(
      { status_id: statusId },
      {
        onSuccess: (updated) => toast.success(`${updated.code} quedó en «${updated.status.name}».`),
        // Closing with pending documents is refused by the API; its reason
        // says what to fix, so it stays until dismissed.
        onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
      }
    );
  };

  return (
    <Menu
      disabled={mutation.isPending}
      triggerLabel={`Estado de ${item.code}: ${item.status.name}, cambiar`}
      // The chip itself is the control: a ring on hover and focus says it
      // opens, without an arrow next to every status in the table.
      triggerClassName={cn(
        "inline-flex max-w-full items-center gap-1 rounded-sm text-left max-md:min-h-11",
        "transition-shadow duration-150 hover:ring-2 hover:ring-border-control data-[popup-open]:ring-2 data-[popup-open]:ring-border-control",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
      trigger={
        <>
          <StatusBadge status={item.status} />
          {mutation.isPending && (
            <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          )}
        </>
      }
    >
      <MenuLabel>{item.closed_at ? "Reabrir o cambiar estado" : "Cambiar estado"}</MenuLabel>
      <MenuRadioGroup label="Estado" value={item.status.id} onValueChange={change}>
        {statuses.map((status) => (
          <MenuRadioItem key={status.id} value={status.id}>
            {status.name}
            {status.is_terminal && (
              <span className="text-[13px] text-text-secondary">(cierra el caso)</span>
            )}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem onClick={() => onNeedsDialog()}>
        <MessageSquarePlus aria-hidden="true" />
        Cambiar con nota…
      </MenuItem>
    </Menu>
  );
}
