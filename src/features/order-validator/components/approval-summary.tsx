import { Button } from "@/shared/components/ui/button";

import { formatDateTime } from "../lib/format";
import type { ValidationOrder } from "../types/order-validator.types";

/**
 * Who released an order, when and why, above its lines, with the way to take
 * it back. Orders nobody released show nothing: releasing is done from the
 * selection, not from here.
 */
export default function ApprovalSummary({
  order,
  canManage,
  onRevoke,
}: {
  order: ValidationOrder;
  canManage: boolean;
  onRevoke: () => void;
}) {
  const approval = order.manual_approval;
  if (!approval) return null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p>
          Liberado por <span className="font-medium">{approval.approved_by}</span> el {formatDateTime(approval.approved_at)}
        </p>
        {approval.note && <p className="max-w-prose text-text-secondary">{approval.note}</p>}
      </div>
      {canManage && (
        <Button variant="outline" size="sm" onClick={onRevoke}>
          Quitar liberación
        </Button>
      )}
    </div>
  );
}
